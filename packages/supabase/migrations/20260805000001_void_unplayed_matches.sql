-- Close out matches that were scheduled but never played.
--
-- Accepting a challenge creates a `matches` row up front: played_at is set,
-- winner_team is null, status is 'awaiting_confirmation'. Nothing ever moved
-- that row on again if the players simply did not show up:
--
--   * expire_match_requests() (20260607000004) only touches match_requests
--     still in 'pending' — an accepted request is out of its reach.
--   * auto_confirm_matches() (20260607000005) requires `winner_team is not
--     null`, i.e. a score was actually submitted. A no-show has no score, so
--     the row was skipped on every run.
--
-- The result was an "Yaklaşan" list that only ever grew. ELO was never at
-- risk — an unconfirmed match applies no rating change — but the stale rows
-- buried the matches that mattered.
--
-- These are voided rather than deleted so the history keeps a record: a
-- player who repeatedly books matches and never turns up stays visible.

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
    and played_at < now() - interval '24 hours';
end;
$$;

revoke all on function public.void_unplayed_matches() from public;

-- Hourly, offset from the other two match crons (both on the hour) so the
-- three never contend for the same row.
select cron.schedule(
  'void_unplayed_matches_hourly',
  '30 * * * *',
  $$select public.void_unplayed_matches();$$
);
