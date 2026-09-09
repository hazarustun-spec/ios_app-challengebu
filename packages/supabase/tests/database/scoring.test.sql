-- pgTAP tests for the live-scoring plumbing: the event log, replay, the
-- cross-user dedupe window, the participant guard, and the compatibility
-- aliases kept for builds already in the App Store.
--
-- The per-rally scenarios this file used to hold (15/30/40, deuce, advantage)
-- are gone with the behaviour they described: migration 20260909000001 makes
-- one event one UNIT of the match's format. The per-format win conditions live
-- in live-score-formats.test.sql; what is left here is the machinery that is
-- the same whatever the unit is.
--
-- Run: supabase test db tests/database/scoring.test.sql
begin;
select plan(9);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- Two participants; matches reference a seeded court. No FK on player-id arrays
-- or actor_user_id, so fixed uuids are fine.
\set p1 '11111111-1111-1111-1111-111111111111'
\set p2 '22222222-2222-2222-2222-222222222222'
\set stranger '99999999-9999-9999-9999-999999999999'

insert into public.matches (id, category, format, court_id, played_at, team_a_player_ids, team_b_player_ids)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'erkek_tek','bu_klasik', (select id from public.courts limit 1), now(), array[:'p1']::uuid[], array[:'p2']::uuid[]),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'erkek_tek','bu_klasik', (select id from public.courts limit 1), now(), array[:'p1']::uuid[], array[:'p2']::uuid[]),
  ('cccccccc-0000-0000-0000-000000000003', 'erkek_tek','bu_klasik', (select id from public.courts limit 1), now(), array[:'p1']::uuid[], array[:'p2']::uuid[]),
  ('dddddddd-0000-0000-0000-000000000004', 'erkek_tek','bu_klasik', (select id from public.courts limit 1), now(), array[:'p1']::uuid[], array[:'p2']::uuid[]),
  ('eeeeeeee-0000-0000-0000-000000000005', 'erkek_tek','bu_klasik', (select id from public.courts limit 1), now(), array[:'p1']::uuid[], array[:'p2']::uuid[]),
  ('ffffffff-0000-0000-0000-000000000006', 'erkek_tek','bu_klasik', (select id from public.courts limit 1), now(), array[:'p1']::uuid[], array[:'p2']::uuid[]);

-- ── Compatibility aliases ───────────────────────────────────────────────────
-- award_point/undo_point are what the Live Activity intents of the CURRENT App
-- Store build call. Dropping them would turn a wrong score into a hard failure
-- on a phone that cannot be fixed over the air, so they forward to the new
-- functions and are pinned here.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select award_point('aaaaaaaa-0000-0000-0000-000000000001','a');
select is(
  (select games_a from public.live_match_scores where match_id='aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'award_point still works and now adds one UNIT, not one rally point');

select undo_point('aaaaaaaa-0000-0000-0000-000000000001');
select is(
  (select games_a from public.live_match_scores where match_id='aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'undo_point reverses the last unit');

-- ── Dedupe: both players recording the same unit ────────────────────────────
-- Either participant may score, so the same game gets entered twice whenever
-- both reach for their phone. Two entries for the SAME side from DIFFERENT
-- users inside the window collapse into one.
select award_unit('bbbbbbbb-0000-0000-0000-000000000002','a');
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select award_unit('bbbbbbbb-0000-0000-0000-000000000002','a');
select is(
  (select games_a from public.live_match_scores where match_id='bbbbbbbb-0000-0000-0000-000000000002'),
  1,
  'same side by a DIFFERENT user inside the window counts once');

-- One person entering two units in a row is scoring two units, not
-- double-tapping — that must never be collapsed.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select award_unit('cccccccc-0000-0000-0000-000000000003','a');
select award_unit('cccccccc-0000-0000-0000-000000000003','a');
select is(
  (select games_a from public.live_match_scores where match_id='cccccccc-0000-0000-0000-000000000003'),
  2,
  'the same user awarding twice is NOT deduped');

-- ── Replay ──────────────────────────────────────────────────────────────────
-- The score is a pure function of the awarded events; recompute reads them back
-- under the match's format.
insert into public.point_events (match_id, side, actor_user_id)
select 'dddddddd-0000-0000-0000-000000000004','a', :'p1' from generate_series(1,4);
select recompute_live_score('dddddddd-0000-0000-0000-000000000004');
select is(
  (select games_a||'/'||phase||'/'||coalesce(winner,'-')
     from public.live_match_scores where match_id='dddddddd-0000-0000-0000-000000000004'),
  '4/finished/a',
  'four unit events → 4-0, finished (it took sixteen rally points before)');

-- 3-3 is a live match with a decider to come, not a draw. The old engine voided
-- here, which is what made Klasik's advertised 4-3 unreachable.
insert into public.point_events (match_id, side, actor_user_id)
select 'eeeeeeee-0000-0000-0000-000000000005','a', :'p1' from generate_series(1,3);
insert into public.point_events (match_id, side, actor_user_id)
select 'eeeeeeee-0000-0000-0000-000000000005','b', :'p1' from generate_series(1,3);
select recompute_live_score('eeeeeeee-0000-0000-0000-000000000005');
select is(
  (select games_a||'-'||games_b||'/'||phase
     from public.live_match_scores where match_id='eeeeeeee-0000-0000-0000-000000000005'),
  '3-3/ongoing',
  '3-3 stays ongoing — the seventh game decides it');

-- ── Guards ──────────────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';
select throws_ok(
  $$ select award_unit('aaaaaaaa-0000-0000-0000-000000000001','a') $$,
  '42501',
  'not a participant',
  'a non-participant is rejected (42501)');

-- ── Taking back from an empty log is a safe no-op ───────────────────────────
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select lives_ok(
  $$ select revoke_unit('ffffffff-0000-0000-0000-000000000006','a') $$,
  'revoking with no events does not error');
select is(
  (select coalesce((select games_a from public.live_match_scores where match_id='ffffffff-0000-0000-0000-000000000006'),0)),
  0,
  'the no-op leaves the score at 0');

select * from finish();
rollback;
