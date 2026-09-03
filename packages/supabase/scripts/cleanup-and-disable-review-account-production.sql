-- =============================================================================
-- Full post-approval cleanup — remove ALL review demo data AND disable the
-- review-account shortcut in PRODUCTION.
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor after the app is approved AND you
-- have given Apple a safe window (48 hours recommended) in case they spot-
-- check the app.
--
-- What this does
--   1. Deletes seeded matches + pending challenges (fixed uuids bbbb*, cccc*,
--      dddd*). matches store player_ids as uuid[] with no FK, so cascade from
--      profiles cannot reach them — they must go explicitly.
--   2. Deletes any lingering matches / match_requests where the reviewer is a
--      party (same uuid[] reason).
--   3. Deletes seeded opponent auth.users → CASCADE clears profiles, elo_ratings,
--      notifications, push_tokens, notification_preferences, user_blocks,
--      user_reports, match_request_applications, match_score_submissions.
--   4. Deletes appreview42@proton.me auth.users → same CASCADE chain.
--   5. Drops the review-only exception in void_unplayed_matches().
--   6. Drops reset_review_account() so the reset function is gone.
--
-- After running this script, ALSO disable the review-login Edge Function
-- (see the "Manual step" note at the bottom) so nothing on the server side
-- can create a shortcut session for the review mailbox again.
--
-- Idempotent: safe to re-run.
-- =============================================================================

do $$
declare
  v_rev uuid;
begin
  select id into v_rev from auth.users
   where lower(email) = 'appreview42@proton.me' limit 1;

  -- 1. Seeded matches + pending challenges — uuid[] player columns bypass the
  --    profile-CASCADE chain, so they must be deleted explicitly, and matches
  --    must go before match_requests (matches.match_request_id → match_requests).
  delete from public.matches
   where id::text like 'bbbb%' or id::text like 'cccc%';
  delete from public.match_requests
   where id::text like 'dddd%';

  -- 2. Any lingering matches / match_requests where the reviewer is a party.
  --    Uuid[] player columns still have no FK; the same rule applies.
  if v_rev is not null then
    delete from public.matches
     where team_a_player_ids @> array[v_rev]
        or team_b_player_ids @> array[v_rev];
    delete from public.match_requests
     where creator_id = v_rev or target_id = v_rev;
  end if;

  -- 3. Any leftover match_requests naming the seeded opponents (safety net).
  delete from public.match_requests
   where creator_id in (select user_id from public.profiles
                         where email like 'seed-opp-%@challengebu-review.invalid')
      or target_id in (select user_id from public.profiles
                         where email like 'seed-opp-%@challengebu-review.invalid');

  -- 4. Seeded opponent auth.users → CASCADE clears their profile + everything
  --    downstream (elo_ratings, notifications, push_tokens, prefs, blocks,
  --    reports, applications, score submissions all cascade from profiles).
  delete from auth.users
   where email like 'seed-opp-%@challengebu-review.invalid';

  -- 5. Reviewer's own auth.users row → same CASCADE chain.
  if v_rev is not null then
    delete from auth.users where id = v_rev;
  end if;

  raise notice 'Post-approval cleanup complete: opponents + reviewer + demo data all gone';
end $$;

-- 6. Drop the review-only exception in void_unplayed_matches().
--    20260808000001 kept cccc0001 startable for the length of a review; with
--    the demo data gone the exception has nothing to protect, and leaving it
--    would quietly exempt that uuid forever.
create or replace function public.void_unplayed_matches()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches
     set status        = 'voided',
         winner_team   = 'void',
         voided_reason = 'Oynanmadı',
         updated_at    = now()
   where status = 'awaiting_confirmation'
     and winner_team is null
     and played_at < now() - interval '24 hours';
end;
$$;
revoke all on function public.void_unplayed_matches() from public;

-- 7. Drop the per-login demo reset (20260809000001). review-login still calls
--    it, and .rpc() on a missing function only logs — but with no reviewer
--    auth row left there is nothing to reset anyway.
drop function if exists public.reset_review_account();

-- =============================================================================
-- Verify — every count MUST be zero.
-- =============================================================================
select 'seeded_profiles_left'   as check, count(*)::text as n
  from public.profiles where email like 'seed-opp-%@challengebu-review.invalid'
union all
select 'reviewer_auth_left',    count(*)::text
  from auth.users where lower(email) = 'appreview42@proton.me'
union all
select 'reviewer_profile_left', count(*)::text
  from public.profiles where lower(email) = 'appreview42@proton.me'
union all
select 'seeded_matches_left',   count(*)::text from public.matches
  where id::text like 'bbbb%' or id::text like 'cccc%'
union all
select 'seeded_requests_left',  count(*)::text from public.match_requests
  where id::text like 'dddd%'
union all
select 'reset_fn_exists (should be 0)', count(*)::text
  from pg_proc where proname = 'reset_review_account';

-- =============================================================================
-- Manual step — DISABLE the review-login Edge Function
-- =============================================================================
-- The Edge Function `review-login` still lives on the Supabase runtime. Even
-- with the auth.users row deleted, the function's hard-coded allow-list would
-- happily create the row again if anyone calls it (it uses the service role).
-- Kill it from your terminal:
--
--   supabase functions delete review-login --project-ref zbjkauljjdosyuwguuhv
--
-- Or, if you want to keep the code around but stop it from responding, blank
-- the shared secret:
--
--   Dashboard → Project Settings → Edge Functions → Secrets →
--     set REVIEW_OTP_CODE to an empty string (or delete it).
--
-- Either way, verify with a curl that the function now returns 401/404:
--
--   curl -i -X POST \
--     'https://zbjkauljjdosyuwguuhv.supabase.co/functions/v1/review-login' \
--     -H 'Content-Type: application/json' \
--     -d '{"email":"appreview42@proton.me","code":"424242"}'
