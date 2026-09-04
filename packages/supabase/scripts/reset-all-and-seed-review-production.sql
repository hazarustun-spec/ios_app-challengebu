-- ⛔ DO NOT RUN — SUPERSEDED, DESTRUCTIVE AGAINST LIVE DATA (5 Sep 2026)
--
-- This script belongs to the pre-launch era, when production held nothing but
-- the review account and seeded demo opponents. The app is live now and has
-- real players; anything in here that wipes or re-seeds profiles will destroy
-- their accounts, matches and ELO history.
--
-- The review account is permanent infrastructure as of migration
-- 20260905000001_demo_account_visibility.sql: profiles.is_demo hides it from
-- real players via RLS, and review-login calls reset_review_account() on every
-- sign-in. Nothing needs seeding or cleaning up per release any more.
--
-- Kept only as a record of how the pre-launch review data was built.

-- =============================================================================
-- FULL WIPE + fresh 5-opponent review seed — PRODUCTION
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (runs as `postgres`, bypasses RLS).
--
-- Deletes every account, match, message, notification, badge, ELO rating and
-- audit row that isn't the App Store review account, then re-seeds with a
-- clean 5-opponent roster distributed across the correct ladders:
--   • 2 erkek (men's)  → visible in Erkek Tek + Open Tek
--   • 2 kadın (women's)→ visible in Kadın Tek + Open Tek
--   • 1 open           → visible in Open Tek only
--
-- The reviewer (appreview42@proton.me, gender_category 'open_only') stays in
-- Open Tek only, and lands in the onboarding wizard on every review sign-in
-- (reset_review_account() blanks first_name).
--
-- Idempotent: safe to re-run. Every seeded row uses a fixed uuid.
--
-- Prerequisite: appreview42@proton.me must already exist in auth.users
-- (the review-login Edge Function creates it on the first review sign-in).
-- =============================================================================

do $$
declare
  v_rev   uuid;
  v_court uuid;
  o1 uuid := 'aaaa0001-0000-4000-8000-000000000001'; -- erkek
  o2 uuid := 'aaaa0002-0000-4000-8000-000000000002'; -- erkek
  o3 uuid := 'aaaa0003-0000-4000-8000-000000000003'; -- kadın
  o4 uuid := 'aaaa0004-0000-4000-8000-000000000004'; -- kadın
  o5 uuid := 'aaaa0005-0000-4000-8000-000000000005'; -- open
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
  -- 1. WIPE — every user-generated row, everywhere.
  --    Order matters where FKs don't cascade; user-generated data first,
  --    then non-reviewer profiles + auth.users last.
  -- ---------------------------------------------------------------------------
  -- User-side chat + moderation + notification data. Independent of matches.
  delete from public.messages;
  delete from public.conversations;
  delete from public.user_reports;
  delete from public.user_blocks;
  delete from public.disputes;
  delete from public.notifications;
  delete from public.push_tokens;
  -- Match-dependent tables: score submissions FK to matches, so before matches.
  delete from public.match_score_submissions;
  -- Match-request-dependent tables: applications FK to match_requests.
  delete from public.match_request_applications;
  delete from public.open_call_applications;
  -- Tournament rows FK to matches + tournaments; drop them before matches.
  delete from public.tournament_matches;
  delete from public.tournaments;
  -- matches.match_request_id → match_requests(id): matches MUST go before
  -- match_requests, or the FK aborts the wipe (production hit this on the
  -- first run, key aaf9e8c7-… still referenced).
  delete from public.matches;
  delete from public.match_requests;
  -- Season / championship rows FK to profiles + seasons.
  delete from public.season_standings;
  delete from public.season_doubles_teams;
  delete from public.yearly_championship;
  -- Badges + audit.
  delete from public.user_badges;
  delete from public.audit_log;

  -- Non-reviewer ELO rows: gone. The reviewer's rows stay (trigger auto-creates
  -- open_tek/open_cift on profile insert) and are RESET to a clean 1200 / 0.
  delete from public.elo_ratings where profile_id <> v_rev;
  update public.elo_ratings set rating = 1200, matches_played = 0 where profile_id = v_rev;

  -- Non-reviewer profiles + auth.users (CASCADE clears any leftovers).
  delete from public.profiles where user_id <> v_rev;
  delete from auth.users   where id       <> v_rev;

  -- Reset the reviewer profile back to un-onboarded / clean state. Blank
  -- first_name/last_name so onboardingComplete = false → reviewer lands on the
  -- wizard on every sign-in (Apple asked to see the full flow).
  update public.profiles set
    first_name            = '',
    last_name             = '',
    email                 = 'appreview42@proton.me',
    phone                 = null,
    avatar_url            = null,
    status                = 'active',
    pronoun               = 'they/them',
    pronoun_custom        = null,
    gender_category       = 'open_only',
    class_year            = '3',
    show_department       = true,
    show_class_year       = true,
    skill_self_assessment = 'orta',
    dominant_hand         = 'sag',
    availability_windows  = array['weekday_evening','weekend_morning'],
    kvkk_accepted_at      = coalesce(kvkk_accepted_at, now())
   where user_id = v_rev;

  -- ---------------------------------------------------------------------------
  -- 2. Seed 5 opponent auth.users. Never authenticate; no password.
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
    (o5, 'seed-opp-05@challengebu-review.invalid')
  ) as x(id, email)
  on conflict (id) do nothing;

  -- Opponent profiles. gender_category drives which elo categories the trigger
  -- auto-creates (open_tek for everyone; erkek_tek for erkek; kadin_tek for
  -- kadin). Distribution: 2 erkek + 2 kadın + 1 open.
  insert into public.profiles (
    user_id, role, first_name, last_name, email,
    pronoun, gender_category, class_year,
    show_department, show_class_year,
    skill_self_assessment, dominant_hand, availability_windows,
    status, kvkk_accepted_at
  ) values
    (o1, 'player', 'Deniz',  'Arslan',  'seed-opp-01@challengebu-review.invalid', 'he/him',    'erkek',     '2',  true, true, 'ileri', 'sag', array['weekday_evening'],                   'active', now()),
    (o2, 'player', 'Emre',   'Kaya',    'seed-opp-02@challengebu-review.invalid', 'he/him',    'erkek',     '3',  true, true, 'orta',  'sag', array['weekend_morning'],                   'active', now()),
    (o3, 'player', 'Zeynep', 'Şahin',   'seed-opp-03@challengebu-review.invalid', 'she/her',   'kadin',     '2',  true, true, 'ileri', 'sag', array['weekday_evening'],                   'active', now()),
    (o4, 'player', 'Elif',   'Aydın',   'seed-opp-04@challengebu-review.invalid', 'she/her',   'kadin',     '3',  true, true, 'orta',  'sol', array['weekend_morning','weekday_evening'], 'active', now()),
    (o5, 'player', 'Aslı',   'Çelik',   'seed-opp-05@challengebu-review.invalid', 'they/them', 'open_only', '4',  true, true, 'orta',  'sag', array['weekend_morning'],                   'active', now())
  on conflict (user_id) do update set
    first_name = excluded.first_name,
    last_name  = excluded.last_name,
    status     = 'active';

  -- ---------------------------------------------------------------------------
  -- 3. Ratings — realistic, varied standings. Trigger already inserted the
  --    per-category rows; we UPDATE them into non-default values.
  -- ---------------------------------------------------------------------------
  -- Open Tek — every player (reviewer + all 5 opponents).
  update public.elo_ratings set rating = 1462, matches_played = 21 where profile_id = o1   and category = 'open_tek';
  update public.elo_ratings set rating = 1341, matches_played = 12 where profile_id = o3   and category = 'open_tek';
  update public.elo_ratings set rating = 1290, matches_played = 9  where profile_id = o2   and category = 'open_tek';
  update public.elo_ratings set rating = 1248, matches_played = 3  where profile_id = v_rev and category = 'open_tek';
  update public.elo_ratings set rating = 1224, matches_played = 7  where profile_id = o5   and category = 'open_tek';
  update public.elo_ratings set rating = 1186, matches_played = 6  where profile_id = o4   and category = 'open_tek';

  -- Erkek Tek — o1 + o2 only (no reviewer, no kadın, no open).
  update public.elo_ratings set rating = 1455, matches_played = 18 where profile_id = o1 and category = 'erkek_tek';
  update public.elo_ratings set rating = 1281, matches_played = 8  where profile_id = o2 and category = 'erkek_tek';

  -- Kadın Tek — o3 + o4 only.
  update public.elo_ratings set rating = 1349, matches_played = 11 where profile_id = o3 and category = 'kadin_tek';
  update public.elo_ratings set rating = 1204, matches_played = 5  where profile_id = o4 and category = 'kadin_tek';

  -- ---------------------------------------------------------------------------
  -- 4. Completed (confirmed) matches — past, ELO fields hand-set (no trigger
  --    computes them). Fixed ids (bbbb000N). Categories match participants'
  --    genders: erkek_tek pairs need TWO erkek, kadin_tek pairs need TWO kadın,
  --    open_tek is anyone.
  -- ---------------------------------------------------------------------------
  insert into public.matches (
    id, category, format, court_id, played_at, is_rated, kind,
    team_a_player_ids, team_b_player_ids,
    score_team_a, score_team_b, winner_team, status,
    started_by, confirmed_by, confirmed_at,
    rating_before_team_a, rating_after_team_a,
    rating_before_team_b, rating_after_team_b
  ) values
    -- reviewer WON vs o4 (open_tek, cross-gender allowed here)
    ('bbbb0001-0000-4000-8000-000000000001', 'open_tek', 'bu_klasik', v_court, now() - interval '9 days',  true, 'ranking',
     array[v_rev]::uuid[], array[o4]::uuid[], 4, 1, 'a', 'confirmed',
     array[v_rev,o4]::uuid[], array[v_rev,o4]::uuid[], now() - interval '9 days' + interval '1 hour',
     1220, 1240, 1200, 1186),
    -- reviewer LOST vs o1 (open_tek)
    ('bbbb0002-0000-4000-8000-000000000002', 'open_tek', 'hizli_tiebreak', v_court, now() - interval '6 days', true, 'ranking',
     array[v_rev]::uuid[], array[o1]::uuid[], 8, 10, 'b', 'confirmed',
     array[v_rev,o1]::uuid[], array[v_rev,o1]::uuid[], now() - interval '6 days' + interval '1 hour',
     1240, 1224, 1446, 1462),
    -- reviewer WON vs o5 (open_tek)
    ('bbbb0003-0000-4000-8000-000000000003', 'open_tek', 'bu_klasik', v_court, now() - interval '3 days', true, 'ranking',
     array[v_rev]::uuid[], array[o5]::uuid[], 4, 2, 'a', 'confirmed',
     array[v_rev,o5]::uuid[], array[v_rev,o5]::uuid[], now() - interval '3 days' + interval '1 hour',
     1224, 1248, 1238, 1224),
    -- erkek_tek: o1 (erkek) vs o2 (erkek)
    ('bbbb0004-0000-4000-8000-000000000004', 'erkek_tek', 'bu_klasik', v_court, now() - interval '5 days', true, 'ranking',
     array[o1]::uuid[], array[o2]::uuid[], 4, 0, 'a', 'confirmed',
     array[o1,o2]::uuid[], array[o1,o2]::uuid[], now() - interval '5 days' + interval '1 hour',
     1443, 1455, 1293, 1281),
    -- kadin_tek: o3 (kadın) vs o4 (kadın)
    ('bbbb0005-0000-4000-8000-000000000005', 'kadin_tek', '3set_klasik', v_court, now() - interval '4 days', true, 'ranking',
     array[o3]::uuid[], array[o4]::uuid[], 2, 1, 'a', 'confirmed',
     array[o3,o4]::uuid[], array[o3,o4]::uuid[], now() - interval '4 days' + interval '1 hour',
     1335, 1349, 1218, 1204)
  on conflict (id) do nothing;

  -- ---------------------------------------------------------------------------
  -- 5. ONE match "ready to start" for the reviewer (cccc0001).
  --    played_at 90 min in the past → both the 15-minute start gate and the
  --    score gate pass. started_by pre-filled with the opponent → reviewer taps
  --    "Maçı Başlat" once to complete the handshake, then enters the score.
  --    Opponent o2 is erkek but category is open_tek (cross-gender allowed).
  -- ---------------------------------------------------------------------------
  insert into public.matches (
    id, category, format, court_id, played_at, is_rated, kind,
    team_a_player_ids, team_b_player_ids,
    score_team_a, score_team_b, winner_team, status, started_by,
    confirmed_by, confirmed_at, voided_reason
  ) values (
    'cccc0001-0000-4000-8000-000000000001', 'open_tek', 'bu_klasik', v_court,
    now() - interval '90 minutes', true, 'ranking',
    array[v_rev]::uuid[], array[o2]::uuid[],
    0, 0, null, 'awaiting_confirmation', array[o2]::uuid[],
    '{}'::uuid[], null, null
  )
  on conflict (id) do update set
    court_id      = excluded.court_id,
    played_at     = excluded.played_at,
    score_team_a  = excluded.score_team_a,
    score_team_b  = excluded.score_team_b,
    winner_team   = excluded.winner_team,
    status        = excluded.status,
    started_by    = excluded.started_by,
    confirmed_by  = excluded.confirmed_by,
    confirmed_at  = excluded.confirmed_at,
    voided_reason = excluded.voided_reason;

  -- ---------------------------------------------------------------------------
  -- 6. ONE incoming pending challenge to the reviewer (dddd0001).
  --    o3 (kadın) proposing an open_tek match — again cross-gender is fine.
  -- ---------------------------------------------------------------------------
  insert into public.match_requests (
    id, creator_id, type, target_id, category, format, is_rated,
    proposed_date, proposed_time, court_id, status, expires_at, accepted_at
  ) values (
    'dddd0001-0000-4000-8000-000000000001', o3, 'direct_challenge', v_rev,
    'open_tek', 'hizli_tiebreak', true,
    current_date, (now() - interval '20 minutes')::time, v_court,
    'pending', now() + interval '30 days', null
  )
  on conflict (id) do update set
    proposed_date = excluded.proposed_date,
    proposed_time = excluded.proposed_time,
    court_id      = excluded.court_id,
    status        = excluded.status,
    expires_at    = excluded.expires_at,
    accepted_at   = excluded.accepted_at;

  raise notice 'Reset + seed complete: reviewer=% + 5 opponents (2 erkek, 2 kadın, 1 open)', v_rev;
end $$;

-- =============================================================================
-- Verify
-- =============================================================================
do $$
declare
  v_status text;
begin
  select status::text into v_status from public.matches
   where id = 'cccc0001-0000-4000-8000-000000000001';
  if v_status is distinct from 'awaiting_confirmation' then
    raise exception 'startable match is % (expected awaiting_confirmation)', coalesce(v_status, 'MISSING');
  end if;

  select status::text into v_status from public.match_requests
   where id = 'dddd0001-0000-4000-8000-000000000001';
  if v_status is distinct from 'pending' then
    raise exception 'incoming challenge is % (expected pending)', coalesce(v_status, 'MISSING');
  end if;
end $$;

-- Category-hygiene check: nobody must sit in a ladder that doesn't match their
-- gender_category. erkek_tek → only 'erkek'. kadin_tek → only 'kadin'.
-- open_tek allows anyone. Fails LOUDLY instead of a silent bad ladder.
do $$
declare
  v_bad int;
begin
  select count(*) into v_bad
    from public.elo_ratings r
    join public.profiles p on p.user_id = r.profile_id
   where (r.category = 'erkek_tek' and p.gender_category <> 'erkek')
      or (r.category = 'kadin_tek' and p.gender_category <> 'kadin');
  if v_bad > 0 then
    raise exception 'category-hygiene: % ladder rows do not match their profile gender_category', v_bad;
  end if;
end $$;

-- Row-count summary
select 'profiles_total'         as check, count(*)::text as rows from public.profiles
union all
select 'profiles_erkek',           count(*)::text from public.profiles where gender_category = 'erkek'
union all
select 'profiles_kadin',           count(*)::text from public.profiles where gender_category = 'kadin'
union all
select 'profiles_open',            count(*)::text from public.profiles where gender_category = 'open_only'
union all
select 'ladder_open_tek',          count(*)::text from public.elo_ratings where category = 'open_tek'
union all
select 'ladder_erkek_tek',         count(*)::text from public.elo_ratings where category = 'erkek_tek'
union all
select 'ladder_kadin_tek',         count(*)::text from public.elo_ratings where category = 'kadin_tek'
union all
select 'confirmed_matches',        count(*)::text from public.matches where id::text like 'bbbb%' and status = 'confirmed'
union all
select 'ready_match_awaiting',     count(*)::text from public.matches where id::text like 'cccc%' and status = 'awaiting_confirmation'
union all
select 'pending_challenge',        count(*)::text from public.match_requests where id::text like 'dddd%' and status = 'pending';
