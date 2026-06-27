-- pgTAP tests for the event-sourced live-scoring engine:
--   award_point (advantage scoring + 5s same-rally dedupe), undo_point,
--   recompute_live_score (replay), and the participant guard.
-- Run: supabase test db tests/database/scoring.test.sql
begin;
select plan(15);

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
  ('eeeeeeee-0000-0000-0000-000000000005', 'erkek_tek','bu_klasik', (select id from public.courts limit 1), now(), array[:'p1']::uuid[], array[:'p2']::uuid[]);

-- ── Scenario A: advantage / deuce on match A (actor = p1) ───────────────────
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select award_point('aaaaaaaa-0000-0000-0000-000000000001','a');  -- 15-0
select is((select points_a from public.live_match_scores where match_id='aaaaaaaa-0000-0000-0000-000000000001'), 1, 'first point → points_a = 1 (15)');

select award_point('aaaaaaaa-0000-0000-0000-000000000001','a');  -- 30-0
select award_point('aaaaaaaa-0000-0000-0000-000000000001','a');  -- 40-0
select award_point('aaaaaaaa-0000-0000-0000-000000000001','b');  -- 40-15
select award_point('aaaaaaaa-0000-0000-0000-000000000001','b');  -- 40-30
select award_point('aaaaaaaa-0000-0000-0000-000000000001','b');  -- deuce (3-3)
select is((select points_a||'-'||points_b from public.live_match_scores where match_id='aaaaaaaa-0000-0000-0000-000000000001'), '3-3', '40-40 stores as deuce 3-3');

select award_point('aaaaaaaa-0000-0000-0000-000000000001','a');  -- advantage A (4-3)
select is((select points_a from public.live_match_scores where match_id='aaaaaaaa-0000-0000-0000-000000000001'), 4, 'point from deuce → advantage (4, renders "Ad")');
select is((select games_a from public.live_match_scores where match_id='aaaaaaaa-0000-0000-0000-000000000001'), 0, 'advantage does NOT win the game (margin must be 2)');

select award_point('aaaaaaaa-0000-0000-0000-000000000001','b');  -- back to deuce (3-3)
select is((select points_a||'-'||points_b from public.live_match_scores where match_id='aaaaaaaa-0000-0000-0000-000000000001'), '3-3', 'opponent point from advantage → back to deuce');

select award_point('aaaaaaaa-0000-0000-0000-000000000001','a');  -- adv A
select award_point('aaaaaaaa-0000-0000-0000-000000000001','a');  -- game A
select is((select games_a||'-'||points_a||'-'||points_b from public.live_match_scores where match_id='aaaaaaaa-0000-0000-0000-000000000001'), '1-0-0', 'two points from deuce → game won, points reset');

-- ── Undo on match A: reverse the game-winning point ─────────────────────────
select undo_point('aaaaaaaa-0000-0000-0000-000000000001');
select is((select games_a from public.live_match_scores where match_id='aaaaaaaa-0000-0000-0000-000000000001'), 0, 'undo reverts the game-winning point (games_a back to 0)');
select is((select points_a from public.live_match_scores where match_id='aaaaaaaa-0000-0000-0000-000000000001'), 4, 'after undo, back at advantage (4)');

-- ── Scenario B: 5s same-rally dedupe (cross-user) on match B ────────────────
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select award_point('bbbbbbbb-0000-0000-0000-000000000002','a');  -- p1 awards a
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select award_point('bbbbbbbb-0000-0000-0000-000000000002','a');  -- p2 same side, <5s → deduped
select is((select points_a from public.live_match_scores where match_id='bbbbbbbb-0000-0000-0000-000000000002'), 1, 'same side by a DIFFERENT user within 5s counts once (dedupe)');

-- ── Scenario C: same user, rapid double → both count (no dedupe) ─────────────
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select award_point('cccccccc-0000-0000-0000-000000000003','a');
select award_point('cccccccc-0000-0000-0000-000000000003','a');
select is((select points_a from public.live_match_scores where match_id='cccccccc-0000-0000-0000-000000000003'), 2, 'same user awarding twice is NOT deduped (both count)');

-- ── Scenario D: replay → finished at 4 games (recompute directly) ───────────
insert into public.point_events (match_id, side, actor_user_id)
select 'dddddddd-0000-0000-0000-000000000004','a', :'p1' from generate_series(1,16);
select recompute_live_score('dddddddd-0000-0000-0000-000000000004');
select is((select games_a||'/'||phase||'/'||coalesce(winner,'-') from public.live_match_scores where match_id='dddddddd-0000-0000-0000-000000000004'), '4/finished/a', '16 points → 4 games → finished, winner a');

-- ── Scenario E: replay → void at 3-3 games ──────────────────────────────────
insert into public.point_events (match_id, side, actor_user_id)
select 'eeeeeeee-0000-0000-0000-000000000005','a', :'p1' from generate_series(1,12);
insert into public.point_events (match_id, side, actor_user_id)
select 'eeeeeeee-0000-0000-0000-000000000005','b', :'p1' from generate_series(1,12);
select recompute_live_score('eeeeeeee-0000-0000-0000-000000000005');
select is((select games_a||'-'||games_b||'/'||phase from public.live_match_scores where match_id='eeeeeeee-0000-0000-0000-000000000005'), '3-3/void', '3 games each → 3-3 void');

-- ── Participant guard: a stranger cannot award ──────────────────────────────
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';
select throws_ok(
  $$ select award_point('aaaaaaaa-0000-0000-0000-000000000001','a') $$,
  '42501',
  'not a participant',
  'a non-participant is rejected (42501)');

-- ── Undo on an empty log is a safe no-op ────────────────────────────────────
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
insert into public.matches (id, category, format, court_id, played_at, team_a_player_ids, team_b_player_ids)
values ('ffffffff-0000-0000-0000-000000000006','erkek_tek','bu_klasik',(select id from public.courts limit 1), now(), array[:'p1']::uuid[], array[:'p2']::uuid[]);
select lives_ok(
  $$ select undo_point('ffffffff-0000-0000-0000-000000000006') $$,
  'undo with no events is a no-op (does not error)');
select is((select coalesce((select games_a from public.live_match_scores where match_id='ffffffff-0000-0000-0000-000000000006'),0)), 0, 'no-op undo leaves score at 0');

select * from finish();
rollback;
