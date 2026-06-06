create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(user_id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_action_idx on public.audit_log (action);
create index audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

create policy "Only admins view audit log"
  on public.audit_log for select
  to authenticated
  using (public.is_admin());

-- Inserts from Edge Functions

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(user_id),
  title text not null,
  body text not null,
  target_filter jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  dismissed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_published_idx on public.announcements (published_at desc)
  where published_at is not null;

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row
  execute function public.set_updated_at();

alter table public.announcements enable row level security;

create policy "Authenticated can view published announcements"
  on public.announcements for select
  to authenticated
  using (published_at is not null);

create policy "Admins manage announcements"
  on public.announcements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
