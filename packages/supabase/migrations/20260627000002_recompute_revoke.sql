-- recompute_live_score is an internal replay helper called only by the
-- SECURITY DEFINER RPCs award_point / undo_point. It is itself SECURITY DEFINER
-- and returns the live_match_scores row, so leaving EXECUTE open to
-- `authenticated` would let any signed-in user replay/seed any match's score,
-- bypassing the live_match_scores RLS read policy. Lock it to the definer
-- callers only.
revoke execute on function public.recompute_live_score(uuid) from public, authenticated;
