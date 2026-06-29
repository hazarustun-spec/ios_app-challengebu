-- Add a column-change WHEN guard to the live-score push trigger.
--
-- Previously trg_push_live_score fired on EVERY update to live_match_scores
-- (even no-op updates), sending a redundant APNs push each time. Now it fires
-- only when a score/phase column actually changes. The trigger function
-- (push_live_score_on_update) is unchanged.

drop trigger if exists trg_push_live_score on public.live_match_scores;

create trigger trg_push_live_score
  after update on public.live_match_scores
  for each row
  when (
    old.games_a  is distinct from new.games_a
    or old.games_b  is distinct from new.games_b
    or old.points_a is distinct from new.points_a
    or old.points_b is distinct from new.points_b
    or old.phase    is distinct from new.phase
  )
  execute function public.push_live_score_on_update();
