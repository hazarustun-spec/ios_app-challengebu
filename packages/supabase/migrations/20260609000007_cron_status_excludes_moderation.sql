-- Faz D code review flagged this as the only Critical: 20260607000003 schedules
-- update_user_status() to reflow profiles.status into the lifecycle buckets
-- (active / frozen_30 / hibernating_60 / inactive_90) based on last_match_at.
-- After Faz F (suspended/banned admin actions), the next 00:00 UTC cron tick
-- would silently overwrite the moderation status with the lifecycle one — so
-- a banned user would un-ban itself overnight.
--
-- Extend the WHERE clause to skip moderation states the same way it already
-- skips anonymized.

create or replace function public.update_user_status()
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles set status =
    case
      when last_match_at is null then status -- never played, leave alone
      when last_match_at < now() - interval '90 days' then 'inactive_90'::user_status
      when last_match_at < now() - interval '60 days' then 'hibernating_60'::user_status
      when last_match_at < now() - interval '30 days' then 'frozen_30'::user_status
      else 'active'::user_status
    end
  where status not in ('anonymized', 'suspended', 'banned');
end;
$$;
