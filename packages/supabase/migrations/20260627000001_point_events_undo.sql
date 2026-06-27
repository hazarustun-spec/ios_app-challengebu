-- Event-sourced live scoring: shared, reversible, dedupe'd.
--
-- Before this migration, award_point() mutated public.live_match_scores in place,
-- so an UNDO of a point that had won a game/set was impossible to reconstruct.
-- We now make the live score a PURE FUNCTION of an append-only event log
-- (public.point_events): each scored rally is one row; UNDO marks the latest row
-- awarded=false; the live score is recomputed by replaying all awarded events
-- from scratch (identical per-point rule to 20260626000009, win margin >= 2).
--
-- This also fixes simultaneous duplicate entry: when both participants tap the
-- same rally on their own devices within a short window, only ONE point counts
-- (the dedupe window in award_point).
--
-- recompute_live_score() always UPDATEs live_match_scores (bumping version and a
-- score column), so the existing AFTER UPDATE push trigger (20260626000004 /
-- 20260626000007) still fires and Live Activities stay in sync. The trigger is
-- left untouched.

-- 1. Append-only event log -------------------------------------------------
create table if not exists public.point_events (
  id            bigint generated always as identity primary key,
  match_id      uuid not null references public.matches(id) on delete cascade,
  side          text not null check (side in ('a','b')),
  awarded       boolean not null default true,   -- false = undone
  actor_user_id uuid not null,
  created_at    timestamptz not null default now()
);
create index if not exists point_events_match_idx on public.point_events(match_id, id);

alter table public.point_events enable row level security;

-- Participants may READ their match's history; writes only via SECURITY DEFINER RPCs.
drop policy if exists point_events_read on public.point_events;
create policy point_events_read on public.point_events for select using (
  exists (select 1 from public.matches m where m.id = match_id
    and (auth.uid() = any (m.team_a_player_ids) or auth.uid() = any (m.team_b_player_ids)))
);

-- 2. Recompute: replay awarded events → write live_match_scores ------------
create or replace function public.recompute_live_score(p_match_id uuid)
returns public.live_match_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.live_match_scores;
  ev record;
  v_games_a int := 0; v_games_b int := 0;
  v_points_a int := 0; v_points_b int := 0;
  v_phase text := 'ongoing';
  v_winner text := null;
  na int; nb int;  -- new points a/b
  aw int; ot int;  -- awarded / other new points
begin
  -- Ensure the row exists so the final UPDATE (and its push trigger) fires.
  insert into public.live_match_scores (match_id) values (p_match_id)
    on conflict (match_id) do nothing;

  for ev in
    select side from public.point_events
    where match_id = p_match_id and awarded
    order by id asc
  loop
    if v_phase <> 'ongoing' then
      continue;  -- ignore events recorded after the match ended
    end if;

    na := v_points_a; nb := v_points_b;
    if ev.side = 'a' then na := na + 1; else nb := nb + 1; end if;
    if ev.side = 'a' then aw := na; ot := nb; else aw := nb; ot := na; end if;

    if aw >= 4 and (aw - ot) >= 2 and not (aw = 4 and ot = 4) then
      -- awarded side wins the game
      if ev.side = 'a' then v_games_a := v_games_a + 1; else v_games_b := v_games_b + 1; end if;
      v_points_a := 0; v_points_b := 0;
    elsif aw = 4 and ot = 4 then
      v_points_a := 3; v_points_b := 3;  -- deuce
    else
      v_points_a := na; v_points_b := nb;
    end if;

    -- Set / game outcome
    if v_games_a = 4 or v_games_b = 4 then
      v_phase := 'finished';
      v_winner := case when v_games_a = 4 then 'a' else 'b' end;
    elsif v_games_a = 3 and v_games_b = 3 then
      v_phase := 'void';
    end if;
  end loop;

  update public.live_match_scores set
    games_a = v_games_a, games_b = v_games_b,
    points_a = v_points_a, points_b = v_points_b,
    phase = v_phase, winner = v_winner,
    version = version + 1, updated_at = now()
  where match_id = p_match_id
  returning * into r;

  return r;
end;
$$;

-- 3. award_point: append an event (with same-rally dedupe), then recompute -
create or replace function public.award_point(p_match_id uuid, p_side text)
returns public.live_match_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.live_match_scores;
  is_participant boolean;
  last_ev record;
begin
  if p_side not in ('a','b') then
    raise exception 'invalid side %', p_side using errcode = '22023';
  end if;

  select (auth.uid() = any (m.team_a_player_ids) or auth.uid() = any (m.team_b_player_ids))
    into is_participant
    from public.matches m where m.id = p_match_id;
  if not coalesce(is_participant, false) then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  -- Serialize concurrent writers on this match.
  insert into public.live_match_scores (match_id) values (p_match_id)
    on conflict (match_id) do nothing;
  select * into r from public.live_match_scores where match_id = p_match_id for update;

  -- Can't score a match that already ended.
  if r.phase <> 'ongoing' then
    return r;
  end if;

  -- DEDUPE WINDOW: same rally double-entered by the OTHER participant within 5s.
  select side, actor_user_id, created_at into last_ev
    from public.point_events
    where match_id = p_match_id and awarded
    order by id desc limit 1;
  if found
     and last_ev.side = p_side
     and last_ev.actor_user_id <> auth.uid()
     and last_ev.created_at > now() - interval '5 seconds' then
    return r;  -- collapse into the existing point
  end if;

  insert into public.point_events (match_id, side, actor_user_id)
    values (p_match_id, p_side, auth.uid());

  return public.recompute_live_score(p_match_id);
end;
$$;

-- 4. undo_point: revert the latest awarded event, then recompute ----------
create or replace function public.undo_point(p_match_id uuid)
returns public.live_match_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.live_match_scores;
  is_participant boolean;
  last_id bigint;
begin
  select (auth.uid() = any (m.team_a_player_ids) or auth.uid() = any (m.team_b_player_ids))
    into is_participant
    from public.matches m where m.id = p_match_id;
  if not coalesce(is_participant, false) then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  -- Serialize against concurrent award/undo on this match.
  insert into public.live_match_scores (match_id) values (p_match_id)
    on conflict (match_id) do nothing;
  select * into r from public.live_match_scores where match_id = p_match_id for update;

  select id into last_id
    from public.point_events
    where match_id = p_match_id and awarded
    order by id desc limit 1;
  if last_id is null then
    return r;  -- nothing to undo
  end if;

  update public.point_events set awarded = false where id = last_id;

  -- Recompute from scratch: reverts even a match-ending point back to ongoing.
  return public.recompute_live_score(p_match_id);
end;
$$;

revoke execute on function public.recompute_live_score(uuid) from anon;
revoke execute on function public.award_point(uuid, text) from anon;
revoke execute on function public.undo_point(uuid) from anon;
