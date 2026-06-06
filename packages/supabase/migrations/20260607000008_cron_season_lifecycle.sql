create or replace function public.season_lifecycle_check()
returns void
language plpgsql
security definer
as $$
declare
  s record;
  admin_id uuid;
begin
  -- Transition: upcoming → active
  update public.seasons
  set status = 'active'
  where status = 'upcoming' and starts_at <= now();

  -- Transition: active → finale (when finale_starts_at reached)
  for s in
    select id, name, year from public.seasons
    where status = 'active' and finale_starts_at <= now()
  loop
    update public.seasons set status = 'finale' where id = s.id;

    -- Notify all admins (insert in-app notification rows)
    for admin_id in select user_id from public.profiles where role = 'admin' loop
      insert into public.notifications (recipient_id, category, title, body, data)
      values (
        admin_id,
        'season_and_tournament',
        'Sezon finali zamanı',
        format('%s %s sezonu finale dönemine girdi. Bracket''i başlat.', s.name, s.year),
        jsonb_build_object('season_id', s.id, 'action', 'start_finale')
      );
    end loop;
  end loop;
end;
$$;

select cron.schedule(
  'season_lifecycle_daily',
  '0 3 * * *',  -- 03:00 UTC = 06:00 TR
  $$select public.season_lifecycle_check();$$
);
