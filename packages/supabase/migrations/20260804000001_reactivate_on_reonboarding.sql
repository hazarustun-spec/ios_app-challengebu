-- Re-activate an anonymized profile when its owner re-onboards.
--
-- Background
-- ----------
-- `anonymize-account` (Apple guideline 5.1.1(v) in-app account deletion)
-- scrubs the profile in place and sets `status = 'anonymized'`, keeping the
-- row so historical matches and ELO ratings retain a valid foreign key
-- (auth.users cannot be deleted — profiles.user_id is ON DELETE CASCADE).
--
-- The auth user itself survives, so the same person can sign in again with
-- the same email. When they do, the app must send them back through
-- onboarding rather than dropping them into the app on a tombstone profile.
--
-- The client cannot restore `status` itself:
--
--   20260619000001_security_hardening.sql:18
--   revoke update (role, status, email, kvkk_accepted_at)
--     on public.profiles from authenticated;
--
-- So without this trigger the app would show onboarding, the user would
-- complete it, `status` would stay 'anonymized', and onboarding would be
-- shown again — an infinite loop. This trigger closes that path.
--
-- Scope: fires ONLY when the previous status was 'anonymized'. Moderation
-- states ('suspended', 'banned') and the inactivity lifecycle states
-- ('frozen_30', 'hibernating_60', 'inactive_90') are untouched — a suspended
-- user must not be able to clear their suspension by editing their name.

create or replace function public.reactivate_on_reonboarding()
returns trigger
language plpgsql
as $$
begin
  -- Only a tombstoned profile can be revived, and only by supplying a real
  -- name (which is exactly what the onboarding wizard writes).
  if old.status = 'anonymized'
     and coalesce(new.first_name, '') <> ''
     and coalesce(new.first_name, '') is distinct from coalesce(old.first_name, '')
  then
    new.status := 'active';
  end if;
  return new;
end;
$$;

alter function public.reactivate_on_reonboarding() set search_path = public;
revoke all on function public.reactivate_on_reonboarding() from public;

drop trigger if exists trg_reactivate_on_reonboarding on public.profiles;

create trigger trg_reactivate_on_reonboarding
  before update on public.profiles
  for each row
  execute function public.reactivate_on_reonboarding();
