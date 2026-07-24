-- =============================================================================
-- Cleanup — remove ALL App Store review demo data from PRODUCTION.
-- =============================================================================
-- Run AFTER the app is approved and before/around public launch, so the seeded
-- demo opponents + matches do not pollute the real ladder.
--
-- Removes everything created by seed-review-account-production.sql EXCEPT the
-- reviewer's own auth.users row (kept, in case you still need review access).
-- Deleting the opponent auth.users rows cascades to their profiles + elo_ratings.
-- Matches reference profiles via uuid[] (no FK), so delete them explicitly first.
-- Idempotent: safe to run multiple times.
-- =============================================================================

-- 1. Seeded matches (fixed-prefix ids) — startable + confirmed demo matches.
delete from public.matches
 where id::text like 'bbbb%' or id::text like 'cccc%';

-- 2. Seeded pending challenge(s).
delete from public.match_requests
 where id::text like 'dddd%';

-- 3. Any leftover match_requests created/targeting the seeded opponents.
delete from public.match_requests
 where creator_id in (select user_id from public.profiles
                       where email like 'seed-opp-%@challengebu-review.invalid')
    or target_id in (select user_id from public.profiles
                       where email like 'seed-opp-%@challengebu-review.invalid');

-- 4. Seeded opponent auth users → cascades to profiles + elo_ratings
--    (profiles.user_id and elo_ratings.profile_id are ON DELETE CASCADE).
delete from auth.users
 where email like 'seed-opp-%@challengebu-review.invalid';

-- Verify (all counts should be 0) --------------------------------------------
select 'seeded_profiles_left' as check, count(*)::text as n
  from public.profiles where email like 'seed-opp-%@challengebu-review.invalid'
union all
select 'seeded_matches_left', count(*)::text from public.matches
  where id::text like 'bbbb%' or id::text like 'cccc%'
union all
select 'seeded_requests_left', count(*)::text from public.match_requests
  where id::text like 'dddd%';
