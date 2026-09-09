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
--   Supabase Dashboard → SQL Editor → paste → Run.
-- It prints what it matched before it writes, and rolls itself back if the two
-- players cannot be identified unambiguously.

do $$
declare
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
  -- Matched on first name, case- and accent-insensitively enough for these two.
  -- The count checks below are the point: recording a rated match against the
  -- wrong person is not something you notice until their ladder position moves.
  select count(*) into v_count from public.profiles
   where lower(first_name) like 'yunus%' and status = 'active';
  if v_count <> 1 then
    raise exception 'Expected exactly 1 active player whose first name starts with "Yunus", found %', v_count;
  end if;
  select user_id, gender_category into v_yunus, v_yunus_gender
    from public.profiles
   where lower(first_name) like 'yunus%' and status = 'active';

  select count(*) into v_count from public.profiles
   where lower(first_name) like 'hazar%' and status = 'active';
  if v_count <> 1 then
    raise exception 'Expected exactly 1 active player whose first name starts with "Hazar", found %', v_count;
  end if;
  select user_id, gender_category into v_hazar, v_hazar_gender
    from public.profiles
   where lower(first_name) like 'hazar%' and status = 'active';

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
