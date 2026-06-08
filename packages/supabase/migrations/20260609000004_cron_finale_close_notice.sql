-- Extend season_lifecycle_check() with a "finale wrapped up, ready to close"
-- notification. Auto-invoking close-season from pg_cron requires either
-- pg_net + service-role JWT stored in vault (broader infra change) or a SQL
-- equivalent of the Edge Function — both bigger scope than what this commit
-- targets. The cron now:
--
-- 1. (existing) upcoming → active
-- 2. (existing) active → finale (notify admins)
-- 3. (new) status = 'finale' AND finale_ends_at <= now() AND every tournament
--    in the season is 'completed' (or no tournaments exist) → notify admins
--    that close-season is ready to be invoked from the admin panel.
--
-- The reason we don't flip the row to 'closed' here is that close-season
-- soft-resets ELO and awards seasonal badges — both side effects we want
-- the admin to acknowledge by clicking, not the cron to do silently. Plan 8
-- release can add the auto-invoke once we have pg_net + vault configured.

create or replace function public.season_lifecycle_check()
returns void
language plpgsql
security definer
as $$
declare
  s record;
  admin_id uuid;
  pending_tournaments int;
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

  -- Notify: finale done, ready to close
  for s in
    select id, name, year from public.seasons
    where status = 'finale' and finale_ends_at <= now()
  loop
    select count(*) into pending_tournaments
    from public.tournaments
    where season_id = s.id and status <> 'completed';

    if pending_tournaments = 0 then
      -- Skip if we already pinged admins about this season today.
      if not exists (
        select 1 from public.notifications
        where data->>'season_id' = s.id::text
          and data->>'action' = 'close_season'
          and created_at > now() - interval '20 hours'
      ) then
        for admin_id in select user_id from public.profiles where role = 'admin' loop
          insert into public.notifications (recipient_id, category, title, body, data)
          values (
            admin_id,
            'season_and_tournament',
            'Sezonu kapatabilirsin',
            format('%s %s sezon finali bitti, tüm bracketler tamamlandı. close-season çağırarak ELO''yu sıfırla ve sezon rozetlerini dağıt.', s.name, s.year),
            jsonb_build_object('season_id', s.id, 'action', 'close_season')
          );
        end loop;
      end if;
    end if;
  end loop;
end;
$$;
