-- Live scoring becomes format-aware, and one event becomes one UNIT.
--
-- WHAT WAS WRONG
--
-- 1. The engine only ever implemented BÜ Klasik. `recompute_live_score`
--    accumulated 15/30/40 rally points into games, then declared a winner at 4
--    games. A Pro Set 8, a Hızlı Tiebreak and a 3 Set Klasik match all ran on
--    that same rule, so their live score was meaningless.
--
-- 2. Klasik's own rule contradicted its UI. The engine voided the match at 3-3,
--    but the score screen counts "EL n / 7" and the format-rules screen
--    advertises `4-3 → 1.0×`. A 7-game format has a decider: 3-3 is followed by
--    a seventh game and the result is 4-3. The void made 4-3 unreachable, so the
--    app promised a score it could never produce. Confirmed with the operator:
--    Klasik is 7 games, first to 4, no draw.
--
-- 3. Entering a rally at a time never matched how these matches are played —
--    nobody picks up a phone between points. Points move to a future Apple Watch
--    mode; the phone now records the unit the players actually talk about.
--
-- WHAT CHANGES
--
-- `point_events` keeps its shape — an append-only log of (side, awarded) — but
-- each awarded row now means "this side won one UNIT", where the unit is:
--
--   bu_klasik       oyun (game)   first to 4, at most 7 games   → 4-0 … 4-3
--   pro_set_8       oyun (game)   ≥8 with a 2-game margin, or exactly 9-8
--   hizli_tiebreak  sayı (point)  ≥10 with a 2-point margin
--   3set_klasik     set           first to 2                    → 2-0, 2-1
--
-- Those are exactly the score shapes `getMarginMultiplier`
-- (packages/shared/src/elo/margin-multiplier.ts) already expects, so ELO needs
-- no change.
--
-- `live_match_scores.games_a/games_b` now hold the unit count for EVERY format,
-- whatever the unit is called there. `points_a/points_b` are no longer written
-- and stay 0; they are kept, not dropped, because a point-by-point Apple Watch
-- mode is planned and would fill them again.
--
-- COMPATIBILITY
--
-- `award_point` / `undo_point` stay as thin aliases. Clients already in the App
-- Store call them from the Live Activity's AppIntents, and dropping them would
-- turn a wrong score into a hard failure on a phone that cannot be updated by
-- an over-the-air push. Their behaviour changes with everything else — one tap
-- is now one unit — so an old build's 15/30/40 display will be wrong until it
-- updates, but it keeps working and its score stays consistent with the server.

-- ---------------------------------------------------------------------------
-- 1. The rule table, in one place
-- ---------------------------------------------------------------------------
--
-- Returns the winning rule for a format. Mirrored on the client in
-- apps/mobile/lib/live-format.ts and in the Live Activity's ScoreFormat.swift;
-- all three must agree, and the pgTAP tests in
-- tests/database/live-score-formats.test.sql pin this copy.
--
--   target  units needed to win outright
--   margin  units the winner must lead by
--   cap     unit count at which the match ends regardless of margin
--           (Klasik's decider: 4 always wins, even at 4-3), null = no cap
create or replace function public.live_score_rule(p_format public.match_format)
returns table (target int, margin int, cap int)
language sql
immutable
as $$
  select
    case p_format
      when 'bu_klasik'      then 4
      when 'pro_set_8'      then 8
      when 'hizli_tiebreak' then 10
      when '3set_klasik'    then 2
    end,
    case p_format
      when 'bu_klasik'      then 1   -- 4-3 wins
      when 'pro_set_8'      then 2   -- 8-6 wins, 8-7 plays on
      when 'hizli_tiebreak' then 2   -- 10-8 wins, 10-9 plays on
      when '3set_klasik'    then 1   -- 2-1 wins
    end,
    case p_format
      when 'bu_klasik'      then 4   -- seventh game decides: 4-3 ends it
      when 'pro_set_8'      then 9   -- 8-8 tiebreak: 9-8 ends it
      when 'hizli_tiebreak' then null
      when '3set_klasik'    then 2
    end;
$$;

revoke execute on function public.live_score_rule(public.match_format) from anon;

-- ---------------------------------------------------------------------------
-- 2. Replay the event log under the match's own format
-- ---------------------------------------------------------------------------
create or replace function public.recompute_live_score(p_match_id uuid)
returns public.live_match_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.live_match_scores;
  ev record;
  v_format public.match_format;
  v_target int; v_margin int; v_cap int;
  v_a int := 0; v_b int := 0;
  v_phase text := 'ongoing';
  v_winner text := null;
  aw int; ot int;
begin
  select m.format into v_format from public.matches m where m.id = p_match_id;
  if v_format is null then
    raise exception 'match % not found', p_match_id using errcode = 'P0002';
  end if;
  select rule.target, rule.margin, rule.cap
    into v_target, v_margin, v_cap
    from public.live_score_rule(v_format) as rule;

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

    -- One awarded event = one unit for that side.
    if ev.side = 'a' then v_a := v_a + 1; else v_b := v_b + 1; end if;
    if ev.side = 'a' then aw := v_a; ot := v_b; else aw := v_b; ot := v_a; end if;

    -- Win by reaching the target with the required margin, or by hitting the
    -- cap, which is what makes a decider (Klasik 4-3, Pro Set 9-8) final.
    if (aw >= v_target and (aw - ot) >= v_margin)
       or (v_cap is not null and aw >= v_cap) then
      v_phase := 'finished';
      v_winner := ev.side;
    end if;
  end loop;

  update public.live_match_scores set
    games_a = v_a, games_b = v_b,
    -- Rally points are not tracked any more; a stale non-zero value would show
    -- up as "40-30" under a score that no longer has points.
    points_a = 0, points_b = 0,
    phase = v_phase, winner = v_winner,
    version = version + 1, updated_at = now()
  where match_id = p_match_id
  returning * into r;

  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. award_unit / undo_unit
-- ---------------------------------------------------------------------------
--
-- Same bodies as the old award_point/undo_point, renamed because they no longer
-- award a rally point. The dedupe window still earns its place: both players can
-- score, and when they both record the same game within a few seconds only one
-- unit should count. It is widened from 5s to 12s — two people reacting to a
-- finished GAME are further apart than two people reacting to a finished rally.
create or replace function public.award_unit(p_match_id uuid, p_side text)
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

  if r.phase <> 'ongoing' then
    return r;  -- can't score a match that already ended
  end if;

  select side, actor_user_id, created_at into last_ev
    from public.point_events
    where match_id = p_match_id and awarded
    order by id desc limit 1;
  if found
     and last_ev.side = p_side
     and last_ev.actor_user_id <> auth.uid()
     and last_ev.created_at > now() - interval '12 seconds' then
    return r;  -- both players recorded the same unit; collapse into one
  end if;

  insert into public.point_events (match_id, side, actor_user_id)
    values (p_match_id, p_side, auth.uid());

  return public.recompute_live_score(p_match_id);
end;
$$;

-- Take back the last unit awarded to ONE side, rather than "the last unit".
-- With a +/- control per player, "undo mine" has to mean mine: the old
-- undo_point reversed whichever side scored last, so tapping "−" on your own
-- row could remove your opponent's game.
create or replace function public.revoke_unit(p_match_id uuid, p_side text)
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
  if p_side not in ('a','b') then
    raise exception 'invalid side %', p_side using errcode = '22023';
  end if;

  select (auth.uid() = any (m.team_a_player_ids) or auth.uid() = any (m.team_b_player_ids))
    into is_participant
    from public.matches m where m.id = p_match_id;
  if not coalesce(is_participant, false) then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  insert into public.live_match_scores (match_id) values (p_match_id)
    on conflict (match_id) do nothing;
  select * into r from public.live_match_scores where match_id = p_match_id for update;

  select id into last_id
    from public.point_events
    where match_id = p_match_id and awarded and side = p_side
    order by id desc limit 1;
  if last_id is null then
    return r;  -- nothing of this side's to take back
  end if;

  update public.point_events set awarded = false where id = last_id;

  -- Recompute from scratch, so taking back a match-winning unit returns the
  -- match to 'ongoing'.
  return public.recompute_live_score(p_match_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Aliases for builds already in the App Store
-- ---------------------------------------------------------------------------
create or replace function public.award_point(p_match_id uuid, p_side text)
returns public.live_match_scores
language sql
security definer
set search_path = public
as $$ select public.award_unit(p_match_id, p_side); $$;

create or replace function public.undo_point(p_match_id uuid)
returns public.live_match_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  last_side text;
begin
  -- Old clients have no per-side undo. Reverse whichever side scored last,
  -- which is what undo_point always did.
  select side into last_side
    from public.point_events
    where match_id = p_match_id and awarded
    order by id desc limit 1;
  if last_side is null then
    return public.recompute_live_score(p_match_id);
  end if;
  return public.revoke_unit(p_match_id, last_side);
end;
$$;

revoke execute on function public.recompute_live_score(uuid) from anon;
revoke execute on function public.award_unit(uuid, text) from anon;
revoke execute on function public.revoke_unit(uuid, text) from anon;
revoke execute on function public.award_point(uuid, text) from anon;
revoke execute on function public.undo_point(uuid) from anon;

-- ---------------------------------------------------------------------------
-- 5. Re-score matches that are still in progress
-- ---------------------------------------------------------------------------
--
-- Every live match on record was scored rally-by-rally under the old rule, so
-- its event log holds points, not units. Replaying it under the new rule would
-- read those points as games and hand somebody an instant win. There is no
-- honest conversion — the log does not say which rallies closed a game — so the
-- unfinished ones are cleared and the players re-enter the score they can see
-- on court. Finished matches are left alone: their result is already recorded
-- on `matches`, and a completed history should not be rewritten.
do $$
declare
  affected int;
begin
  with live as (
    select l.match_id
    from public.live_match_scores l
    join public.matches m on m.id = l.match_id
    where l.phase = 'ongoing'
  ),
  cleared as (
    delete from public.point_events pe
    using live
    where pe.match_id = live.match_id
    returning pe.match_id
  )
  select count(distinct match_id) into affected from cleared;

  update public.live_match_scores set
    games_a = 0, games_b = 0, points_a = 0, points_b = 0,
    phase = 'ongoing', winner = null,
    version = version + 1, updated_at = now()
  where phase = 'ongoing';

  raise notice 'live_score_units_by_format: reset % in-progress match(es)', affected;
end $$;
