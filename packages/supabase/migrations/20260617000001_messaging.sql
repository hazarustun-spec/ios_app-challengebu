-- Plan 8 (final) — Match-context 1:1 messaging.
-- conversations + messages + user_blocks. (user_reports lives in the moderation
-- migration; user_blocks lives HERE because the messages INSERT policy
-- references it.)

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.match_requests(id) on delete cascade,
  participant_low uuid not null references public.profiles(user_id) on delete cascade,
  participant_high uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  constraint participants_ordered check (participant_low < participant_high),
  unique (request_id, participant_low, participant_high)
);
create index conversations_low_idx on public.conversations (participant_low);
create index conversations_high_idx on public.conversations (participant_high);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conv_idx on public.messages (conversation_id, created_at);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(user_id) on delete cascade,
  blocked_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.user_blocks enable row level security;

-- Is the caller one of the two participants of the given conversation?
create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv_id and auth.uid() in (c.participant_low, c.participant_high)
  );
$$;
revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

-- Is either participant of the conversation blocking the other? SECURITY DEFINER
-- so it can see blocks in BOTH directions (user_blocks RLS only exposes a
-- caller's own block rows, which would hide "the other person blocked me").
create or replace function public.is_conversation_blocked(conv_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.conversations c
    join public.user_blocks ub
      on (ub.blocker_id = c.participant_low and ub.blocked_id = c.participant_high)
      or (ub.blocker_id = c.participant_high and ub.blocked_id = c.participant_low)
    where c.id = conv_id
  );
$$;
revoke all on function public.is_conversation_blocked(uuid) from public;
grant execute on function public.is_conversation_blocked(uuid) to authenticated;

-- conversations: participants read; participants who belong to the request create.
create policy "participants read conversations" on public.conversations
  for select to authenticated
  using (auth.uid() in (participant_low, participant_high));

create policy "participants create conversations" on public.conversations
  for insert to authenticated
  with check (
    auth.uid() in (participant_low, participant_high)
    and exists (
      select 1 from public.match_requests r
      where r.id = request_id
        and (
          r.creator_id = auth.uid()
          or r.target_id = auth.uid()
          or exists (
            select 1 from public.match_request_applications a
            where a.request_id = r.id and a.applicant_id = auth.uid()
          )
        )
    )
  );

-- messages: participants read; a participant sends if neither party blocked the other.
create policy "participants read messages" on public.messages
  for select to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "participants send messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    and not public.is_conversation_blocked(conversation_id)
  );

-- Only the recipient may flip read_at (the mark_conversation_read RPC is the
-- normal path; this policy allows the direct update too).
create policy "recipient marks read" on public.messages
  for update to authenticated
  using (public.is_conversation_participant(conversation_id) and sender_id <> auth.uid())
  with check (public.is_conversation_participant(conversation_id));

-- user_blocks: a user manages their own block rows.
create policy "manage own blocks" on public.user_blocks
  for all to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());
