create type match_status as enum ('awaiting_confirmation', 'confirmed', 'disputed', 'voided');
create type winner_team as enum ('a', 'b', 'void');
create type dispute_status as enum ('open', 'resolved');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_request_id uuid references public.match_requests(id),
  category match_category not null,
  format match_format not null,
  court_id uuid not null references public.courts(id),
  played_at timestamptz not null,
  is_rated boolean not null default true,
  team_a_player_ids uuid[] not null,
  team_b_player_ids uuid[] not null,
  score_team_a integer not null default 0,
  score_team_b integer not null default 0,
  score_details jsonb,
  winner_team winner_team,
  status match_status not null default 'awaiting_confirmation',
  confirmed_by uuid[] not null default '{}'::uuid[],
  confirmed_at timestamptz,
  voided_reason text,
  rating_before_team_a integer,
  rating_after_team_a integer,
  rating_before_team_b integer,
  rating_after_team_b integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_a_non_empty check (cardinality(team_a_player_ids) > 0),
  constraint team_b_non_empty check (cardinality(team_b_player_ids) > 0),
  constraint teams_disjoint check (
    not (team_a_player_ids && team_b_player_ids)
  )
);

create index matches_team_a_idx on public.matches using gin (team_a_player_ids);
create index matches_team_b_idx on public.matches using gin (team_b_player_ids);
create index matches_played_at_idx on public.matches (played_at desc);
create index matches_status_idx on public.matches (status);
create index matches_category_idx on public.matches (category);
create index matches_request_idx on public.matches (match_request_id);

create trigger matches_set_updated_at
  before update on public.matches
  for each row
  execute function public.set_updated_at();

alter table public.matches enable row level security;

create policy "All authenticated can view matches"
  on public.matches for select
  to authenticated
  using (true);

create policy "Players can confirm their own matches"
  on public.matches for update
  to authenticated
  using (
    auth.uid() = any(team_a_player_ids) or auth.uid() = any(team_b_player_ids)
  )
  with check (
    auth.uid() = any(team_a_player_ids) or auth.uid() = any(team_b_player_ids)
  );

create policy "Admins can do anything"
  on public.matches for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.match_score_submissions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  submitted_by uuid not null references public.profiles(user_id),
  score_details jsonb not null,
  submitted_at timestamptz not null default now()
);

create index mss_match_submitted_idx on public.match_score_submissions (match_id, submitted_at desc);

alter table public.match_score_submissions enable row level security;

create policy "Players can view submissions for their matches"
  on public.match_score_submissions for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        auth.uid() = any(m.team_a_player_ids) or auth.uid() = any(m.team_b_player_ids)
      )
    )
  );

create policy "Players can submit scores for their matches"
  on public.match_score_submissions for insert
  to authenticated
  with check (
    auth.uid() = submitted_by and
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        auth.uid() = any(m.team_a_player_ids) or auth.uid() = any(m.team_b_player_ids)
      )
    )
  );

create policy "Admins can view all submissions"
  on public.match_score_submissions for select
  to authenticated
  using (public.is_admin());

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  raised_by uuid not null references public.profiles(user_id),
  reason text not null,
  status dispute_status not null default 'open',
  resolution_notes text,
  resolved_by uuid references public.profiles(user_id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index disputes_match_idx on public.disputes (match_id);
create index disputes_status_idx on public.disputes (status) where status = 'open';

alter table public.disputes enable row level security;

create policy "Match participants can view their disputes"
  on public.disputes for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        auth.uid() = any(m.team_a_player_ids) or auth.uid() = any(m.team_b_player_ids)
      )
    )
  );

create policy "Match participants can raise disputes"
  on public.disputes for insert
  to authenticated
  with check (
    auth.uid() = raised_by and
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        auth.uid() = any(m.team_a_player_ids) or auth.uid() = any(m.team_b_player_ids)
      )
    )
  );

create policy "Admins manage disputes"
  on public.disputes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
