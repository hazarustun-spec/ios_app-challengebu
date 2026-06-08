-- The profiles privacy gate (Plan 5 Faz F + this view):
--   Layer 1: column GRANT/REVOKE on public.profiles (20260608000006).
--     `revoke select on profiles from authenticated` + targeted re-grants on the
--     safe columns means phone/email/role return "permission denied for table
--     profiles" at the Postgres level, regardless of RLS.
--   Layer 2: this view names exactly the columns intended to be public.
--     Future code that needs other-user data should read from public_profiles
--     instead of from profiles directly, so the privacy boundary is a typed
--     surface rather than an implicit grant list.
--   Layer 3: get_my_profile() SECURITY DEFINER RPC for the owner's own row.
--
-- Adding/removing safe columns: update both the grant list in
-- 20260608000006_profiles_column_rls.sql AND this view, in one migration.

create or replace view public.public_profiles as
select
  user_id,
  first_name,
  last_name,
  pronoun,
  pronoun_custom,
  gender_category,
  department_id,
  class_year,
  show_class_year,
  show_department,
  skill_self_assessment,
  dominant_hand,
  availability_windows,
  avatar_url,
  status,
  created_at,
  updated_at
from public.profiles;

grant select on public.public_profiles to authenticated, anon;
