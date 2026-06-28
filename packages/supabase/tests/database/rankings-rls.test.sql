-- pgTAP tests for:
--   Part A — get_user_rankings (20260608000003_rankings_rpc.sql): per-category
--     ELO + dense window rank, rows ordered by rating desc for the target user.
--   Part B — RLS predicate helpers: is_admin (20260606000001_profiles.sql),
--     is_conversation_participant + is_conversation_blocked
--     (20260617000001_messaging.sql). All are SECURITY DEFINER and read
--     auth.uid(), so we drive identity via `set local request.jwt.claims`.
-- Run: supabase test db tests/database/rankings-rls.test.sql
begin;
select plan(16);

-- ── Fixtures ────────────────────────────────────────────────────────────────
\set admin 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set p1 '11111111-1111-1111-1111-111111111111'
\set p2 '22222222-2222-2222-2222-222222222222'
\set p3 '33333333-3333-3333-3333-333333333333'

-- profiles.user_id FK -> auth.users(id); id is the only column without a default.
insert into auth.users (id) values (:'admin'), (:'p1'), (:'p2'), (:'p3');

insert into public.profiles
  (user_id, role, first_name, last_name, email, pronoun, gender_category,
   class_year, skill_self_assessment, dominant_hand)
values
  (:'admin','admin','Ada','Min','admin@test.local','they/them','erkek','1','orta','sag'),
  (:'p1','player','Pat','One','p1@test.local','he/him','erkek','1','orta','sag'),
  (:'p2','player','Pat','Two','p2@test.local','he/him','erkek','2','orta','sag'),
  (:'p3','player','Pat','Three','p3@test.local','he/him','erkek','3','ileri','sol');

-- erkek_tek ladder: p3=1600 > p1=1500 > p2=1400 > admin=1300
--   -> ranks 1,2,3,4 respectively.
-- p1 also sits in open_tek at 1700 (highest there -> rank 1).
insert into public.elo_ratings (profile_id, category, rating, matches_played)
values
  (:'p3','erkek_tek',1600,12),
  (:'p1','erkek_tek',1500,10),
  (:'p2','erkek_tek',1400, 8),
  (:'admin','erkek_tek',1300, 5),
  (:'p1','open_tek',1700, 7);

-- ── Part A: get_user_rankings ───────────────────────────────────────────────
-- p1 belongs to two categories -> two rows, ordered by rating desc.
select is(
  (select count(*)::int from public.get_user_rankings(:'p1')),
  2,
  'get_user_rankings returns one row per category the user is rated in');

-- First row (highest rating) is open_tek.
select is(
  (select category from public.get_user_rankings(:'p1') order by rating desc limit 1),
  'open_tek',
  'rows ordered by rating desc: open_tek (1700) comes first');
select is(
  (select rank from public.get_user_rankings(:'p1') order by rating desc limit 1),
  1::bigint,
  'p1 is rank 1 in open_tek (only rated player there)');

-- Second row is erkek_tek; p1 sits behind p3 (1600) -> rank 2.
select is(
  (select rating from public.get_user_rankings(:'p1') where category = 'erkek_tek'),
  1500,
  'get_user_rankings reports the correct rating for erkek_tek');
select is(
  (select matches_played from public.get_user_rankings(:'p1') where category = 'erkek_tek'),
  10,
  'get_user_rankings reports the correct matches_played');
select is(
  (select rank from public.get_user_rankings(:'p1') where category = 'erkek_tek'),
  2::bigint,
  'p1 is rank 2 in erkek_tek (behind p3 at 1600)');

select is(
  (select rank from public.get_user_rankings(:'p3') where category = 'erkek_tek'),
  1::bigint,
  'p3 (1600) is rank 1 in erkek_tek');
select is(
  (select rank from public.get_user_rankings(:'p2') where category = 'erkek_tek'),
  3::bigint,
  'p2 (1400) is rank 3 in erkek_tek');
select is(
  (select rank from public.get_user_rankings(:'admin') where category = 'erkek_tek'),
  4::bigint,
  'admin (1300) is rank 4 in erkek_tek');

-- ── Part B: is_admin ────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
select ok(public.is_admin(), 'is_admin() is true for an admin-role caller');

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select ok(not public.is_admin(), 'is_admin() is false for a player-role caller');

-- ── Part B: conversation predicates ─────────────────────────────────────────
-- A match_request + conversation between p1 (low) and p2 (high). p3 is a stranger.
insert into public.match_requests
  (id, creator_id, type, target_id, category, format, proposed_date, proposed_time,
   court_id, expires_at)
values
  ('dddddddd-0000-0000-0000-000000000001', :'p1', 'direct_challenge', :'p2',
   'erkek_tek', 'bu_klasik', '2026-07-01', '10:00',
   (select id from public.courts limit 1), now() + interval '1 day');

insert into public.conversations (id, request_id, participant_low, participant_high)
values
  ('cccccccc-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001', :'p1', :'p2');

-- is_conversation_participant: both participants true, stranger false.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select ok(
  public.is_conversation_participant('cccccccc-0000-0000-0000-000000000001'),
  'is_conversation_participant() true for participant_low (p1)');

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select ok(
  public.is_conversation_participant('cccccccc-0000-0000-0000-000000000001'),
  'is_conversation_participant() true for participant_high (p2)');

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select ok(
  not public.is_conversation_participant('cccccccc-0000-0000-0000-000000000001'),
  'is_conversation_participant() false for a non-participant (p3)');

-- is_conversation_blocked: false with no blocks; true once a block exists in
-- EITHER direction (here p2 blocks p1) regardless of which side asks.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select ok(
  not public.is_conversation_blocked('cccccccc-0000-0000-0000-000000000001'),
  'is_conversation_blocked() false when neither participant blocks the other');

insert into public.user_blocks (blocker_id, blocked_id) values (:'p2', :'p1');
select ok(
  public.is_conversation_blocked('cccccccc-0000-0000-0000-000000000001'),
  'is_conversation_blocked() true once a block exists in either direction');

select * from finish();
rollback;
