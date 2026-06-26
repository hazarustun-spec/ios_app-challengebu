-- Device/user-level APNs push-to-start tokens for Live Activities.
--
-- Apple's push-to-start token (Activity<Attributes>.pushToStartTokenUpdates) is
-- NOT per-match: it can start ANY activity of that attributes type, and exists
-- before any match begins. So it is keyed by user_id (one row per user), captured
-- once at app startup after auth — deliberately separate from live_activity_tokens
-- (keyed by (match_id,user_id), whose rows only exist after an activity starts).
create table if not exists public.push_to_start_tokens (
  user_id    uuid primary key,
  token      text not null,
  updated_at timestamptz not null default now()
);

alter table public.push_to_start_tokens enable row level security;
-- Writes go through the register-push-to-start-token edge fn (service role).
-- No client read/write policies: tokens are not readable by clients.
