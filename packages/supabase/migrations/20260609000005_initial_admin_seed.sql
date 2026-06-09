-- Initial admin seed.
--
-- Replace the placeholder email below with the operator's BÜ email or
-- personal email (admin accounts are exempt from the BÜ domain restriction
-- per spec 7.1) before deploying to staging or production.
--
-- Re-running this migration is safe: it only flips the role to 'admin'
-- if a profile with the target email exists and is currently 'player'.
--
-- The first time the operator signs up, this migration will be a no-op
-- (no profile yet). After the operator finishes onboarding, run:
--   supabase db push
-- or rerun this migration via `supabase migration up` on the staging branch
-- to flip the role.

do $$
declare
  target_email text := 'CHANGE_ME_BEFORE_DEPLOY@example.com';
begin
  if target_email = 'CHANGE_ME_BEFORE_DEPLOY@example.com' then
    raise notice 'initial-admin-seed: placeholder email not replaced, skipping';
    return;
  end if;

  update public.profiles
     set role = 'admin'
   where email = target_email
     and role <> 'admin';

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  select user_id, 'grant_admin_via_seed', 'profile', user_id, jsonb_build_object('email', target_email)
    from public.profiles
   where email = target_email
     and role = 'admin';
end
$$;
