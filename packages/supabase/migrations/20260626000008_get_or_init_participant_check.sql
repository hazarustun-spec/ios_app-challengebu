-- Add a participant guard to get_or_init_live_score (originally defined in
-- 20260626000001_live_match_scores.sql with NO such check). Mirrors the guard in
-- award_point: only a player on team_a/team_b may init/read the score via this
-- SECURITY DEFINER RPC. Body is otherwise faithful to the original.
create or replace function public.get_or_init_live_score(p_match_id uuid)
returns public.live_match_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.live_match_scores;
  is_participant boolean;
begin
  select (auth.uid() = any (m.team_a_player_ids) or auth.uid() = any (m.team_b_player_ids))
    into is_participant from public.matches m where m.id = p_match_id;
  if not coalesce(is_participant, false) then
    raise exception 'not a participant' using errcode = '42501';
  end if;

  insert into public.live_match_scores (match_id) values (p_match_id)
    on conflict (match_id) do nothing;
  select * into r from public.live_match_scores where match_id = p_match_id;
  return r;
end;
$$;
