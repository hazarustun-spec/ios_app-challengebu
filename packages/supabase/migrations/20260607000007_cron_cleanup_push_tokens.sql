create or replace function public.cleanup_push_tokens()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.push_tokens where last_active_at < now() - interval '60 days';
end;
$$;

select cron.schedule(
  'cleanup_push_tokens_weekly',
  '0 3 * * 0',  -- Sunday 03:00 UTC
  $$select public.cleanup_push_tokens();$$
);
