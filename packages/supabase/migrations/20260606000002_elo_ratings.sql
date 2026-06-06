create type match_category as enum (
  'erkek_tek',
  'kadin_tek',
  'open_tek',
  'erkek_cift',
  'kadin_cift',
  'karma_cift',
  'open_cift'
);

create table public.elo_ratings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  category match_category not null,
  rating integer not null default 1200,
  matches_played integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, category),
  constraint rating_in_range check (rating >= 0 and rating <= 4000),
  constraint matches_played_non_negative check (matches_played >= 0)
);

create index elo_ratings_category_rating_idx on public.elo_ratings (category, rating desc);
create index elo_ratings_profile_idx on public.elo_ratings (profile_id);

create trigger elo_ratings_set_updated_at
  before update on public.elo_ratings
  for each row
  execute function public.set_updated_at();

alter table public.elo_ratings enable row level security;

create policy "ELO ratings viewable by authenticated"
  on public.elo_ratings for select
  to authenticated
  using (true);

create policy "Only admins can directly insert/update/delete elo_ratings"
  on public.elo_ratings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Note: Edge Functions kullanır service_role key, bu policy'leri bypass eder
-- Normal kullanıcılar maç onayı üzerinden Edge Function tetikler, kendi ELO'sunu doğrudan değiştiremez
