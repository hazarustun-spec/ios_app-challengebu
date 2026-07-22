-- Anti-fake #4.2: cap how many rated matches the same two players can create in
-- a rolling 7-day window (ELO farming guard). The edge functions that
-- materialise a match (accept-match-request, select-open-call-application) call
-- this to count existing rated matches between the two primary opponents before
-- inserting; if the count has hit the cap they reject with a friendly message.
--
-- Counts a match for the pair when BOTH players appear in it (either team), it
-- is rated, not voided, and its played_at is within the window. Voided matches
-- don't count against the cap.

create or replace function public.count_rated_matches_between(
  p_a uuid,
  p_b uuid,
  p_since timestamptz
)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from public.matches m
  where m.is_rated
    and m.status <> 'voided'
    and m.played_at >= p_since
    and (p_a = any(m.team_a_player_ids) or p_a = any(m.team_b_player_ids))
    and (p_b = any(m.team_a_player_ids) or p_b = any(m.team_b_player_ids));
$$;

revoke all on function public.count_rated_matches_between(uuid, uuid, timestamptz) from public;
grant execute on function public.count_rated_matches_between(uuid, uuid, timestamptz) to service_role;
