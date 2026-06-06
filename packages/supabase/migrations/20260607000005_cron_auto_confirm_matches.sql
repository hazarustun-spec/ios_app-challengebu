create or replace function public.auto_confirm_matches()
returns void
language plpgsql
security definer
as $$
begin
  update public.matches
  set
    status = case when winner_team = 'void' then 'voided' else 'confirmed' end,
    confirmed_at = now(),
    voided_reason = case when winner_team = 'void' then 'Auto-voided after 48h' else voided_reason end
  where status = 'awaiting_confirmation'
    and winner_team is not null
    and updated_at < now() - interval '48 hours';
end;
$$;

select cron.schedule(
  'auto_confirm_matches_hourly',
  '15 * * * *',
  $$select public.auto_confirm_matches();$$
);
