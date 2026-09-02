-- 04-confirm.sql — psql companion to seed-confirm.js (TWO-USER SEEDING 4/4).
--
-- Run AFTER the signed-in user submits the final score. Settles the match from
-- the opponent's side and finalizes it (confirmed_by = both, status confirmed/
-- voided). NOTE: production confirmation runs through the confirm-match edge
-- function, which ALSO applies ELO + badges; this direct update asserts UI
-- state only. Call confirm-match per participant if you need real ELO effects.
\set opp_email '''rakip.test@example.edu.tr'''

update public.matches m
   set confirmed_by = m.team_a_player_ids || m.team_b_player_ids,
       confirmed_at = now(),
       status = (case when m.winner_team = 'void' then 'voided' else 'confirmed' end)::public.match_status
 where m.id = (
   select mm.id
   from public.matches mm
   join public.profiles p on p.user_id = any (mm.team_b_player_ids)
   where p.email = :opp_email
     and mm.status = 'awaiting_confirmation'
     and mm.winner_team is not null
   order by mm.created_at desc
   limit 1
 )
returning m.id, m.status, m.winner_team;
