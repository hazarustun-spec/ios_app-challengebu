-- Feature #0: in-app feedback. Users submit free-text feedback (with a coarse
-- category) from Settings; the owner reads it in the Supabase dashboard / admin.
--
-- RLS: a user may insert and read only their own rows; admins may read all.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  category text not null default 'general',
  body text not null,
  app_version text,
  platform text,
  created_at timestamptz not null default now(),
  constraint feedback_body_len check (char_length(body) between 1 and 2000)
);

create index feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

create policy "Users can submit their own feedback"
  on public.feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view their own feedback"
  on public.feedback for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can manage all feedback"
  on public.feedback for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
