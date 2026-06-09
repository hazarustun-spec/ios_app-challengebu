-- Plan 7 Faz F prerequisites:
--   1. Admin Kullanıcı Yönetimi screens need to read profile fields that the
--      Plan 5 column-level RLS (20260608000006_profiles_column_rls.sql) revoked
--      from `authenticated` — namely `email`, `phone`, `role`. The original
--      revoke was a privacy gate for non-admins; admins legitimately need these
--      fields. Rather than re-grant the columns table-wide (which would defeat
--      the privacy gate), we expose two SECURITY DEFINER RPCs that are
--      admin-only and bypass the column grants by executing as the owner.
--
--   2. The Finale Bracket Yönetimi screen's `useVoidBracketMatch` mutation
--      writes an `audit_log` row directly from the client. The original
--      `audit_log` migration (20260606000009_audit_announcements.sql) only
--      created a SELECT policy; INSERTs from authenticated clients were blocked
--      by RLS. We add a narrow admin-only INSERT policy with a `with check`
--      that pins `actor_id` to `auth.uid()` so admins cannot impersonate other
--      actors through this surface.

create or replace function public.admin_list_profiles(
  search text default null,
  lim integer default 50
)
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  role user_role,
  status user_status
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
      p.role,
      p.status
    from public.profiles p
    where
      search is null
      or search = ''
      or p.first_name ilike '%' || search || '%'
      or p.last_name ilike '%' || search || '%'
      or p.email ilike '%' || search || '%'
    order by p.first_name asc
    limit greatest(lim, 1);
end;
$$;

revoke all on function public.admin_list_profiles(text, integer) from public;
grant execute on function public.admin_list_profiles(text, integer) to authenticated;

create or replace function public.admin_get_profile_detail(target_user_id uuid)
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
  created_at timestamptz
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
      p.created_at
    from public.profiles p
    where p.user_id = target_user_id;
end;
$$;

revoke all on function public.admin_get_profile_detail(uuid) from public;
grant execute on function public.admin_get_profile_detail(uuid) to authenticated;

-- Allow admins to write audit_log rows from the client (used by
-- useVoidBracketMatch). The `with check (actor_id = auth.uid() or actor_id is
-- null)` guard prevents an admin from forging audit rows attributed to another
-- user. We do NOT add an UPDATE/DELETE policy — audit rows are append-only.
create policy "Admins insert audit log"
  on public.audit_log for insert
  to authenticated
  with check (
    public.is_admin()
    and (actor_id is null or actor_id = auth.uid())
  );
