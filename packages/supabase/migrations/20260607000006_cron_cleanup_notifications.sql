create or replace function public.cleanup_notifications()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.notifications where created_at < now() - interval '30 days';
end;
$$;

select cron.schedule(
  'cleanup_notifications_daily',
  '0 1 * * *',  -- 01:00 UTC = 04:00 TR
  $$select public.cleanup_notifications();$$
);
