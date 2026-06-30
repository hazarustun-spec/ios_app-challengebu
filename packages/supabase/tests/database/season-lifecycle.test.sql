-- pgTAP tests for season_lifecycle_check() state machine
-- (latest version: 20260625000003_engaging_notification_copy.sql).
-- Covers: upcoming→active, upcoming stays upcoming, active→finale,
-- start_finale admin notification, close_season blocked by pending bracket,
-- close_season fires after bracket completes, and close_season dedup in 20 hours.
--
-- NOTE: a partial unique index (seasons_one_active_idx) enforces at most ONE
-- season in status='active' or 'finale' at any time. The test neutralises
-- the pre-seeded 'yaz 2026' season first, then exercises each transition in
-- sequence so only one active/finale season exists at any point.
--
-- Run: supabase test db tests/database/season-lifecycle.test.sql
begin;
select plan(8);

-- ── Admin fixture (needed for lifecycle notifications) ───────────────────────
\set admin_id 'aaaa9900-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

insert into auth.users (id) values (:'admin_id');
insert into public.profiles
  (user_id, role, first_name, last_name, email, pronoun, gender_category,
   class_year, skill_self_assessment, dominant_hand)
values
  (:'admin_id', 'admin', 'Admin', 'LC', 'admin_lc@test.local', 'they/them',
   'erkek', '1', 'orta', 'sag');

-- Neutralise any pre-seeded active/finale season so the unique index won't
-- block our test inserts.  This UPDATE is rolled back with the transaction.
update public.seasons set status = 'closed'
where status in ('active', 'finale');

-- ── Phase 1 fixtures: two upcoming seasons ───────────────────────────────────
--   season_A: past starts_at → lifecycle activates it
--   season_B: future starts_at → stays upcoming
insert into public.seasons
  (id, name, year, starts_at, ends_at, finale_starts_at, finale_ends_at, status)
values
  ('11119900-0000-0000-0000-000000000001'::uuid,
   'guz', 2019,
   now() - interval '10 days', now() + interval '80 days',
   now() + interval '70 days',  now() + interval '78 days',
   'upcoming'),
  ('22229900-0000-0000-0000-000000000002'::uuid,
   'bahar', 2019,
   now() + interval '30 days', now() + interval '120 days',
   now() + interval '100 days', now() + interval '118 days',
   'upcoming');

-- ── Phase 1: upcoming → active / stays upcoming ──────────────────────────────
select lives_ok(
  $$ select public.season_lifecycle_check() $$,
  'season_lifecycle_check() runs without error');

select is(
  (select status::text from public.seasons
   where id = '11119900-0000-0000-0000-000000000001'),
  'active',
  'upcoming season with past starts_at transitions to active');

select is(
  (select status::text from public.seasons
   where id = '22229900-0000-0000-0000-000000000002'),
  'upcoming',
  'upcoming season with future starts_at stays upcoming');

-- Free the active slot before inserting the next scenario.
update public.seasons set status = 'closed'
where id = '11119900-0000-0000-0000-000000000001';

-- ── Phase 2 fixtures: season with completed finale window ────────────────────
--   season_C starts as 'active' with both finale_starts_at and finale_ends_at
--   already in the past.  A tournament is initially in_progress (blocks
--   close_season) so we can observe both the blocked and unblocked paths.
insert into public.seasons
  (id, name, year, starts_at, ends_at, finale_starts_at, finale_ends_at, status)
values
  ('33339900-0000-0000-0000-000000000003'::uuid,
   'yaz', 2019,
   now() - interval '60 days', now() + interval '5 days',
   now() - interval '10 days',  now() - interval '1 hour',
   'active');

insert into public.tournaments (id, season_id, category, bracket_size, status)
values
  ('aaaa9900-0000-0000-0000-000000000001'::uuid,
   '33339900-0000-0000-0000-000000000003'::uuid,
   'erkek_tek', 8, 'in_progress');

-- ── Phase 2: active → finale; start_finale notif; no close_season yet ───────
select public.season_lifecycle_check();

select is(
  (select status::text from public.seasons
   where id = '33339900-0000-0000-0000-000000000003'),
  'finale',
  'active season with past finale_starts_at transitions to finale');

select is(
  (select count(*)::int from public.notifications
   where recipient_id = :'admin_id'
     and category = 'season_lifecycle'
     and data->>'action' = 'start_finale'
     and (data->>'season_id')::uuid = '33339900-0000-0000-0000-000000000003'),
  1,
  'admin receives start_finale notification when season transitions to finale');

select is(
  (select count(*)::int from public.notifications
   where recipient_id = :'admin_id'
     and category = 'season_lifecycle'
     and data->>'action' = 'close_season'
     and (data->>'season_id')::uuid = '33339900-0000-0000-0000-000000000003'),
  0,
  'no close_season notification while a tournament bracket is still in_progress');

-- ── Phase 3: complete the bracket → close_season fires ──────────────────────
update public.tournaments set status = 'completed'
where id = 'aaaa9900-0000-0000-0000-000000000001';

select public.season_lifecycle_check();

select is(
  (select count(*)::int from public.notifications
   where recipient_id = :'admin_id'
     and category = 'season_lifecycle'
     and data->>'action' = 'close_season'
     and (data->>'season_id')::uuid = '33339900-0000-0000-0000-000000000003'),
  1,
  'admin receives close_season notification once all brackets are completed');

-- ── Phase 4: dedup — re-running within 20 hours must not duplicate ───────────
select public.season_lifecycle_check();

select is(
  (select count(*)::int from public.notifications
   where recipient_id = :'admin_id'
     and category = 'season_lifecycle'
     and data->>'action' = 'close_season'
     and (data->>'season_id')::uuid = '33339900-0000-0000-0000-000000000003'),
  1,
  'close_season notification is not duplicated when function re-runs within 20 hours');

select * from finish();
rollback;
