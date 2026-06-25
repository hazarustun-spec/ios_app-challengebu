create table if not exists public.live_activity_tokens (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null,
  update_token text not null,
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.live_activity_tokens enable row level security;
-- Writes go through the register-activity-token edge fn (service role).
-- No direct client read/write policies: participants may not read tokens directly.
