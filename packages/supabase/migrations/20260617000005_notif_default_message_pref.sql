-- Plan 8 (final) — seed message_received in the default notification preferences
-- (separate migration so the new enum value from 20260617000004 is committed).

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
    (new.user_id, 'match_reminders',         true),
    (new.user_id, 'message_received',        true);
  return new;
end;
$$;
