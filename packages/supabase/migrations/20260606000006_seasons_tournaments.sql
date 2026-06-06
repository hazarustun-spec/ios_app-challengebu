create type season_name as enum ('guz', 'bahar', 'yaz');
create type season_status as enum ('upcoming', 'active', 'finale', 'closed');
create type tournament_status as enum ('seeded', 'in_progress', 'completed');

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name season_name not null,
  year integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  finale_starts_at timestamptz not null,
  finale_ends_at timestamptz not null,
  status season_status not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, year),
  constraint finale_within_season check (
    finale_starts_at >= starts_at and finale_ends_at <= ends_at
  )
);

create index seasons_status_idx on public.seasons (status);
create index seasons_dates_idx on public.seasons (starts_at, ends_at);

create trigger seasons_set_updated_at
  before update on public.seasons
  for each row
  execute function public.set_updated_at();

alter table public.seasons enable row level security;

create policy "All authenticated can view seasons"
  on public.seasons for select
  to authenticated
  using (true);

create policy "Only admins manage seasons"
  on public.seasons for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.season_standings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  category match_category not null,
  final_rating integer not null,
  rank integer not null,
  matches_played integer not null,
  created_at timestamptz not null default now(),
  unique (season_id, profile_id, category)
);

create index season_standings_season_cat_rank_idx
  on public.season_standings (season_id, category, rank);

alter table public.season_standings enable row level security;

create policy "All authenticated can view standings"
  on public.season_standings for select
  to authenticated
  using (true);

create policy "Only admins manage standings"
  on public.season_standings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  category match_category not null,
  bracket_size integer not null,
  status tournament_status not null default 'seeded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, category),
  constraint bracket_size_valid check (bracket_size in (4, 8))
);

create index tournaments_season_idx on public.tournaments (season_id);
create index tournaments_status_idx on public.tournaments (status);

create trigger tournaments_set_updated_at
  before update on public.tournaments
  for each row
  execute function public.set_updated_at();

alter table public.tournaments enable row level security;

create policy "All authenticated can view tournaments"
  on public.tournaments for select
  to authenticated
  using (true);

create policy "Only admins manage tournaments"
  on public.tournaments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round integer not null,
  match_id uuid references public.matches(id),
  bracket_position integer not null,
  seed_a integer,
  seed_b integer,
  created_at timestamptz not null default now(),
  unique (tournament_id, bracket_position, round),
  constraint round_in_range check (round between 1 and 3)
);

create index tournament_matches_tournament_round_idx
  on public.tournament_matches (tournament_id, round);

alter table public.tournament_matches enable row level security;

create policy "All authenticated can view tournament matches"
  on public.tournament_matches for select
  to authenticated
  using (true);

create policy "Only admins manage tournament matches"
  on public.tournament_matches for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.yearly_championship (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  category match_category not null,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  total_finale_points integer not null,
  rank integer not null,
  created_at timestamptz not null default now(),
  unique (year, category, profile_id)
);

create index yearly_championship_year_cat_rank_idx
  on public.yearly_championship (year, category, rank);

alter table public.yearly_championship enable row level security;

create policy "All authenticated can view yearly championship"
  on public.yearly_championship for select
  to authenticated
  using (true);

create policy "Only admins manage yearly championship"
  on public.yearly_championship for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
