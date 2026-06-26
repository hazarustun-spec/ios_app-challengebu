-- Recreate trg_push_live_score (originally 20260626000004) with a WHEN guard so
-- it fires ONLY when a score-relevant column actually changed — not on a pure
-- version/updated_at bump. This avoids redundant APNs pushes. The function
-- public.push_live_score_on_update() is unchanged.
drop trigger if exists trg_push_live_score on public.live_match_scores;
create trigger trg_push_live_score
after update on public.live_match_scores
for each row
when (
  new.games_a is distinct from old.games_a or
  new.games_b is distinct from old.games_b or
  new.points_a is distinct from old.points_a or
  new.points_b is distinct from old.points_b or
  new.phase   is distinct from old.phase   or
  new.winner  is distinct from old.winner
)
execute function public.push_live_score_on_update();
