-- ⛔ DO NOT RUN — SUPERSEDED, DESTRUCTIVE AGAINST LIVE DATA (5 Sep 2026)
--
-- This script belongs to the pre-launch era, when production held nothing but
-- the review account and seeded demo opponents. The app is live now and has
-- real players; anything in here that wipes or re-seeds profiles will destroy
-- their accounts, matches and ELO history.
--
-- The review account is permanent infrastructure as of migration
-- 20260905000001_demo_account_visibility.sql: profiles.is_demo hides it from
-- real players via RLS, and review-login calls reset_review_account() on every
-- sign-in. Nothing needs seeding or cleaning up per release any more.
--
-- Kept only as a record of how the pre-launch review data was built.

-- Reset the App Review account so the reviewer sees the FULL onboarding wizard
-- on next sign-in (Guideline 2.1 — Apple wants the whole onboarding shown).
--
-- The app derives `onboardingComplete = status<>null AND first_name.length>0`
-- (mobile/lib/auth-bootstrap.ts). Blanking first_name/last_name flips the
-- reviewer back to "not onboarded" WITHOUT deleting the pre-seeded ladder,
-- ELO history, matches, or pending challenge (those reference user_id, not the
-- name). After the reviewer completes onboarding once, the app writes a real
-- name and they reach the populated app.
--
-- Run in the Supabase SQL editor (production). Idempotent — safe to re-run.
-- Note: on the test device, do a clean reinstall (or sign out) before recording
-- so the local onboarding draft (expo-secure-store) is empty and the wizard
-- starts at step 1 (name).

-- Match on auth.users.id, NOT profiles.email: the profile row's `email`
-- column may differ from the reviewer's auth email (onboarding writes
-- user.email, which is not guaranteed to equal the login address), so a
-- `where profiles.email = ...` update can match 0 rows. The auth.users join
-- is authoritative.
update public.profiles
   set first_name = '',
       last_name  = ''
 where user_id in (
   select id from auth.users where lower(email) = 'appreview42@proton.me'
 );

-- Verify: onboarding_complete should now be false.
select p.user_id,
       p.email as profile_email,
       u.email as auth_email,
       p.first_name,
       p.last_name,
       p.status,
       (p.status is not null and length(coalesce(p.first_name, '')) > 0) as onboarding_complete
  from public.profiles p
  join auth.users u on u.id = p.user_id
 where lower(u.email) = 'appreview42@proton.me';
