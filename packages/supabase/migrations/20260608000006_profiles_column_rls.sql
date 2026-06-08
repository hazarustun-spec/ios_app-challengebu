-- Plan 5 Faz F code review (and pre-TestFlight backlog #1) flagged that
-- profiles.SELECT was open to every authenticated user via `using (true)`,
-- letting any caller pull `phone`, `email`, and `role` for every row with a
-- direct `supabase.from('profiles').select('*')`.
--
-- A naive `revoke select (phone, email, role)` does nothing while a
-- table-level GRANT SELECT exists (which Supabase grants by default), so we
-- have to revoke at the table level and re-grant the public/safe columns
-- explicitly. Postgres column-level GRANTs are evaluated before RLS, giving
-- us a row-policy-independent privacy gate.
--
-- The owner still needs phone/email/role for their own profile screen. A
-- SECURITY DEFINER RPC `get_my_profile()` scopes that to auth.uid() and
-- bypasses the column grants since SECURITY DEFINER executes as the owner.

revoke select on public.profiles from authenticated;
revoke select on public.profiles from anon;

grant select (
  user_id, first_name, last_name,
  pronoun, pronoun_custom,
  gender_category,
  department_id, class_year, show_class_year, show_department,
  skill_self_assessment, dominant_hand, availability_windows,
  avatar_url, status,
  created_at, updated_at
) on public.profiles to authenticated;

create or replace function public.get_my_profile()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(p) || jsonb_build_object(
    'departments', case
      when d.id is not null then jsonb_build_object('name', d.name)
      else null
    end
  )
  from public.profiles p
  left join public.departments d on d.id = p.department_id
  where p.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;
