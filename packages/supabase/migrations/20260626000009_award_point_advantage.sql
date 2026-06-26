-- Fix tennis scoring: deuce / advantage were unreachable.
--
-- The original award_point() (20260626000001_live_match_scores.sql) used a win
-- margin of `>= 1`, so scoring once from 40-40 (stored 3-3) won the game
-- immediately: the `elsif aw = 4 and ot = 4` deuce branch was UNREACHABLE and
-- Advantage ("Ad", points = 4) never occurred — even though the UI supports it.
--
-- This recreates award_point() faithfully (security definer + search_path +
-- participant guard + set/game outcome all identical) changing ONLY the win
-- margin from `>= 1` to `>= 2`, restoring real tennis deuce/advantage:
--   3-3 +A  → 4-3 (Advantage A)
--   4-3 +B  → aw=4,ot=4 → deuce branch → reset 3-3
--   4-3 +A  → margin 2 → game won, points reset 0-0
--   40-30 (3-2) +A → aw=4,ot=2 → margin 2 → game won
-- Points always stay within 0-4.
create or replace function public.award_point(p_match_id uuid, p_side text)
returns public.live_match_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.live_match_scores;
  is_participant boolean;
  na int; nb int;  -- new points a/b
  aw int; ot int;  -- awarded / other new points
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

  -- Lock (or create) the row.
  insert into public.live_match_scores (match_id) values (p_match_id)
    on conflict (match_id) do nothing;
  select * into r from public.live_match_scores where match_id = p_match_id for update;

  if r.phase <> 'ongoing' then
    return r;  -- finished/void: ignore further points
  end if;

  na := r.points_a; nb := r.points_b;
  if p_side = 'a' then na := na + 1; else nb := nb + 1; end if;
  if p_side = 'a' then aw := na; ot := nb; else aw := nb; ot := na; end if;

  if aw >= 4 and (aw - ot) >= 2 and not (aw = 4 and ot = 4) then
    -- awarded side wins the game
    if p_side = 'a' then r.games_a := r.games_a + 1; else r.games_b := r.games_b + 1; end if;
    r.points_a := 0; r.points_b := 0;
  elsif aw = 4 and ot = 4 then
    r.points_a := 3; r.points_b := 3;  -- deuce
  else
    r.points_a := na; r.points_b := nb;
  end if;

  -- Set / game outcome
  if r.games_a = 4 or r.games_b = 4 then
    r.phase := 'finished';
    r.winner := case when r.games_a = 4 then 'a' else 'b' end;
  elsif r.games_a = 3 and r.games_b = 3 then
    r.phase := 'void';
  end if;

  r.version := r.version + 1;
  r.updated_at := now();
  update public.live_match_scores set
    games_a = r.games_a, games_b = r.games_b, points_a = r.points_a, points_b = r.points_b,
    phase = r.phase, winner = r.winner, version = r.version, updated_at = r.updated_at
  where match_id = p_match_id;
  return r;
end;
$$;

revoke execute on function public.award_point(uuid, text) from anon;
