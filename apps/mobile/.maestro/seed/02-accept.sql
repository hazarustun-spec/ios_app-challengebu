-- 02-accept.sql — psql companion to seed-accept.js (TWO-USER SEEDING 2/4).
--
-- Run AFTER the signed-in user sends a direct_challenge in-UI. Replicates the
-- accept-match-request edge function from the opponent's side: pending
-- match_request → matches row (awaiting_confirmation) + request 'accepted'.
-- Prints the new match id (use it to deep-link the start lobby).
\set opp_email '''rakip.test@std.bogazici.edu.tr'''

with req as (
  select mr.*
  from public.match_requests mr
  join public.profiles p on p.user_id = mr.target_id
  where p.email = :opp_email and mr.status = 'pending'
  order by mr.created_at desc
  limit 1
), ins as (
  insert into public.matches (
    match_request_id, category, format, court_id, played_at, is_rated,
    team_a_player_ids, team_b_player_ids, status
  )
  select
    req.id, req.category, req.format, req.court_id,
    (req.proposed_date::text || 'T' || req.proposed_time::text)::timestamptz,
    req.is_rated,
    case when req.creator_partner_id is not null
         then array[req.creator_id, req.creator_partner_id]
         else array[req.creator_id] end,
    case when req.target_partner_id is not null
         then array[req.target_id, req.target_partner_id]
         else array[req.target_id] end,
    'awaiting_confirmation'
  from req
  returning id, match_request_id
)
update public.match_requests
   set status = 'accepted'
  from ins
 where public.match_requests.id = ins.match_request_id
returning ins.id as match_id;
