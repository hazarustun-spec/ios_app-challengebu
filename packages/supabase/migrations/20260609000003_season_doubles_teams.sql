-- A doubles tournament needs to know which two players form a team. The
-- existing season_standings table is single-profile-per-row; for the four
-- *_cift categories we form teams from the season's confirmed doubles match
-- history (most-frequent-partner heuristic) and seed the bracket by team rank
-- instead of individual ELO rank.
--
-- start-season-finale (Plan 6 Faz B) currently seeds doubles brackets with
-- individual top-N profiles, which produces wrong pairings (rank 1 + rank 2
-- as a team is artificial). This table fixes that: doubles brackets use
-- season_doubles_teams.rank to resolve seed_a/seed_b → real partnerships,
-- while singles brackets keep using season_standings.

create table public.season_doubles_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  category match_category not null check (category in ('erkek_cift', 'kadin_cift', 'karma_cift', 'open_cift')),
  player_a_id uuid not null references public.profiles(user_id) on delete cascade,
  player_b_id uuid not null references public.profiles(user_id) on delete cascade,
  avg_rating integer not null,
  rank integer not null,
  matches_played integer not null default 0,
  created_at timestamptz not null default now(),
  -- canonical pair order so (X, Y) and (Y, X) are stored identically.
  check (player_a_id < player_b_id),
  unique (season_id, category, player_a_id, player_b_id),
  unique (season_id, category, rank)
);

create index season_doubles_teams_season_cat_rank_idx
  on public.season_doubles_teams (season_id, category, rank);

alter table public.season_doubles_teams enable row level security;

create policy "Doubles teams readable by authenticated"
  on public.season_doubles_teams for select
  to authenticated, anon
  using (true);

create policy "Only admins manage doubles teams"
  on public.season_doubles_teams for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
