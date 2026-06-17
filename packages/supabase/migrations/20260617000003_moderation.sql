-- Plan 8 (final) — user reports (blocks live with messaging in 20260617000001).

create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(user_id) on delete cascade,
  reported_id uuid not null references public.profiles(user_id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 2000),
  message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  constraint no_self_report check (reporter_id <> reported_id)
);
create index user_reports_status_idx on public.user_reports (status, created_at);

alter table public.user_reports enable row level security;

-- A user files + reads their own reports.
create policy "manage own reports" on public.user_reports
  for all to authenticated
  using (reporter_id = auth.uid())
  with check (reporter_id = auth.uid());

-- Admins read all reports (moderation queue).
create policy "admins read reports" on public.user_reports
  for select to authenticated
  using (public.is_admin());

-- Admins update report status.
create policy "admins update reports" on public.user_reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
