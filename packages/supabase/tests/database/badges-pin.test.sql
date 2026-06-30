-- pgTAP tests for pin_badges(badge_ids uuid[])
-- (20260608000004_pin_badges_rpc.sql).
-- Covers: authentication guard, max-3 pin limit, happy-path pin,
-- atomic pin-set replacement, and empty-array clear.
-- Note: the badge AWARD logic lives in the award-badges Edge Function (TypeScript)
--       and is not a SQL RPC — it is covered by Deno tests, not here.
-- Run: supabase test db tests/database/badges-pin.test.sql
begin;
select plan(5);

-- ── Fixtures ────────────────────────────────────────────────────────────────
\set p1 '11119902-1111-1111-1111-111111111111'

insert into auth.users (id) values (:'p1');
insert into public.profiles
  (user_id, first_name, last_name, email, pronoun, gender_category,
   class_year, skill_self_assessment, dominant_hand)
values
  (:'p1', 'Pat', 'BP', 'p1_bp@test.local', 'he/him', 'erkek', '1', 'orta', 'sag');

-- Grant p1 three non-seasonal badges via direct INSERT (postgres role bypasses RLS).
insert into public.user_badges (profile_id, badge_id)
  select :'p1'::uuid, id from public.badges where code = 'milestone_1_match';
insert into public.user_badges (profile_id, badge_id)
  select :'p1'::uuid, id from public.badges where code = 'wins_1';
insert into public.user_badges (profile_id, badge_id)
  select :'p1'::uuid, id from public.badges where code = 'milestone_3_matches';

-- ── Guard: unauthenticated call raises 28000 ─────────────────────────────────
set local request.jwt.claims = '{}';
select throws_ok(
  $$ select public.pin_badges(array[]::uuid[]) $$,
  '28000',
  'Not authenticated',
  'unauthenticated call (no JWT sub) raises 28000');

-- ── Guard: pinning more than 3 badges raises 22023 ───────────────────────────
set local request.jwt.claims = '{"sub":"11119902-1111-1111-1111-111111111111"}';
select throws_ok(
  $$ select public.pin_badges(
       array(select id from public.badges
             where code in ('milestone_1_match','wins_1',
                            'milestone_3_matches','milestone_5_matches'))
     ) $$,
  '22023',
  'En fazla 3 rozet seçebilirsin',
  'passing 4 badge IDs raises 22023 (max-3 limit enforced)');

-- ── Happy path: pin 2 badges ─────────────────────────────────────────────────
select public.pin_badges(
  array(select id from public.badges
        where code in ('milestone_1_match', 'wins_1')
        order by code)
);
select is(
  (select count(*)::int from public.user_badges
   where profile_id = :'p1' and pinned_at is not null),
  2,
  'pinning 2 owned badges sets pinned_at on exactly 2 user_badges rows');

-- ── Re-pin atomically replaces the entire pin set ────────────────────────────
-- Pin a different badge; the two previously-pinned badges must be cleared.
select public.pin_badges(
  array(select id from public.badges where code = 'milestone_3_matches')
);
select is(
  (select count(*)::int from public.user_badges
   where profile_id = :'p1' and pinned_at is not null),
  1,
  're-pinning a single badge clears old pins and sets only the new one (count=1)');

-- ── Empty array clears all pins ───────────────────────────────────────────────
select public.pin_badges(array[]::uuid[]);
select is(
  (select count(*)::int from public.user_badges
   where profile_id = :'p1' and pinned_at is not null),
  0,
  'pinning an empty array clears all existing pins (count=0)');

select * from finish();
rollback;
