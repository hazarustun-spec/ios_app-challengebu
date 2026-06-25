-- Plan 8 Task A3 — revise notification_category enum to match the redesigned
-- Bildirimler + Ayarlar UI (Grup 8).
--
-- Pre-Plan-8 enum (8 values):
--   match_proposals, match_reminders, score_confirmations, elo_and_ranking,
--   badges, season_and_tournament, community_announcements, inactivity_warning
--
-- Plan-8 enum (8 values, target):
--   match_invitations, match_score_pending, badges_earned, season_lifecycle,
--   ladder_movement, community_announcements, open_listings, match_reminders
--
-- Rename map (data preserved where the concept survives, dropped where the
-- mobile UI no longer surfaces the category):
--   match_proposals        → match_invitations
--   match_reminders        → match_reminders          (unchanged)
--   score_confirmations    → match_score_pending
--   elo_and_ranking        → ladder_movement
--   badges                 → badges_earned
--   season_and_tournament  → season_lifecycle
--   community_announcements→ community_announcements  (unchanged)
--   inactivity_warning     → DROP (no Plan-8 equivalent; rows deleted)
--   (new)                  → open_listings            (added — sezon ilanları için)
--
-- The task plan also mentions placeholder names `dispute_updates` /
-- `doubles_invitations` for completeness. Neither was ever in our enum, so
-- there is nothing to delete for them — they're simply absent from the new
-- enum by construction, and the accompanying test asserts they remain
-- invalid post-migration.
--
-- Pre-launch project: no production data to preserve beyond local/dev
-- fixtures, but we still take care to remap rather than nuke so a developer
-- running the migration on top of an active local DB doesn't lose their
-- in-flight notifications.

-- 1) Drop notifications/prefs for categories we cannot map (inactivity_warning).
delete from public.notifications        where category = 'inactivity_warning';
delete from public.notification_preferences where category = 'inactivity_warning';

-- 2) Migrate existing rows in-place to the new category strings. We do this
--    via text so the rewrite happens BEFORE the enum type is swapped (Postgres
--    won't let us write the new string while the column is still the old enum
--    type, hence the temporary text column dance below).
--
-- notification_preferences has a UNIQUE(profile_id, category). If a profile
-- already had a row for the post-rename target (e.g., both 'match_proposals'
-- and the new 'match_invitations' somehow co-existed on a hand-seeded dev DB),
-- the rename would collide. Pre-launch we don't expect this, but be safe:
-- delete colliding new-side rows so the rename wins.
delete from public.notification_preferences
  where category::text in (
    'match_invitations', 'match_score_pending', 'badges_earned',
    'season_lifecycle', 'ladder_movement', 'open_listings'
  );

-- 3) Switch column type to text so we can write the new strings.
alter table public.notifications
  alter column category type text using category::text;
alter table public.notification_preferences
  alter column category type text using category::text;

-- 4) Apply the rename map.
update public.notifications set category = case category
  when 'match_proposals'       then 'match_invitations'
  when 'score_confirmations'   then 'match_score_pending'
  when 'elo_and_ranking'       then 'ladder_movement'
  when 'badges'                then 'badges_earned'
  when 'season_and_tournament' then 'season_lifecycle'
  else category
end;

update public.notification_preferences set category = case category
  when 'match_proposals'       then 'match_invitations'
  when 'score_confirmations'   then 'match_score_pending'
  when 'elo_and_ranking'       then 'ladder_movement'
  when 'badges'                then 'badges_earned'
  when 'season_and_tournament' then 'season_lifecycle'
  else category
end;

-- 5) Recreate the enum type with the Plan-8 value set.
drop type public.notification_category;

create type public.notification_category as enum (
  'match_invitations',
  'match_score_pending',
  'badges_earned',
  'season_lifecycle',
  'ladder_movement',
  'community_announcements',
  'open_listings',
  'match_reminders'
);

-- 6) Cast columns back to the enum. Any value that doesn't parse will raise,
--    which is the behaviour we want as a safety net against unmapped legacy
--    rows.
alter table public.notifications
  alter column category type public.notification_category
  using category::public.notification_category;

alter table public.notification_preferences
  alter column category type public.notification_category
  using category::public.notification_category;

-- 7) Replace the default-prefs trigger function so new profiles get a row for
--    each Plan-8 category. All defaults are ON: the redesigned Bildirimler
--    screen wants every channel opt-in by default; the user toggles them
--    individually. (Pre-Plan-8 had elo_and_ranking OFF; the new equivalent
--    `ladder_movement` is ON since the UI surfaces rank moves as a primary
--    engagement loop now.)
create or replace function public.create_default_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (profile_id, category, enabled) values
    (new.user_id, 'match_invitations',       true),
    (new.user_id, 'match_score_pending',     true),
    (new.user_id, 'badges_earned',           true),
    (new.user_id, 'season_lifecycle',        true),
    (new.user_id, 'ladder_movement',         true),
    (new.user_id, 'community_announcements', true),
    (new.user_id, 'open_listings',           true),
    (new.user_id, 'match_reminders',         true);
  return new;
end;
$$;

-- 8) Replace `season_lifecycle_check()` so the embedded `category` literals use
--    the new enum value (`season_lifecycle` instead of `season_and_tournament`).
--    Earlier migrations (20260607000008 + 20260609000004) installed the
--    function with the legacy value baked in; rather than editing those files
--    (they remain historically accurate), we re-install the latest body here
--    with the rename applied. Body is otherwise identical to
--    20260609000004_cron_finale_close_notice.sql.
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
        'season_lifecycle',
        'Final zamanı! 🏆',
        format('%s %s sezonu finale girdi. Bracket''i başlat! 🎯', s.name, s.year),
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
