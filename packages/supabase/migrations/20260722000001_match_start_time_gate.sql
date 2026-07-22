-- Anti-fake #3: a match must not be startable before its scheduled time.
--
-- Recreates public.start_match() (originally 20260620000003_match_start_handshake.sql,
-- trigger WHEN clause later tweaked in 20260626000010) adding a time gate: the
-- caller may only join started_by once `now()` has reached played_at minus a
-- 15-minute early tolerance (clock skew / arriving slightly early). Before that
-- window the RPC raises and the lobby keeps its "Maçı Başlat" button locked.
--
-- Signature and grants are unchanged, so nothing else needs to be re-wired.

create or replace function public.start_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_a uuid[];
  v_b uuid[];
  v_played_at timestamptz;
begin
  select team_a_player_ids, team_b_player_ids, played_at
    into v_a, v_b, v_played_at
    from public.matches
    where id = p_match_id
    for update;

  if v_a is null then
    raise exception 'Match not found' using errcode = '42704';
  end if;

  if not (uid = any(v_a) or uid = any(v_b)) then
    raise exception 'Only a participant can start the match' using errcode = '42501';
  end if;

  -- 15-minute early tolerance before the scheduled played_at.
  if now() < v_played_at - interval '15 minutes' then
    raise exception 'Match cannot start before its scheduled time'
      using errcode = 'P0001';
  end if;

  update public.matches
    set started_by = (
      select array(select distinct unnest(started_by || uid))
    )
    where id = p_match_id;
end;
$$;

revoke all on function public.start_match(uuid) from public;
grant execute on function public.start_match(uuid) to authenticated;
