-- BUGFIX (found by pgTAP match-lifecycle.test.sql): auto_confirm_matches()
-- assigned a TEXT case-expression to matches.status, which is the match_status
-- enum. There is no implicit text->enum cast in assignment context, so the
-- function raised SQLSTATE 42804 ("column status is of type match_status but
-- expression is of type text") on EVERY invocation — meaning the hourly cron
-- (auto_confirm_matches_hourly) failed every run and 48h-stale matches were
-- never auto-confirmed/voided. Cast the CASE result to ::match_status.
create or replace function public.auto_confirm_matches()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches
  set
    status = (case when winner_team = 'void' then 'voided' else 'confirmed' end)::match_status,
    confirmed_at = now(),
    voided_reason = case when winner_team = 'void' then 'Auto-voided after 48h' else voided_reason end
  where status = 'awaiting_confirmation'
    and winner_team is not null
    and updated_at < now() - interval '48 hours';
end;
$$;
