create type badge_category as enum (
  'milestone',
  'win',
  'social',
  'season',
  'fun',
  'loyalty',
  'yearly'
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_tr text not null,
  description_tr text not null,
  icon text not null,
  category badge_category not null,
  is_seasonal boolean not null default false,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index badges_category_idx on public.badges (category);
create index badges_code_idx on public.badges (code);

alter table public.badges enable row level security;

create policy "All authenticated can view badges"
  on public.badges for select
  to authenticated
  using (true);

create policy "Only admins manage badges"
  on public.badges for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  badge_id uuid not null references public.badges(id),
  earned_at timestamptz not null default now(),
  season_id uuid references public.seasons(id),
  unique (profile_id, badge_id, season_id)
);

create index user_badges_profile_idx on public.user_badges (profile_id);
create index user_badges_badge_idx on public.user_badges (badge_id);
create index user_badges_earned_idx on public.user_badges (earned_at desc);

alter table public.user_badges enable row level security;

create policy "All authenticated can view user badges"
  on public.user_badges for select
  to authenticated
  using (true);

create policy "Only admins/system can grant badges"
  on public.user_badges for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can revoke badges"
  on public.user_badges for delete
  to authenticated
  using (public.is_admin());
