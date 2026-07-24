-- =============================================================================
-- App Store review seed — PRODUCTION (project zbjkauljjdosyuwguuhv)
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (runs as `postgres`, bypasses RLS).
--
-- Goal: the reviewer must NOT see an empty app (Guideline 2.1 App Completeness).
-- After this script the review account lands on a POPULATED, fully functional app:
--   • A ranked leaderboard with 9 players (reviewer + 8 seeded opponents)
--   • The reviewer's profile shows real ELO history + stats (3 completed matches)
--   • A pool of opponents to challenge (PlayerPicker is populated)
--   • ONE match already "ready to start" (played_at in the past → the 15-min
--     anti-fake start/score gates pass, so the reviewer can demo the live
--     start → score flow with zero extra setup)
--   • ONE incoming pending challenge to explore the accept flow
--
-- Idempotent: every row uses a FIXED uuid + ON CONFLICT, so re-running is safe.
-- Prerequisite: appreview42@proton.me must already exist in auth.users
--   (sign in once via the app with OTP 424242 / review-login first).
--
-- To REMOVE all seeded demo data after approval, run the companion script:
--   scripts/cleanup-review-seed-production.sql
-- =============================================================================

do $$
declare
  v_rev   uuid;   -- reviewer auth.users id
  v_court uuid;   -- any active court
  -- Fixed opponent ids (aaaa000N). Deterministic → idempotent + easy cleanup.
  o1 uuid := 'aaaa0001-0000-4000-8000-000000000001';
  o2 uuid := 'aaaa0002-0000-4000-8000-000000000002';
  o3 uuid := 'aaaa0003-0000-4000-8000-000000000003';
  o4 uuid := 'aaaa0004-0000-4000-8000-000000000004';
  o5 uuid := 'aaaa0005-0000-4000-8000-000000000005';
  o6 uuid := 'aaaa0006-0000-4000-8000-000000000006';
  o7 uuid := 'aaaa0007-0000-4000-8000-000000000007';
  o8 uuid := 'aaaa0008-0000-4000-8000-000000000008';
begin
  -- ---------------------------------------------------------------------------
  -- 0. Resolve reviewer + a court
  -- ---------------------------------------------------------------------------
  select id into v_rev from auth.users
   where lower(email) = 'appreview42@proton.me' limit 1;
  if v_rev is null then
    raise exception 'auth.users row missing for appreview42@proton.me — sign in once in the app first';
  end if;

  select id into v_court from public.courts where is_active order by display_order limit 1;
  if v_court is null then
    raise exception 'No active court found — seed courts first';
  end if;

  -- ---------------------------------------------------------------------------
  -- 1. Reviewer profile (self-sufficient upsert; supersedes the old script)
  --    gender_category 'open_only' → trigger auto-seeds open_tek + open_cift elo.
  -- ---------------------------------------------------------------------------
  insert into public.profiles (
    user_id, role, first_name, last_name, email,
    pronoun, gender_category, class_year,
    show_department, show_class_year,
    skill_self_assessment, dominant_hand, availability_windows,
    status, kvkk_accepted_at
  ) values (
    v_rev, 'player', 'App', 'Review', 'appreview42@proton.me',
    'they/them', 'open_only', '3',
    true, true,
    'orta', 'sag', array['weekday_evening','weekend_morning'],
    'active', now()
  )
  on conflict (user_id) do update set
    first_name = excluded.first_name,
    last_name  = excluded.last_name,
    gender_category = excluded.gender_category,
    class_year = excluded.class_year,
    skill_self_assessment = excluded.skill_self_assessment,
    dominant_hand = excluded.dominant_hand,
    availability_windows = excluded.availability_windows,
    status = 'active',
    kvkk_accepted_at = coalesce(public.profiles.kvkk_accepted_at, now());

  -- ---------------------------------------------------------------------------
  -- 2. Seeded opponents — auth.users first (profiles.user_id FK → auth.users).
  --    These accounts never authenticate (encrypted_password NULL). Minimal,
  --    version-robust column set; token columns set to '' for older GoTrue.
  -- ---------------------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000', x.id, 'authenticated', 'authenticated', x.email,
    now(), now(), now(),
    '{"provider":"seed","providers":["seed"]}'::jsonb, '{}'::jsonb,
    '', '', '', ''
  from (values
    (o1, 'seed-opp-01@challengebu-review.invalid'),
    (o2, 'seed-opp-02@challengebu-review.invalid'),
    (o3, 'seed-opp-03@challengebu-review.invalid'),
    (o4, 'seed-opp-04@challengebu-review.invalid'),
    (o5, 'seed-opp-05@challengebu-review.invalid'),
    (o6, 'seed-opp-06@challengebu-review.invalid'),
    (o7, 'seed-opp-07@challengebu-review.invalid'),
    (o8, 'seed-opp-08@challengebu-review.invalid')
  ) as x(id, email)
  on conflict (id) do nothing;

  -- Opponent profiles. gender_category drives which elo categories the trigger
  -- auto-creates (open_tek for everyone; erkek_tek for erkek; kadin_tek for kadin).
  insert into public.profiles (
    user_id, role, first_name, last_name, email,
    pronoun, gender_category, class_year,
    show_department, show_class_year,
    skill_self_assessment, dominant_hand, availability_windows,
    status, kvkk_accepted_at
  ) values
    (o1, 'player', 'Deniz',  'Arslan',  'seed-opp-01@challengebu-review.invalid', 'he/him',    'erkek',     '2',  true, true, 'ileri',     'sag', array['weekday_evening'], 'active', now()),
    (o2, 'player', 'Emre',   'Kaya',    'seed-opp-02@challengebu-review.invalid', 'he/him',    'erkek',     '3',  true, true, 'orta',      'sag', array['weekend_morning'], 'active', now()),
    (o3, 'player', 'Can',    'Yildiz',  'seed-opp-03@challengebu-review.invalid', 'he/him',    'erkek',     '4',  true, true, 'ileri',     'sol', array['weekday_evening','weekend_afternoon'], 'active', now()),
    (o4, 'player', 'Mert',   'Demir',   'seed-opp-04@challengebu-review.invalid', 'he/him',    'erkek',     '1',  true, true, 'orta',      'sag', array['weekend_morning'], 'active', now()),
    (o5, 'player', 'Zeynep', 'Sahin',   'seed-opp-05@challengebu-review.invalid', 'she/her',   'kadin',     '2',  true, true, 'ileri',     'sag', array['weekday_evening'], 'active', now()),
    (o6, 'player', 'Elif',   'Aydin',   'seed-opp-06@challengebu-review.invalid', 'she/her',   'kadin',     '3',  true, true, 'orta',      'sol', array['weekend_afternoon'], 'active', now()),
    (o7, 'player', 'Asli',   'Celik',   'seed-opp-07@challengebu-review.invalid', 'they/them', 'open_only', '4',  true, true, 'orta',      'sag', array['weekend_morning'], 'active', now()),
    (o8, 'player', 'Kerem',  'Ozturk',  'seed-opp-08@challengebu-review.invalid', 'they/them', 'open_only', 'yl', true, true, 'baslangic', 'sag', array['weekday_evening'], 'active', now())
  on conflict (user_id) do update set
    first_name = excluded.first_name,
    last_name  = excluded.last_name,
    status     = 'active';

  -- ---------------------------------------------------------------------------
  -- 3. Ratings — give the leaderboard realistic, varied standings.
  --    elo_ratings rows already exist (AFTER INSERT trigger). We UPDATE them.
  --    open_tek exists for everyone → the open_tek ladder is fully populated.
  -- ---------------------------------------------------------------------------
  update public.elo_ratings set rating = 1462, matches_played = 21 where profile_id = o3   and category = 'open_tek';
  update public.elo_ratings set rating = 1388, matches_played = 15 where profile_id = o1   and category = 'open_tek';
  update public.elo_ratings set rating = 1341, matches_played = 12 where profile_id = o5   and category = 'open_tek';
  update public.elo_ratings set rating = 1290, matches_played = 9  where profile_id = o2   and category = 'open_tek';
  update public.elo_ratings set rating = 1248, matches_played = 3  where profile_id = v_rev and category = 'open_tek';
  update public.elo_ratings set rating = 1224, matches_played = 7  where profile_id = o7   and category = 'open_tek';
  update public.elo_ratings set rating = 1186, matches_played = 6  where profile_id = o6   and category = 'open_tek';
  update public.elo_ratings set rating = 1150, matches_played = 4  where profile_id = o4   and category = 'open_tek';
  update public.elo_ratings set rating = 1132, matches_played = 5  where profile_id = o8   and category = 'open_tek';

  -- Gendered ladders (rows exist via trigger for matching gender_category).
  update public.elo_ratings set rating = 1455, matches_played = 18 where profile_id = o3 and category = 'erkek_tek';
  update public.elo_ratings set rating = 1372, matches_played = 13 where profile_id = o1 and category = 'erkek_tek';
  update public.elo_ratings set rating = 1281, matches_played = 8  where profile_id = o2 and category = 'erkek_tek';
  update public.elo_ratings set rating = 1163, matches_played = 4  where profile_id = o4 and category = 'erkek_tek';
  update public.elo_ratings set rating = 1349, matches_played = 11 where profile_id = o5 and category = 'kadin_tek';
  update public.elo_ratings set rating = 1204, matches_played = 5  where profile_id = o6 and category = 'kadin_tek';

  -- ---------------------------------------------------------------------------
  -- 4. Completed (confirmed) matches — past, ELO fields hand-set (no trigger
  --    computes them). Fixed ids (bbbb000N) → idempotent. status 'confirmed',
  --    winner_team set, confirmed_by = both players. These populate activity
  --    feeds and the reviewer's profile history/stats.
  -- ---------------------------------------------------------------------------
  insert into public.matches (
    id, category, format, court_id, played_at, is_rated, kind,
    team_a_player_ids, team_b_player_ids,
    score_team_a, score_team_b, winner_team, status,
    started_by, confirmed_by, confirmed_at,
    rating_before_team_a, rating_after_team_a,
    rating_before_team_b, rating_after_team_b
  ) values
    -- reviewer WON vs o4
    ('bbbb0001-0000-4000-8000-000000000001', 'open_tek', 'bu_klasik', v_court, now() - interval '9 days',  true, 'ranking',
     array[v_rev]::uuid[], array[o4]::uuid[], 4, 1, 'a', 'confirmed',
     array[v_rev,o4]::uuid[], array[v_rev,o4]::uuid[], now() - interval '9 days' + interval '1 hour',
     1220, 1240, 1170, 1150),
    -- reviewer LOST vs o1
    ('bbbb0002-0000-4000-8000-000000000002', 'open_tek', 'hizli_tiebreak', v_court, now() - interval '6 days', true, 'ranking',
     array[v_rev]::uuid[], array[o1]::uuid[], 8, 10, 'b', 'confirmed',
     array[v_rev,o1]::uuid[], array[v_rev,o1]::uuid[], now() - interval '6 days' + interval '1 hour',
     1240, 1224, 1372, 1388),
    -- reviewer WON vs o6
    ('bbbb0003-0000-4000-8000-000000000003', 'open_tek', 'bu_klasik', v_court, now() - interval '3 days', true, 'ranking',
     array[v_rev]::uuid[], array[o6]::uuid[], 4, 2, 'a', 'confirmed',
     array[v_rev,o6]::uuid[], array[v_rev,o6]::uuid[], now() - interval '3 days' + interval '1 hour',
     1224, 1248, 1200, 1186),
    -- opponents vs opponents (activity depth)
    ('bbbb0004-0000-4000-8000-000000000004', 'open_tek', 'pro_set_8', v_court, now() - interval '8 days', true, 'ranking',
     array[o3]::uuid[], array[o2]::uuid[], 8, 5, 'a', 'confirmed',
     array[o3,o2]::uuid[], array[o3,o2]::uuid[], now() - interval '8 days' + interval '1 hour',
     1440, 1462, 1300, 1290),
    ('bbbb0005-0000-4000-8000-000000000005', 'erkek_tek', 'bu_klasik', v_court, now() - interval '5 days', true, 'ranking',
     array[o1]::uuid[], array[o4]::uuid[], 4, 0, 'a', 'confirmed',
     array[o1,o4]::uuid[], array[o1,o4]::uuid[], now() - interval '5 days' + interval '1 hour',
     1360, 1372, 1175, 1163),
    ('bbbb0006-0000-4000-8000-000000000006', 'kadin_tek', '3set_klasik', v_court, now() - interval '4 days', true, 'ranking',
     array[o5]::uuid[], array[o6]::uuid[], 2, 1, 'a', 'confirmed',
     array[o5,o6]::uuid[], array[o5,o6]::uuid[], now() - interval '4 days' + interval '1 hour',
     1335, 1349, 1218, 1204)
  on conflict (id) do nothing;

  -- ---------------------------------------------------------------------------
  -- 5. ONE match "ready to start" for the reviewer (cccc0001).
  --    played_at 90 min in the PAST → now() >= played_at - 15min, so both the
  --    start gate (start_match) and the score gate (submit-match-score) pass.
  --    started_by pre-filled with the opponent → reviewer taps "Maçı Başlat"
  --    once to complete the handshake, then enters the score. winner_team NULL
  --    so the card renders "Maçı Başlat" (see apps/mobile matches list logic).
  -- ---------------------------------------------------------------------------
  insert into public.matches (
    id, category, format, court_id, played_at, is_rated, kind,
    team_a_player_ids, team_b_player_ids,
    score_team_a, score_team_b, winner_team, status, started_by
  ) values (
    'cccc0001-0000-4000-8000-000000000001', 'open_tek', 'bu_klasik', v_court,
    now() - interval '90 minutes', true, 'ranking',
    array[v_rev]::uuid[], array[o2]::uuid[],
    0, 0, null, 'awaiting_confirmation', array[o2]::uuid[]
  )
  on conflict (id) do nothing;

  -- ---------------------------------------------------------------------------
  -- 6. ONE incoming pending challenge to the reviewer (dddd0001) — lets the
  --    reviewer exercise the accept flow. Generous expiry so cron won't expire
  --    it before review.
  -- ---------------------------------------------------------------------------
  insert into public.match_requests (
    id, creator_id, type, target_id, category, format, is_rated,
    proposed_date, proposed_time, court_id, status, expires_at
  ) values (
    'dddd0001-0000-4000-8000-000000000001', o5, 'direct_challenge', v_rev,
    'open_tek', 'hizli_tiebreak', true,
    current_date, (now() - interval '20 minutes')::time, v_court,
    'pending', now() + interval '30 days'
  )
  on conflict (id) do nothing;

  raise notice 'Review seed complete: reviewer=% + 8 opponents, ladder + history + 1 startable match + 1 pending challenge', v_rev;
end $$;

-- Verify -----------------------------------------------------------------------
select 'ladder_open_tek' as check, count(*)::text as rows
  from public.elo_ratings where category = 'open_tek' and rating > 0
union all
select 'seeded_profiles', count(*)::text from public.profiles
  where email like 'seed-opp-%@challengebu-review.invalid'
union all
select 'confirmed_matches', count(*)::text from public.matches
  where id::text like 'bbbb%'
union all
select 'ready_match', count(*)::text from public.matches where id::text like 'cccc%'
union all
select 'pending_challenge', count(*)::text from public.match_requests where id::text like 'dddd%';
