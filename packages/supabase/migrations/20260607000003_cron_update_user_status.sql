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
  where status != 'anonymized';
end;
$$;

select cron.schedule(
  'update_user_status_daily',
  '0 0 * * *',  -- 00:00 UTC = 03:00 TR
  $$select public.update_user_status();$$
);
