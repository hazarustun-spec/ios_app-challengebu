-- Enums
create type user_role as enum ('player', 'admin');
create type user_status as enum ('active', 'frozen_30', 'hibernating_60', 'inactive_90', 'anonymized');
create type pronoun_type as enum ('he/him', 'she/her', 'they/them', 'other');
create type gender_category as enum ('erkek', 'kadin', 'open_only');
create type class_year as enum ('hazirlik', '1', '2', '3', '4', 'yl', 'doktora');
create type skill_level as enum ('baslangic', 'orta', 'ileri');
create type dominant_hand as enum ('sag', 'sol');

-- Profiles table
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'player',
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  pronoun pronoun_type not null,
  pronoun_custom text,
  gender_category gender_category not null,
  department_id uuid,
  class_year class_year not null,
  show_department boolean not null default true,
  show_class_year boolean not null default true,
  skill_self_assessment skill_level not null,
  dominant_hand dominant_hand not null,
  availability_windows text[] not null default '{}'::text[],
  avatar_url text,
  status user_status not null default 'active',
  last_match_at timestamptz,
  pinned_badge_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pronoun_custom_when_other check (
    (pronoun = 'other' and pronoun_custom is not null) or pronoun <> 'other'
  ),
  constraint pinned_badges_max_three check (cardinality(pinned_badge_ids) <= 3)
);

create index profiles_status_idx on public.profiles (status);
create index profiles_last_match_at_idx on public.profiles (last_match_at);
create index profiles_role_idx on public.profiles (role);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

-- Helper function: is current user admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Policies
create policy "Profiles are viewable by all authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins can delete profiles"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());
