-- Plan 8 Phase G — surface `profiles.suspended_until` to the admin user
-- detail screen.
--
-- The Plan 8 Phase A4 migration (20260610000004_admin_extensions.sql) added
-- `profiles.suspended_until` so admins can issue time-bound suspensions, and
-- the daily `expire_suspensions()` cron flips status back to `active` once it
-- elapses. The admin user-detail screen needs to display the active expiry
-- (e.g. "askıda · 27 Haz'a kadar") and also tell apart "permanent ban" from
-- "30-day suspend".
--
-- `admin_get_profile_detail(uuid)` (see
-- 20260609000008_admin_profile_rpcs.sql) is the only path the client uses to
-- read these columns (`profiles.email` / `phone` / `role` are revoked from
-- `authenticated` at the column-grant level). Postgres does not let
-- `CREATE OR REPLACE FUNCTION` change the RETURNS shape, so we drop+recreate
-- with the new column appended at the end of the row.

drop function if exists public.admin_get_profile_detail(uuid);

create function public.admin_get_profile_detail(target_user_id uuid)
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  role user_role,
  status user_status,
  gender_category gender_category,
  last_match_at timestamptz,
  created_at timestamptz,
  suspended_until timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin role required' using errcode = '42501';
  end if;

  return query
    select
      p.user_id,
      p.first_name,
      p.last_name,
      p.email,
      p.phone,
      p.role,
      p.status,
      p.gender_category,
      p.last_match_at,
      p.created_at,
      p.suspended_until
    from public.profiles p
    where p.user_id = target_user_id;
end;
$$;

revoke all on function public.admin_get_profile_detail(uuid) from public;
grant execute on function public.admin_get_profile_detail(uuid) to authenticated;
