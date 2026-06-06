create type notification_category as enum (
  'match_proposals',
  'match_reminders',
  'score_confirmations',
  'elo_and_ranking',
  'badges',
  'season_and_tournament',
  'community_announcements',
  'inactivity_warning'
);

create type push_platform as enum ('ios', 'android');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(user_id) on delete cascade,
  category notification_category not null,
  title text not null,
  body text not null,
  data jsonb,
  read_at timestamptz,
  push_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;
create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_created_idx on public.notifications (created_at);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = recipient_id);

create policy "Users can mark their own notifications as read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create policy "Admins can view all notifications"
  on public.notifications for select
  to authenticated
  using (public.is_admin());

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  token text not null,
  platform push_platform not null,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (token)
);

create index push_tokens_profile_idx on public.push_tokens (profile_id);
create index push_tokens_last_active_idx on public.push_tokens (last_active_at);

alter table public.push_tokens enable row level security;

create policy "Users can manage their own push tokens"
  on public.push_tokens for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Admins can view all push tokens"
  on public.push_tokens for select
  to authenticated
  using (public.is_admin());

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  category notification_category not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (profile_id, category)
);

create index notification_prefs_profile_idx on public.notification_preferences (profile_id);

create trigger notification_prefs_set_updated_at
  before update on public.notification_preferences
  for each row
  execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "Users can manage their own preferences"
  on public.notification_preferences for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Defaults: when a profile is created, insert default preferences.
-- 'elo_and_ranking' default OFF, others ON.
create or replace function public.create_default_notification_preferences()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notification_preferences (profile_id, category, enabled)
  values
    (new.user_id, 'match_proposals', true),
    (new.user_id, 'match_reminders', true),
    (new.user_id, 'score_confirmations', true),
    (new.user_id, 'elo_and_ranking', false),
    (new.user_id, 'badges', true),
    (new.user_id, 'season_and_tournament', true),
    (new.user_id, 'community_announcements', true),
    (new.user_id, 'inactivity_warning', true);
  return new;
end;
$$;

create trigger profiles_create_default_prefs
  after insert on public.profiles
  for each row
  execute function public.create_default_notification_preferences();
