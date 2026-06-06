create or replace function public.expire_match_requests()
returns void
language plpgsql
security definer
as $$
begin
  update public.match_requests
  set status = 'expired'
  where status = 'pending' and expires_at < now();
end;
$$;

select cron.schedule(
  'expire_match_requests_hourly',
  '0 * * * *',
  $$select public.expire_match_requests();$$
);
