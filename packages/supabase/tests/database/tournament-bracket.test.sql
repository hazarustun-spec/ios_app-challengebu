-- pgTAP tests for admin_reorder_bracket_seeds(tournament_id, seed_player_ids)
-- (20260610000004_admin_extensions.sql).
-- Covers: admin role guard, array-length validation, null-element rejection,
-- duplicate rejection, standings-membership check, doubles category guard,
-- the two-pass rank reorder, and the resulting audit_log entry.
-- Run: supabase test db tests/database/tournament-bracket.test.sql
begin;
select plan(8);

-- ── Fixtures ────────────────────────────────────────────────────────────────
\set admin 'aaaa9901-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set p1    '11119901-1111-1111-1111-111111111111'
\set p2    '22229901-2222-2222-2222-222222222222'
\set p3    '33339901-3333-3333-3333-333333333333'
\set p4    '44449901-4444-4444-4444-444444444444'
\set p5    '55559901-5555-5555-5555-555555555555'
\set p6    '66669901-6666-6666-6666-666666666666'
\set p7    '77779901-7777-7777-7777-777777777777'
\set p8    '88889901-8888-8888-8888-888888888888'

insert into auth.users (id)
values (:'admin'), (:'p1'), (:'p2'), (:'p3'), (:'p4'),
       (:'p5'), (:'p6'), (:'p7'), (:'p8');

insert into public.profiles
  (user_id, role, first_name, last_name, email, pronoun, gender_category,
   class_year, skill_self_assessment, dominant_hand)
values
  (:'admin','admin','Admin','TB','admin_tb@test.local','they/them','erkek','1','orta','sag'),
  (:'p1','player','P1','TB','p1_tb@test.local','he/him','erkek','1','orta','sag'),
  (:'p2','player','P2','TB','p2_tb@test.local','he/him','erkek','1','orta','sag'),
  (:'p3','player','P3','TB','p3_tb@test.local','he/him','erkek','2','orta','sag'),
  (:'p4','player','P4','TB','p4_tb@test.local','he/him','erkek','2','orta','sag'),
  (:'p5','player','P5','TB','p5_tb@test.local','he/him','erkek','3','orta','sag'),
  (:'p6','player','P6','TB','p6_tb@test.local','she/her','kadin','3','orta','sag'),
  (:'p7','player','P7','TB','p7_tb@test.local','she/her','kadin','4','orta','sag'),
  (:'p8','player','P8','TB','p8_tb@test.local','she/her','kadin','4','orta','sag');

-- One season in finale status; a singles and a doubles tournament.
insert into public.seasons
  (id, name, year, starts_at, ends_at, finale_starts_at, finale_ends_at, status)
values
  ('bbbb9901-0000-0000-0000-000000000001'::uuid,
   'guz', 2023,
   now() - interval '60 days', now() + interval '5 days',
   now() - interval '5 days',  now() - interval '1 day',
   'finale');

insert into public.tournaments (id, season_id, category, bracket_size, status)
values
  -- singles: target for reorder operations
  ('cccc9901-0000-0000-0000-000000000001'::uuid,
   'bbbb9901-0000-0000-0000-000000000001'::uuid,
   'erkek_tek', 8, 'seeded'),
  -- doubles: must be rejected by the function
  ('cccc9901-0000-0000-0000-000000000002'::uuid,
   'bbbb9901-0000-0000-0000-000000000001'::uuid,
   'erkek_cift', 8, 'seeded');

-- Eight players seeded 1-8 in season standings for the singles tournament.
insert into public.season_standings
  (season_id, profile_id, category, final_rating, rank, matches_played)
values
  ('bbbb9901-0000-0000-0000-000000000001'::uuid, :'p1', 'erkek_tek', 1600, 1, 12),
  ('bbbb9901-0000-0000-0000-000000000001'::uuid, :'p2', 'erkek_tek', 1580, 2, 11),
  ('bbbb9901-0000-0000-0000-000000000001'::uuid, :'p3', 'erkek_tek', 1560, 3, 10),
  ('bbbb9901-0000-0000-0000-000000000001'::uuid, :'p4', 'erkek_tek', 1540, 4, 10),
  ('bbbb9901-0000-0000-0000-000000000001'::uuid, :'p5', 'erkek_tek', 1520, 5,  9),
  ('bbbb9901-0000-0000-0000-000000000001'::uuid, :'p6', 'erkek_tek', 1500, 6,  9),
  ('bbbb9901-0000-0000-0000-000000000001'::uuid, :'p7', 'erkek_tek', 1480, 7,  8),
  ('bbbb9901-0000-0000-0000-000000000001'::uuid, :'p8', 'erkek_tek', 1460, 8,  8);

-- ── Guard: non-admin caller is rejected with 42501 ───────────────────────────
set local request.jwt.claims = '{"sub":"11119901-1111-1111-1111-111111111111"}';
select throws_ok(
  $$ select public.admin_reorder_bracket_seeds(
       'cccc9901-0000-0000-0000-000000000001'::uuid,
       array['11119901-1111-1111-1111-111111111111',
             '22229901-2222-2222-2222-222222222222',
             '33339901-3333-3333-3333-333333333333',
             '44449901-4444-4444-4444-444444444444',
             '55559901-5555-5555-5555-555555555555',
             '66669901-6666-6666-6666-666666666666',
             '77779901-7777-7777-7777-777777777777',
             '88889901-8888-8888-8888-888888888888']::uuid[]
     ) $$,
  '42501',
  'Admin role required',
  'non-admin caller is rejected with 42501');

-- ── Switch to admin for all remaining tests ──────────────────────────────────
set local request.jwt.claims = '{"sub":"aaaa9901-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

-- Array shorter than 8 → 22023
select throws_ok(
  $$ select public.admin_reorder_bracket_seeds(
       'cccc9901-0000-0000-0000-000000000001'::uuid,
       array['11119901-1111-1111-1111-111111111111',
             '22229901-2222-2222-2222-222222222222']::uuid[]
     ) $$,
  '22023',
  'Expected exactly 8 seed player IDs (got 2)',
  'array shorter than 8 elements raises 22023');

-- NULL element in the array → 22023
select throws_ok(
  $$ select public.admin_reorder_bracket_seeds(
       'cccc9901-0000-0000-0000-000000000001'::uuid,
       array['11119901-1111-1111-1111-111111111111',
             '22229901-2222-2222-2222-222222222222',
             '33339901-3333-3333-3333-333333333333',
             '44449901-4444-4444-4444-444444444444',
             '55559901-5555-5555-5555-555555555555',
             '66669901-6666-6666-6666-666666666666',
             '77779901-7777-7777-7777-777777777777',
             null]::uuid[]
     ) $$,
  '22023',
  'seed_player_ids contains NULL',
  'array with a NULL element raises 22023');

-- Duplicate UUIDs → 22023
select throws_ok(
  $$ select public.admin_reorder_bracket_seeds(
       'cccc9901-0000-0000-0000-000000000001'::uuid,
       array['11119901-1111-1111-1111-111111111111',
             '11119901-1111-1111-1111-111111111111',
             '33339901-3333-3333-3333-333333333333',
             '44449901-4444-4444-4444-444444444444',
             '55559901-5555-5555-5555-555555555555',
             '66669901-6666-6666-6666-666666666666',
             '77779901-7777-7777-7777-777777777777',
             '88889901-8888-8888-8888-888888888888']::uuid[]
     ) $$,
  '22023',
  'seed_player_ids contains duplicates',
  'array with a duplicate UUID raises 22023');

-- One UUID not in season_standings (99…99 has no standings row) → P0002
select throws_ok(
  $$ select public.admin_reorder_bracket_seeds(
       'cccc9901-0000-0000-0000-000000000001'::uuid,
       array['11119901-1111-1111-1111-111111111111',
             '22229901-2222-2222-2222-222222222222',
             '33339901-3333-3333-3333-333333333333',
             '44449901-4444-4444-4444-444444444444',
             '55559901-5555-5555-5555-555555555555',
             '66669901-6666-6666-6666-666666666666',
             '77779901-7777-7777-7777-777777777777',
             '99999999-9999-9999-9999-999999999999']::uuid[]
     ) $$,
  'P0002',
  'One or more seed_player_ids not in season standings',
  'UUID not present in season standings raises P0002');

-- Doubles tournament → 0A000 (not yet supported path)
select throws_ok(
  $$ select public.admin_reorder_bracket_seeds(
       'cccc9901-0000-0000-0000-000000000002'::uuid,
       array['11119901-1111-1111-1111-111111111111',
             '22229901-2222-2222-2222-222222222222',
             '33339901-3333-3333-3333-333333333333',
             '44449901-4444-4444-4444-444444444444',
             '55559901-5555-5555-5555-555555555555',
             '66669901-6666-6666-6666-666666666666',
             '77779901-7777-7777-7777-777777777777',
             '88889901-8888-8888-8888-888888888888']::uuid[]
     ) $$,
  '0A000',
  'Doubles bracket reorder not yet supported (singles only)',
  'doubles category tournament raises 0A000');

-- ── Happy path: reverse-order reseeding ─────────────────────────────────────
-- Pass [p8,p7,…,p1] so that the previously lowest-rated player gets seed 1.
select public.admin_reorder_bracket_seeds(
  'cccc9901-0000-0000-0000-000000000001'::uuid,
  array['88889901-8888-8888-8888-888888888888',
        '77779901-7777-7777-7777-777777777777',
        '66669901-6666-6666-6666-666666666666',
        '55559901-5555-5555-5555-555555555555',
        '44449901-4444-4444-4444-444444444444',
        '33339901-3333-3333-3333-333333333333',
        '22229901-2222-2222-2222-222222222222',
        '11119901-1111-1111-1111-111111111111']::uuid[]
);

select is(
  (select rank from public.season_standings
   where season_id = 'bbbb9901-0000-0000-0000-000000000001'::uuid
     and category = 'erkek_tek'
     and profile_id = '88889901-8888-8888-8888-888888888888'),
  1,
  'after reorder the first player in the seed array receives rank 1');

-- Audit log must record the reorder action attributed to the admin caller.
select is(
  (select count(*)::int from public.audit_log
   where entity_id   = 'cccc9901-0000-0000-0000-000000000001'::uuid
     and entity_type = 'tournament'
     and action      = 'reorder_bracket'),
  1,
  'audit_log row with action=reorder_bracket created after successful call');

select * from finish();
rollback;
