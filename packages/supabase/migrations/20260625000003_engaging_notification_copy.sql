-- Refresh notification copy to the engaging, emoji-rich ChallengeBu! voice.
-- The original definitions (20260620000001 open-call, 20260610000003 season
-- lifecycle) are already live on the cloud, and editing those files in place
-- does not re-run them — so this new migration re-installs the two affected
-- DB functions with the new copy. Bodies are otherwise unchanged.

-- open_listings: someone applied to your open call.
create or replace function public.notify_open_call_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
  v_name text;
begin
  select creator_id into v_creator
    from public.match_requests
    where id = new.request_id;

  if v_creator is null or v_creator = new.applicant_id then
    return new;
  end if;

  select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    into v_name
    from public.profiles
    where user_id = new.applicant_id;

  insert into public.notifications (recipient_id, category, title, body, data)
  values (
    v_creator,
    'open_listings',
    'Yeni başvuru geldi! ⚡️',
    coalesce(v_name, 'Bir oyuncu') || ' açık ilanına başvurdu — rakibini seç! 🎾',
    jsonb_build_object(
      'request_id', new.request_id,
      'applicant_id', new.applicant_id,
      'action', 'open_call_application'
    )
  );

  return new;
end;
$$;

-- season_lifecycle: finale start + season-close admin notices.
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
  update public.seasons
  set status = 'active'
  where status = 'upcoming' and starts_at <= now();

  for s in
    select id, name, year from public.seasons
    where status = 'active' and finale_starts_at <= now()
  loop
    update public.seasons set status = 'finale' where id = s.id;

    for admin_id in select user_id from public.profiles where role = 'admin' loop
      insert into public.notifications (recipient_id, category, title, body, data)
      values (
        admin_id,
        'season_lifecycle',
        'Final zamanı! 🏆',
        format('%s %s sezonu finale girdi. Bracket''i başlat! 🎯', s.name, s.year),
        jsonb_build_object('season_id', s.id, 'action', 'start_finale')
      );
    end loop;
  end loop;

  for s in
    select id, name, year from public.seasons
    where status = 'finale' and finale_ends_at <= now()
  loop
    select count(*) into pending_tournaments
    from public.tournaments
    where season_id = s.id and status <> 'completed';

    if pending_tournaments = 0 then
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
            'season_lifecycle',
            'Sezonu kapatma vakti! 🥇',
            format('%s %s finali tamamlandı, tüm bracketler bitti. ELO''yu sıfırla ve rozetleri dağıt! 🏅', s.name, s.year),
            jsonb_build_object('season_id', s.id, 'action', 'close_season')
          );
        end loop;
      end if;
    end if;
  end loop;
end;
$$;
