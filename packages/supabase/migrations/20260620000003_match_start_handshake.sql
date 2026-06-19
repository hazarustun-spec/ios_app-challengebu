-- "Maçı Başlat" handshake: both players must confirm they're starting before
-- score entry. `started_by` collects each participant's user_id; the lobby
-- screens watch it via realtime and, once both sides are present, play the
-- start animation and move to score entry.

alter table public.matches
  add column if not exists started_by uuid[] not null default '{}'::uuid[];

-- Add the caller (must be a participant) to started_by, idempotently.
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
begin
  select team_a_player_ids, team_b_player_ids
    into v_a, v_b
    from public.matches
    where id = p_match_id
    for update;

  if v_a is null then
    raise exception 'Match not found' using errcode = '42704';
  end if;

  if not (uid = any(v_a) or uid = any(v_b)) then
    raise exception 'Only a participant can start the match' using errcode = '42501';
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
