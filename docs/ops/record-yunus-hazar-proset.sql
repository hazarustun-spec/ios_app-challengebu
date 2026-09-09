-- Record the Pro Set 8 match Yunus Emre won 8-4 against Hazar.
--
-- WHY THIS IS SQL AND NOT THE APP
--
-- The match was played on the build whose score screen mirrored the two
-- players' perspectives (see migration 20260909000001), so the two submissions
-- could never agree and the match could not settle. The fix ships in the next
-- native build; this records the result now.
--
-- WHY IT DOES NOT TOUCH elo_ratings
--
-- ELO is applied by the `confirm-match` Edge Function through
-- `_shared/apply-elo.ts` — K-factor, margin multiplier, per-category seeding,
-- history rows. Reproducing that arithmetic in SQL would be a second
-- implementation that silently drifts from the first.
--
-- So this inserts the match as **awaiting_confirmation** with the agreed score
-- already on it. Both players then open the match in the app and press
-- "Sonucu Onayla" — one tap each — and the real code applies the rating change.
-- That also means neither player has a result imposed on them without seeing it.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste the WHOLE file → Run.
--   Players are identified by LOGIN E-MAIL — see the constants at the top of
--   the DO block.
-- If either player cannot be identified unambiguously it raises and writes
-- nothing. The SELECT at the bottom then shows what was recorded — the
-- Dashboard's editor does not surface `raise notice`, so the result set is the
-- only confirmation you actually get to see.

-- ── EDIT THESE TWO IF YOU RUN IT FOR A DIFFERENT MATCH ─────────────────────
--   Identify by LOGIN E-MAIL, not by name. The first attempt matched on
--   first_name like 'yunus%' and would have found nobody: Yunus Emre's profile
--   reads first_name "Emre", last_name "Y". A display name is whatever someone
--   typed during onboarding; the login address is the thing the account is.
do $$
declare
  -- Winner (team A, 8 games).
  c_winner_email constant text := 'emre.yuksel@std.bogazici.edu.tr';
  -- Loser (team B, 4 games). Left as a pattern because the operator's own
  -- address is not in front of me; the guard below refuses anything ambiguous.
  c_loser_pattern constant text := 'hazar%';

  v_yunus uuid;
  v_hazar uuid;
  v_yunus_gender text;
  v_hazar_gender text;
  v_category text;
  v_court uuid;
  v_match uuid;
  v_count int;
begin
  -- ── Identify the players ──────────────────────────────────────────────────
  -- Read through auth.users, which is where the login address actually lives.
  -- profiles.email is only written on the signup INSERT and RLS revokes UPDATE
  -- on it, so it can be stale or blank on an account that was ever repaired by
  -- hand — that exact mismatch silently matched 0 rows once already.
  select count(*) into v_count
    from public.profiles p
    join auth.users u on u.id = p.user_id
   where lower(u.email) = lower(c_winner_email) and p.status = 'active';
  if v_count <> 1 then
    raise exception 'Expected exactly 1 active player with e-mail %, found %',
      c_winner_email, v_count;
  end if;
  select p.user_id, p.gender_category into v_yunus, v_yunus_gender
    from public.profiles p
    join auth.users u on u.id = p.user_id
   where lower(u.email) = lower(c_winner_email) and p.status = 'active';

  -- The loser is matched on e-mail OR first name, so a pattern like 'hazar%'
  -- finds the account whichever of the two it happens to sit in.
  select count(*) into v_count
    from public.profiles p
    join auth.users u on u.id = p.user_id
   where (lower(u.email) like lower(c_loser_pattern)
          or lower(p.first_name) like lower(c_loser_pattern))
     and p.status = 'active';
  if v_count <> 1 then
    raise exception
      'Expected exactly 1 active player matching %, found % — narrow it to an exact e-mail',
      c_loser_pattern, v_count;
  end if;
  select p.user_id, p.gender_category into v_hazar, v_hazar_gender
    from public.profiles p
    join auth.users u on u.id = p.user_id
   where (lower(u.email) like lower(c_loser_pattern)
          or lower(p.first_name) like lower(c_loser_pattern))
     and p.status = 'active';

  if v_yunus = v_hazar then
    raise exception 'Both identifiers matched the same account (%)', v_yunus;
  end if;

  -- ── Category has to be one both players are actually rated in ─────────────
  -- A player only holds an elo_ratings row for the categories their gender
  -- seeds (20260805000002), and applying a result in a category somebody is not
  -- seeded in would create a rating out of thin air.
  if v_yunus_gender = 'erkek' and v_hazar_gender = 'erkek' then
    v_category := 'erkek_tek';
  elsif v_yunus_gender = 'kadin' and v_hazar_gender = 'kadin' then
    v_category := 'kadin_tek';
  else
    v_category := 'open_tek';  -- every gender category is seeded for open
  end if;

  select id into v_court from public.courts order by created_at limit 1;
  if v_court is null then
    raise exception 'No court on record';
  end if;

  raise notice 'Yunus=% (%), Hazar=% (%), category=%, court=%',
    v_yunus, v_yunus_gender, v_hazar, v_hazar_gender, v_category, v_court;

  -- ── Don't record it twice ─────────────────────────────────────────────────
  select count(*) into v_count
    from public.matches
   where format = 'pro_set_8'
     and team_a_player_ids @> array[v_yunus] and team_b_player_ids @> array[v_hazar]
     and score_team_a = 8 and score_team_b = 4
     and status in ('awaiting_confirmation','confirmed');
  if v_count > 0 then
    raise exception 'This match is already on record (% row(s)) — nothing written', v_count;
  end if;

  -- ── The match ─────────────────────────────────────────────────────────────
  -- Team A is Yunus (the winner, 8), team B is Hazar (4). `confirmed_by` starts
  -- empty on purpose: both players confirm in the app, and confirm-match applies
  -- the ELO when the second one does.
  insert into public.matches (
    category, format, court_id, played_at, is_rated,
    team_a_player_ids, team_b_player_ids,
    score_team_a, score_team_b, winner_team,
    status, confirmed_by
  ) values (
    v_category::match_category, 'pro_set_8'::match_format, v_court, now(), true,
    array[v_yunus], array[v_hazar],
    8, 4, 'a'::winner_team,
    'awaiting_confirmation'::match_status, array[]::uuid[]
  )
  returning id into v_match;

  -- Both submissions, so the match history reads as an agreed result rather
  -- than a score that appeared with nobody behind it.
  -- score_details is one jsonb blob, shaped exactly as submit-match-score
  -- writes it (functions/submit-match-score/index.ts): the admin dispute screen
  -- renders this field raw, so a different shape would show up as gibberish.
  insert into public.match_score_submissions (match_id, submitted_by, score_details)
  values
    (v_match, v_yunus,
     jsonb_build_object('scoreTeamA', 8, 'scoreTeamB', 4, 'winnerTeam', 'a')),
    (v_match, v_hazar,
     jsonb_build_object('scoreTeamA', 8, 'scoreTeamB', 4, 'winnerTeam', 'a'));

  raise notice 'Recorded match % — both players must now press "Sonucu Onayla" in the app for ELO to apply.', v_match;
end $$;

-- ── What was recorded ───────────────────────────────────────────────────────
-- Read this back before telling anyone the match is in. The rating_after_*
-- columns stay NULL until BOTH players press "Sonucu Onayla" in the app —
-- that is expected here, not a failure: confirm-match is what applies ELO.
select
  m.id                       as match_id,
  m.status,
  m.category,
  m.format,
  pa.first_name || ' ' || pa.last_name || ' (' || m.score_team_a || ')' as team_a,
  pb.first_name || ' ' || pb.last_name || ' (' || m.score_team_b || ')' as team_b,
  m.winner_team,
  cardinality(m.confirmed_by) as confirmations,
  m.rating_after_team_a,
  m.rating_after_team_b,
  m.played_at
from public.matches m
join public.profiles pa on pa.user_id = m.team_a_player_ids[1]
join public.profiles pb on pb.user_id = m.team_b_player_ids[1]
where m.format = 'pro_set_8'
  and m.score_team_a = 8 and m.score_team_b = 4
order by m.created_at desc
limit 5;
