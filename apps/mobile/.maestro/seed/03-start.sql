-- 03-start.sql — psql companion to seed-start.js (TWO-USER SEEDING 3/4).
--
-- Run AFTER the signed-in user taps "Maçı Başlat". Completes the start
-- handshake by putting BOTH participants in matches.started_by, so the lobby's
-- realtime subscription advances to score entry.
\set opp_email '''rakip.test@std.bogazici.edu.tr'''

update public.matches m
   set started_by = m.team_a_player_ids || m.team_b_player_ids
 where m.id = (
   select mm.id
   from public.matches mm
   join public.profiles p on p.user_id = any (mm.team_b_player_ids)
   where p.email = :opp_email
     and mm.status = 'awaiting_confirmation'
     and mm.winner_team is null
   order by mm.created_at desc
   limit 1
 )
returning m.id, m.started_by;
