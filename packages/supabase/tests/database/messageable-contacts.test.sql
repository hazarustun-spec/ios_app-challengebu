-- pgTAP tests for list_messageable_contacts() (20260629000002).
--
-- Seed scenario:
--   U  — the caller (JWT sub set to U)
--   A  — direct_challenge U→A (two requests: older req_ua and newer req_ua2)
--   B  — direct_challenge B→U
--   C  — open_call by U; C is an applicant
--   D  — open_call by D; U applied
--   E  — direct_challenge U→E, but U has blocked E
--
-- Expected contacts: {A, B, C, D}.  E excluded (blocked). U excluded (self).
-- Dedup: A comes via two requests; req_ua2 (more recent) must be returned.
--
-- Run: supabase test db tests/database/messageable-contacts.test.sql
begin;
select plan(7);

-- ── Identities ────────────────────────────────────────────────────────────────
\set u 'cccc0001-0000-0000-0000-000000000001'
\set a 'cccc0001-0000-0000-0000-000000000002'
\set b 'cccc0001-0000-0000-0000-000000000003'
\set c 'cccc0001-0000-0000-0000-000000000004'
\set d 'cccc0001-0000-0000-0000-000000000005'
\set e 'cccc0001-0000-0000-0000-000000000006'

-- ── Request IDs ───────────────────────────────────────────────────────────────
\set req_ua  'dddd0001-0000-0000-0000-000000000001'
\set req_ua2 'dddd0001-0000-0000-0000-000000000002'
\set req_bu  'dddd0001-0000-0000-0000-000000000003'
\set req_uc  'dddd0001-0000-0000-0000-000000000004'
\set req_d   'dddd0001-0000-0000-0000-000000000005'
\set req_ue  'dddd0001-0000-0000-0000-000000000006'

insert into auth.users (id)
values (:'u'),(:'a'),(:'b'),(:'c'),(:'d'),(:'e');

insert into public.profiles
  (user_id, first_name, last_name, email, pronoun, gender_category,
   class_year, skill_self_assessment, dominant_hand)
values
  (:'u','U','User','u_mc@test.local','he/him','erkek','1','orta','sag'),
  (:'a','A','User','a_mc@test.local','he/him','erkek','1','orta','sag'),
  (:'b','B','User','b_mc@test.local','he/him','erkek','1','orta','sag'),
  (:'c','C','User','c_mc@test.local','he/him','erkek','1','orta','sag'),
  (:'d','D','User','d_mc@test.local','he/him','erkek','1','orta','sag'),
  (:'e','E','User','e_mc@test.local','he/him','erkek','1','orta','sag');

insert into public.match_requests
  (id, creator_id, type, target_id, category, format,
   proposed_date, proposed_time, court_id, expires_at, created_at)
values
  -- U→A (older)
  (:'req_ua',  :'u', 'direct_challenge', :'a', 'erkek_tek', 'bu_klasik',
   '2026-07-01','10:00',(select id from public.courts limit 1),
   now() + interval '7 days', now() - interval '3 days'),
  -- U→A (newer — should win deduplication)
  (:'req_ua2', :'u', 'direct_challenge', :'a', 'erkek_tek', 'bu_klasik',
   '2026-07-02','11:00',(select id from public.courts limit 1),
   now() + interval '7 days', now() - interval '36 hours'),
  -- B→U
  (:'req_bu',  :'b', 'direct_challenge', :'u', 'erkek_tek', 'bu_klasik',
   '2026-07-03','12:00',(select id from public.courts limit 1),
   now() + interval '7 days', now() - interval '2 days'),
  -- U creates open_call (C will apply)
  (:'req_uc',  :'u', 'open_call', null, 'erkek_tek', 'bu_klasik',
   '2026-07-04','13:00',(select id from public.courts limit 1),
   now() + interval '7 days', now() - interval '1 day'),
  -- D creates open_call (U will apply)
  (:'req_d',   :'d', 'open_call', null, 'erkek_tek', 'bu_klasik',
   '2026-07-05','14:00',(select id from public.courts limit 1),
   now() + interval '7 days', now() - interval '12 hours'),
  -- U→E (will be excluded by block)
  (:'req_ue',  :'u', 'direct_challenge', :'e', 'erkek_tek', 'bu_klasik',
   '2026-07-06','15:00',(select id from public.courts limit 1),
   now() + interval '7 days', now() - interval '6 hours');

insert into public.match_request_applications (request_id, applicant_id)
values
  (:'req_uc', :'c'),  -- C applies to U's open_call
  (:'req_d',  :'u');  -- U applies to D's open_call

insert into public.user_blocks (blocker_id, blocked_id)
values (:'u', :'e');

-- ── Activate caller context ────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"cccc0001-0000-0000-0000-000000000001"}';

-- Materialise once for multiple assertions.
create temporary table mc_results as
  select * from public.list_messageable_contacts();

-- ── Assertions ────────────────────────────────────────────────────────────────

-- 1. Exactly four contacts
select is(
  (select count(*)::int from mc_results),
  4,
  'list_messageable_contacts returns exactly 4 contacts (A B C D)');

-- 2. A present (U is creator of a direct_challenge targeting A)
select ok(
  (select exists(select 1 from mc_results where other_user_id = :'a'::uuid)),
  'A (direct_challenge target of U) appears as a contact');

-- 3. B present (B is creator of a direct_challenge targeting U)
select ok(
  (select exists(select 1 from mc_results where other_user_id = :'b'::uuid)),
  'B (creator of direct_challenge targeting U) appears as a contact');

-- 4. C present (C applied to U''s open_call)
select ok(
  (select exists(select 1 from mc_results where other_user_id = :'c'::uuid)),
  'C (applicant to U''s open_call) appears as a contact');

-- 5. D present (U applied to D''s open_call)
select ok(
  (select exists(select 1 from mc_results where other_user_id = :'d'::uuid)),
  'D (creator of open_call U applied to) appears as a contact');

-- 6. E excluded (U blocked E)
select ok(
  (select not exists(select 1 from mc_results where other_user_id = :'e'::uuid)),
  'E is excluded because U blocked them');

-- 7. Deduplication: U has two requests with A; req_ua2 (more recent) wins
select is(
  (select request_id from mc_results where other_user_id = :'a'::uuid),
  :'req_ua2'::uuid,
  'when U has two requests with A the most-recent request_id (req_ua2) is returned');

select * from finish();
rollback;
