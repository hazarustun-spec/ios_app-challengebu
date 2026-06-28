-- pgTAP tests for the match-lifecycle SECURITY DEFINER RPCs:
--   accept_match_application  (20260620000002) — accepts an open-call applicant
--     AND materialises the upcoming match with the right teams/status.
--   start_match               (20260620000003) — appends auth.uid() to
--     started_by idempotently, guarded to participants only.
--   auto_confirm_matches      (20260607000005) — confirms/voids awaiting matches
--     that have a winner and were untouched for 48h.
--   expire_match_requests     (20260607000004) — expires pending requests past
--     their expires_at.
-- Run: supabase test db tests/database/match-lifecycle.test.sql
begin;
select plan(17);

-- ── Identities (profiles need a backing auth.users row + NOT NULL columns) ───
\set creator   '11111111-1111-1111-1111-111111111111'
\set applicant '22222222-2222-2222-2222-222222222222'
\set stranger  '99999999-9999-9999-9999-999999999999'
-- Pure participants for start_match (no FK on matches player-id arrays).
\set sa 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set sb 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

insert into auth.users (id) values (:'creator'), (:'applicant');

insert into public.profiles
  (user_id, first_name, last_name, email, pronoun, gender_category, class_year,
   skill_self_assessment, dominant_hand)
values
  (:'creator',   'Cre', 'Ator',  'creator@test.local',   'he/him', 'erkek', '1', 'orta', 'sag'),
  (:'applicant', 'App', 'Licant','applicant@test.local', 'he/him', 'erkek', '2', 'orta', 'sag');

-- ── Scenario 1: accept_match_application ────────────────────────────────────
-- A pending open_call + one application; the creator accepts the applicant.
\set req1 'dddddddd-0000-0000-0000-000000000001'
insert into public.match_requests
  (id, creator_id, type, category, format, proposed_date, proposed_time,
   court_id, expires_at, status)
values
  (:'req1', :'creator', 'open_call', 'erkek_tek', 'bu_klasik',
   '2026-07-01', '10:00', (select id from public.courts limit 1),
   now() + interval '2 days', 'pending');

insert into public.match_request_applications (request_id, applicant_id)
values (:'req1', :'applicant');

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select accept_match_application(:'req1', :'applicant');

select is(
  (select status::text from public.match_requests where id = :'req1'),
  'accepted', 'accept_match_application flips the request to accepted');
select is(
  (select target_id from public.match_requests where id = :'req1'),
  :'applicant'::uuid, 'accept sets target_id to the chosen applicant');
select is(
  (select count(*)::int from public.matches where match_request_id = :'req1'),
  1, 'accept materialises exactly one match for the request');
select is(
  (select team_a_player_ids from public.matches where match_request_id = :'req1'),
  array[:'creator']::uuid[], 'team A = creator side');
select is(
  (select team_b_player_ids from public.matches where match_request_id = :'req1'),
  array[:'applicant']::uuid[], 'team B = accepted applicant side');
select is(
  (select status::text from public.matches where match_request_id = :'req1'),
  'awaiting_confirmation', 'created match starts in awaiting_confirmation');

-- Guard: only the creator may accept. A second pending request, called by a
-- non-creator, is rejected with 42501.
\set req2 'dddddddd-0000-0000-0000-000000000002'
insert into public.match_requests
  (id, creator_id, type, category, format, proposed_date, proposed_time,
   court_id, expires_at, status)
values
  (:'req2', :'creator', 'open_call', 'erkek_tek', 'bu_klasik',
   '2026-07-02', '11:00', (select id from public.courts limit 1),
   now() + interval '2 days', 'pending');
insert into public.match_request_applications (request_id, applicant_id)
values (:'req2', :'applicant');

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select throws_ok(
  $$ select accept_match_application('dddddddd-0000-0000-0000-000000000002',
                                     '22222222-2222-2222-2222-222222222222') $$,
  '42501',
  'Only request creator can accept applications',
  'non-creator accepting an application is rejected (42501)');

-- ── Scenario 2: start_match handshake ───────────────────────────────────────
\set mstart 'cccccccc-0000-0000-0000-000000000001'
insert into public.matches
  (id, category, format, court_id, played_at, team_a_player_ids, team_b_player_ids)
values
  (:'mstart', 'erkek_tek', 'bu_klasik', (select id from public.courts limit 1),
   now(), array[:'sa']::uuid[], array[:'sb']::uuid[]);

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
select start_match(:'mstart');
select is(
  (select cardinality(started_by) from public.matches where id = :'mstart'),
  1, 'first participant start → started_by has 1 entry');

-- Same user starting again is idempotent (distinct union).
select start_match(:'mstart');
select is(
  (select cardinality(started_by) from public.matches where id = :'mstart'),
  1, 'same user starting again is idempotent (still 1 entry)');

-- The other participant joins → both present.
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';
select start_match(:'mstart');
select is(
  (select cardinality(started_by) from public.matches where id = :'mstart'),
  2, 'second participant start → started_by has both');
select is(
  (select array(select unnest(started_by) order by 1)
     from public.matches where id = :'mstart'),
  array[:'sa', :'sb']::uuid[], 'started_by holds exactly both participant ids');

-- Guard: a non-participant cannot start the match.
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';
select throws_ok(
  $$ select start_match('cccccccc-0000-0000-0000-000000000001') $$,
  '42501',
  'Only a participant can start the match',
  'non-participant starting the match is rejected (42501)');

-- ── Scenario 3: auto_confirm_matches (bug fixed in 20260629000001) ───────────
-- updated_at is set at INSERT time (the BEFORE UPDATE trigger would otherwise
-- stamp now()) so this row qualifies (stale + has a winner). The original fn
-- (migration 20260607000005) assigned a TEXT case-expression to the match_status
-- enum column and raised 42804 on every run; migration 20260629000001 casts the
-- CASE to ::match_status. We now assert the fixed behaviour: a >48h-stale
-- awaiting match with a winner is auto-confirmed.
\set m_conf 'cccccccc-0000-0000-0000-000000000010'

insert into public.matches
  (id, category, format, court_id, played_at, team_a_player_ids,
   team_b_player_ids, status, winner_team, updated_at)
values
  -- stale (>48h) + winner 'a' → becomes 'confirmed'.
  (:'m_conf', 'erkek_tek','bu_klasik',(select id from public.courts limit 1),
   now(), array[:'sa']::uuid[], array[:'sb']::uuid[],
   'awaiting_confirmation','a', now() - interval '50 hours');

select lives_ok(
  $$ select auto_confirm_matches() $$,
  'auto_confirm_matches runs without error (text->match_status cast fixed)');
select is(
  (select status::text from public.matches where id = :'m_conf'),
  'confirmed',
  'a >48h-stale awaiting match with a winner is auto-confirmed');

-- ── Scenario 4: expire_match_requests ───────────────────────────────────────
\set r_exp  'dddddddd-0000-0000-0000-000000000010'
\set r_fut  'dddddddd-0000-0000-0000-000000000011'
\set r_acc  'dddddddd-0000-0000-0000-000000000012'

insert into public.match_requests
  (id, creator_id, type, category, format, proposed_date, proposed_time,
   court_id, expires_at, status)
values
  -- pending + past expiry  → expired
  (:'r_exp', :'creator', 'open_call','erkek_tek','bu_klasik','2026-07-03','12:00',
   (select id from public.courts limit 1), now() - interval '1 hour', 'pending'),
  -- pending + future expiry → stays pending
  (:'r_fut', :'creator', 'open_call','erkek_tek','bu_klasik','2026-07-04','13:00',
   (select id from public.courts limit 1), now() + interval '1 day', 'pending'),
  -- already accepted + past expiry → untouched (not pending)
  (:'r_acc', :'creator', 'open_call','erkek_tek','bu_klasik','2026-07-05','14:00',
   (select id from public.courts limit 1), now() - interval '1 hour', 'accepted');

select expire_match_requests();

select is(
  (select status::text from public.match_requests where id = :'r_exp'),
  'expired', 'pending request past expires_at → expired');
select is(
  (select status::text from public.match_requests where id = :'r_fut'),
  'pending', 'pending request with future expiry is left pending');
select is(
  (select status::text from public.match_requests where id = :'r_acc'),
  'accepted', 'non-pending (accepted) request is never expired');

select * from finish();
rollback;
