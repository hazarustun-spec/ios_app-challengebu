-- Drop pronoun_custom_when_other. It rejects the app's own "prefer not to say".
--
-- 20260606000001_profiles.sql shipped:
--
--   constraint pronoun_custom_when_other check (
--     (pronoun = 'other' and pronoun_custom is not null) or pronoun <> 'other'
--   )
--
-- written for a design where picking "other" meant typing your own pronoun. The
-- app that got built never asks for that text. The onboarding wizard's fourth
-- option is labelled "Diğer / belirtmek istemiyorum" — prefer not to say — there
-- is no free-text field behind it on any screen, and no client ever sends
-- pronoun_custom on the way in. So every write that sets pronoun = 'other'
-- fails, in production, with:
--
--   23514  new row for relation "profiles" violates check constraint
--          "pronoun_custom_when_other"
--
-- Three live paths hit it:
--
--   1. Onboarding (hooks/use-submit-onboarding.ts). Choosing "Diğer /
--      belirtmek istemiyorum" makes "Onayla ve bitir" fail permanently — the
--      account is never created. This is what App Review reported against
--      1.1.0 (27) as "App displayed an error when we were trying to sign up"
--      (Guideline 2.1(a), submission 0a4f4f32-7fea-4122-8822-337222cae41d).
--   2. Profile edit (app/profile/edit.tsx) — switching an existing profile to
--      "other" fails the same way.
--   3. Account deletion (functions/anonymize-account) — it nulls pronoun_custom
--      without touching pronoun, so a user whose pronoun is 'other' cannot
--      delete their account at all. That one is Guideline 5.1.1(v).
--
-- Nothing replaces it. The inverse rule ("custom text only when pronoun is
-- other") would be the defensible half to keep, but profile edit deliberately
-- preserves pronoun_custom across other pronouns, and a stray string in a
-- column no screen reads unless pronoun = 'other' is not worth another way for
-- a profile write to fail.

alter table public.profiles
  drop constraint if exists pronoun_custom_when_other;

comment on column public.profiles.pronoun_custom is
  'Free-text pronoun. Reserved: no screen collects it today — the onboarding '
  '"other" option means "prefer not to say" and leaves this null.';
