-- Run AFTER fix-wrong-match-and-rescore.sql, ~5 seconds later.
-- One SELECT, so the SQL Editor shows it. Expect:
--   - no Emre Y row at all (the wrong match is gone)
--   - the Yunus Emre match: confirmed, erkek_tek, 8-4 to him,
--     rating_after_* filled (proof ELO ran)
--   - last_http: 200 (anything else is the function's refusal, in words)
select
  m.id,
  m.status,
  m.category,
  m.format,
  pa.first_name || ' ' || pa.last_name || ' (' || m.score_team_a || ')' as team_a,
  pb.first_name || ' ' || pb.last_name || ' (' || m.score_team_b || ')' as team_b,
  m.winner_team,
  m.rating_before_team_a || ' -> ' || m.rating_after_team_a as elo_a,
  m.rating_before_team_b || ' -> ' || m.rating_after_team_b as elo_b,
  m.played_at::date as played,
  (select r.status_code || ' ' || left(r.content, 200)
     from net._http_response r order by r.created desc limit 1) as last_http
from public.matches m
join public.profiles pa on pa.user_id = m.team_a_player_ids[1]
join public.profiles pb on pb.user_id = m.team_b_player_ids[1]
join auth.users hu on lower(hu.email) = 'hazar.ustun@std.bogazici.edu.tr'
where m.format = 'pro_set_8'
  and hu.id in (m.team_a_player_ids[1], m.team_b_player_ids[1])
order by m.played_at desc
limit 5;
