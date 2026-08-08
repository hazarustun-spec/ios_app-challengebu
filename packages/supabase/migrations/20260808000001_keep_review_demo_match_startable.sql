-- Keep the App Review demo match out of void_unplayed_matches().
--
-- The review seed (scripts/seed-review-account-production.sql) plants one match
-- the reviewer can start immediately: id cccc0001-…, played_at 90 minutes in the
-- past so both the start and score gates pass. void_unplayed_matches()
-- (20260805000001) then voids it ~22 hours later, because it is by definition an
-- unplayed match past its scheduled time.
--
-- That is correct for real players and wrong for this one row. App Review does
-- not always happen the same day the build is submitted: the 1.1.0 (27) review
-- landed on a demo match that cron had already closed, so the reviewer followed
-- the notes to a "Yaklaşan maçın yok" screen and rejected the build under
-- Guideline 2.1(a). Re-seeding daily for the length of a review is not a plan.
--
-- Scope is one hard-coded uuid — the seeded demo match, on the one account we
-- control. Every other unplayed match still gets voided on the same schedule.
--
-- Remove this together with the demo data after the app is approved; the
-- companion cleanup script is scripts/cleanup-review-seed-production.sql.

create or replace function public.void_unplayed_matches()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches
  set status        = 'voided',
      winner_team   = 'void',
      voided_reason = 'Oynanmadı',
      updated_at    = now()
  where status = 'awaiting_confirmation'
    -- No score submitted. With a score present the row belongs to
    -- auto_confirm_matches(), which must stay the only writer for that case.
    and winner_team is null
    -- 24h of slack after the scheduled time so a next-morning score entry
    -- still lands.
    and played_at < now() - interval '24 hours'
    -- The App Review demo match stays startable for as long as the review runs.
    and id <> 'cccc0001-0000-4000-8000-000000000001'::uuid;
end;
$$;

revoke all on function public.void_unplayed_matches() from public;
