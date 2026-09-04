-- Permanent App Store review account, hidden from real players.
--
-- Why
-- ---
-- The app gates sign-up to .edu.tr addresses, so an Apple reviewer can never
-- sign in with their own mailbox. Every submission therefore needs a working
-- demo account — not just the first one. The post-approval cleanup deleted
-- that account (and the review-login shortcut) on the assumption it was
-- one-off, which meant the very next submission had nothing to hand Apple.
--
-- So the account becomes permanent infrastructure. The only thing that has to
-- change is that real players must not see a fake "reviewer" sitting in their
-- ladder, their opponent picker, or their message contacts.
--
-- How
-- ---
-- A single `is_demo` flag on profiles, enforced in the RLS SELECT policy so
-- every read path inherits it at once — public_profiles, usePlayers, the
-- opponent picker, messageable contacts, everything. Three-way visibility:
--
--   • real players    → see other real players, never the demo account
--   • the demo account→ sees every real player (a populated, live ladder,
--                       which is what Guideline 2.1 asks for) and itself
--   • admins          → see everything, so moderation is not blind
--
-- No seeded fake opponents this time. The reviewer explores a real ladder.

alter table public.profiles
  add column if not exists is_demo boolean not null default false;

comment on column public.profiles.is_demo is
  'True only for the App Store review account. Hidden from real players by the '
  'profiles SELECT policy; see 20260905000001_demo_account_visibility.sql.';

-- Partial index: the policy tests is_demo on every profile read, and the
-- demo rows are a handful out of the whole table.
create index if not exists profiles_is_demo_idx
  on public.profiles (is_demo)
  where is_demo = true;

-- Replace the blanket "everyone sees everyone" SELECT policy.
drop policy if exists "Profiles are viewable by all authenticated users" on public.profiles;

create policy "Profiles are viewable by all authenticated users"
  on public.profiles for select
  to authenticated
  using (
    is_demo = false
    or user_id = auth.uid()   -- the demo account still sees itself
    or public.is_admin()      -- moderation must not be blind (SECURITY DEFINER,
                              -- so this does not recurse through the policy)
  );

-- public_profiles is `security_invoker = on`, so it already inherits the policy
-- above. Recreating it here only to restate that dependency explicitly — the
-- column list is unchanged from 20260619000001_security_hardening.sql.
drop view if exists public.public_profiles;

create or replace view public.public_profiles
  with (security_invoker = on)
as
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

-- Flag the review account if it already exists. review-login creates the
-- auth.users row on first sign-in, and reset_review_account() below sets the
-- flag from then on, so this is only for a re-run against an existing row.
update public.profiles p
   set is_demo = true
  from auth.users u
 where u.id = p.user_id
   and lower(u.email) = 'appreview42@proton.me';

-- ---------------------------------------------------------------------------
-- reset_review_account() — recreated, minus the seeded match data.
-- ---------------------------------------------------------------------------
-- review-login calls this before handing back a session. The previous version
-- also restored seeded opponents, a startable match and a pending challenge;
-- none of that exists any more, so this now only does two things:
--
--   1. makes sure the profile row exists, is active, and is flagged is_demo
--   2. blanks first_name/last_name so the reviewer walks the full onboarding
--      wizard on every sign-in — Apple asked to see it, and a reviewer who
--      deleted the account last time (Guideline 5.1.1(v) is routinely tested)
--      would otherwise arrive at a tombstoned profile
--
-- Scope is the one hard-coded review mailbox, resolved through auth.users
-- because a deleted account no longer carries its address on the profile row.
create or replace function public.reset_review_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rev uuid;
begin
  select id into v_rev from auth.users
   where lower(email) = 'appreview42@proton.me' limit 1;
  if v_rev is null then
    return;
  end if;

  insert into public.profiles (
    user_id, role, first_name, last_name, email,
    pronoun, gender_category, class_year,
    show_department, show_class_year,
    skill_self_assessment, dominant_hand, availability_windows,
    status, kvkk_accepted_at, is_demo
  ) values (
    v_rev, 'player', '', '', 'appreview42@proton.me',
    'they/them', 'open_only', '3',
    true, true,
    'orta', 'sag', array['weekday_evening','weekend_morning'],
    'active', now(), true
  )
  on conflict (user_id) do update set
    first_name            = '',
    last_name             = '',
    email                 = 'appreview42@proton.me',
    phone                 = null,
    avatar_url            = null,
    status                = 'active',
    pronoun               = 'they/them',
    pronoun_custom        = null,
    gender_category       = 'open_only',
    class_year            = '3',
    show_department       = true,
    show_class_year       = true,
    skill_self_assessment = 'orta',
    dominant_hand         = 'sag',
    availability_windows  = array['weekday_evening','weekend_morning'],
    kvkk_accepted_at      = coalesce(public.profiles.kvkk_accepted_at, now()),
    is_demo               = true;
end;
$$;

revoke all on function public.reset_review_account() from public;
revoke all on function public.reset_review_account() from anon, authenticated;
