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

update public.profiles
   set first_name = '',
       last_name  = ''
 where lower(email) = 'appreview42@proton.me';

-- Verify: onboarding_complete should now be false.
select email,
       first_name,
       last_name,
       status,
       (status is not null and length(coalesce(first_name, '')) > 0) as onboarding_complete
  from public.profiles
 where lower(email) = 'appreview42@proton.me';
