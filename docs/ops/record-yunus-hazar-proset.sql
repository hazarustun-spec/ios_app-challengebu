-- Record the Pro Set 8 match Yunus Emre won 8-4 against Hazar, ELO included.
--
-- WHY THIS EXISTS
--
-- The match was played on the build whose score screen mirrored the two
-- players' perspectives (migration 20260909000001), so their two submissions
-- could never agree and the match could not settle. This records the result
-- outright - no "Sonucu Onayla" tap from either player.
--
-- WHY IT CALLS AN EDGE FUNCTION INSTEAD OF WRITING elo_ratings
--
-- ELO is not one number. `_shared/apply-elo.ts` applies a K-factor that depends
-- on how many matches each player has, a margin multiplier that depends on the
-- format, per-category ratings, and it writes rating history rows. Reproducing
-- that in SQL would be a second implementation of the same rule, and the drift
-- between them would surface as somebody's ladder position being quietly wrong.
--
-- So this does what the push trigger already does (20260625000001): reads a
-- key out of vault and POSTs to an Edge Function through pg_net.
-- `admin-record-match` inserts the match as confirmed and calls the SAME
-- `applyEloForMatch` that confirm-match calls.
--
-- About that key: the vault entry is NAMED `service_role_key`, but its value is
-- INTERNAL_PUSH_KEY (see 20260626000004), not the real service role key. The
-- first run of this script wrote nothing because of it: the API gateway
-- rejected the call as "Invalid JWT" (INTERNAL_PUSH_KEY is not a JWT and the
-- function had been deployed with JWT verification on), and behind that the
-- function compared the Bearer to the wrong key anyway. Both were fixed on the
-- function side; this script did not need to change.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> paste the WHOLE file -> Run.
--   Both players are identified by their exact LOGIN E-MAIL - see the
--   constants below. Nothing is written unless each resolves to exactly one
--   active account.
--   The script waits for the function's reply, prints it, then prints the
--   recorded match with the ratings it moved.

-- -- EDIT THESE IF YOU RUN IT FOR A DIFFERENT MATCH -------------------------
--   Identify by LOGIN E-MAIL, not by name. The first version of this script
--   matched `first_name like 'yunus%'` and would have found nobody: Yunus
--   Emre's profile reads first_name "Emre", last_name "Y". A display name is
--   whatever someone typed during onboarding; the login address is what the
--   account actually is - and an exact address cannot match two people, which
--   a name pattern can.
-- Created before the DO block on purpose: a `raise` inside the block rolls the
-- whole block back, CREATE TEMP TABLE included, and the SELECT at the bottom
-- would then fail with "relation _record_match_req does not exist" - burying
-- the actual reason the script stopped.
create temp table if not exists _record_match_req (request_id bigint);
delete from _record_match_req;

do $$
declare
  -- Winner (team A, 8 games).
  c_winner_email  constant text := 'emre.yuksel@std.bogazici.edu.tr';
  -- Loser (team B, 4 games).
  c_loser_email   constant text := 'hazar.ustun@std.bogazici.edu.tr';
  c_score_winner  constant int  := 8;
  c_score_loser   constant int  := 4;
  c_format        constant text := 'pro_set_8';

  v_winner uuid;
  v_loser uuid;
  v_winner_gender text;
  v_loser_gender text;
  v_category text;
  v_court uuid;
  v_url text;
  v_key text;
  v_request bigint;
  v_count int;
begin
  -- -- Identify the players --------------------------------------------------
  -- Read through auth.users, which is where the login address actually lives.
  -- profiles.email is only written on the signup INSERT and RLS revokes UPDATE
  -- on it, so it can be stale on any account ever repaired by hand - matching
  -- on it silently touched 0 rows once already.
  select count(*) into v_count
    from public.profiles p join auth.users u on u.id = p.user_id
   where lower(u.email) = lower(c_winner_email) and p.status = 'active';
  if v_count <> 1 then
    raise exception 'Expected exactly 1 active player with e-mail %, found %',
      c_winner_email, v_count;
  end if;
  select p.user_id, p.gender_category into v_winner, v_winner_gender
    from public.profiles p join auth.users u on u.id = p.user_id
   where lower(u.email) = lower(c_winner_email) and p.status = 'active';

  select count(*) into v_count
    from public.profiles p join auth.users u on u.id = p.user_id
   where lower(u.email) = lower(c_loser_email) and p.status = 'active';
  if v_count <> 1 then
    raise exception 'Expected exactly 1 active player with e-mail %, found %',
      c_loser_email, v_count;
  end if;
  select p.user_id, p.gender_category into v_loser, v_loser_gender
    from public.profiles p join auth.users u on u.id = p.user_id
   where lower(u.email) = lower(c_loser_email) and p.status = 'active';

  if v_winner = v_loser then
    raise exception 'Both identifiers matched the same account (%)', v_winner;
  end if;

  -- -- Category has to be one both players are actually rated in -------------
  -- A player only holds an elo_ratings row for the categories their gender
  -- seeds (20260805000002); applying a result in a category somebody is not
  -- seeded in would create a rating out of thin air.
  if v_winner_gender = 'erkek' and v_loser_gender = 'erkek' then
    v_category := 'erkek_tek';
  elsif v_winner_gender = 'kadin' and v_loser_gender = 'kadin' then
    v_category := 'kadin_tek';
  else
    v_category := 'open_tek';  -- every gender category is seeded for open
  end if;

  select id into v_court from public.courts order by created_at limit 1;
  if v_court is null then
    raise exception 'No court on record';
  end if;

  -- -- Don't record it twice -------------------------------------------------
  select count(*) into v_count
    from public.matches
   where format = c_format::match_format
     and team_a_player_ids @> array[v_winner] and team_b_player_ids @> array[v_loser]
     and score_team_a = c_score_winner and score_team_b = c_score_loser
     and status in ('awaiting_confirmation','confirmed');
  if v_count > 0 then
    raise exception 'This match is already on record (% row(s)) - nothing written', v_count;
  end if;

  -- -- Call admin-record-match -----------------------------------------------
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'edge_functions_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  if v_url is null or v_key is null then
    raise exception
      'vault is missing edge_functions_url or service_role_key - the push trigger needs these too';
  end if;

  select net.http_post(
    url     := v_url || '/admin-record-match',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := jsonb_build_object(
      'teamAPlayerIds', jsonb_build_array(v_winner),
      'teamBPlayerIds', jsonb_build_array(v_loser),
      'category',       v_category,
      'format',         c_format,
      'scoreTeamA',     c_score_winner,
      'scoreTeamB',     c_score_loser,
      'courtId',        v_court,
      'isRated',        true,
      'note',           'Kortta oynandi; skor ekranindaki perspektif hatasi yuzunden uygulamadan girilemedi.'
    )
  ) into v_request;

  -- pg_net is asynchronous: http_post queues the call and the reply lands in
  -- net._http_response later. Park the id so the SELECT below can find it.
  insert into _record_match_req values (v_request);

  raise notice 'winner=% loser=% category=% court=% request=%',
    v_winner, v_loser, v_category, v_court, v_request;
end $$;

-- Give pg_net a moment to actually make the request.
select pg_sleep(4);

-- -- What the function said --------------------------------------------------
-- 200 with a matchId is success. Anything else is the reason it refused, in
-- plain text: 401 means the vault key is wrong, 400 names the bad field.
-- An empty result means pg_net has not answered yet - re-run just this SELECT.
select r.status_code,
       r.content::jsonb as response
from net._http_response r
join _record_match_req q on q.request_id = r.id;

-- -- The recorded match, with the ratings it moved ---------------------------
-- rating_after_* being filled is the proof ELO ran. NULL there means the match
-- was written but applyEloForMatch was not - read the response above.
select
  m.id                                                                 as match_id,
  m.status,
  m.category,
  m.format,
  pa.first_name || ' ' || pa.last_name || ' (' || m.score_team_a || ')' as team_a,
  pb.first_name || ' ' || pb.last_name || ' (' || m.score_team_b || ')' as team_b,
  m.winner_team,
  m.rating_before_team_a, m.rating_after_team_a,
  m.rating_before_team_b, m.rating_after_team_b,
  m.played_at
from public.matches m
join public.profiles pa on pa.user_id = m.team_a_player_ids[1]
join public.profiles pb on pb.user_id = m.team_b_player_ids[1]
where m.format = 'pro_set_8'
  and m.score_team_a = 8 and m.score_team_b = 4
order by m.created_at desc
limit 5;
