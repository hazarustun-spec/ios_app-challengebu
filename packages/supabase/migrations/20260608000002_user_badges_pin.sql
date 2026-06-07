alter table public.user_badges
  add column if not exists pinned_at timestamptz;

create index if not exists user_badges_profile_pinned_idx
  on public.user_badges (profile_id, pinned_at)
  where pinned_at is not null;

-- Allow users to update pinned_at on their own user_badges rows.
create policy "Users can pin/unpin own badges"
  on public.user_badges for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
