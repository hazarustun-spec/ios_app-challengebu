-- Plan 8 (final) — messaging RPCs.

-- Get the (request, pair) conversation, creating it if absent. Enforces that the
-- caller belongs to the request (creator, target, or an applicant).
create or replace function public.get_or_create_conversation(
  p_request_id uuid, p_other_user_id uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  lo uuid := least(uid, p_other_user_id);
  hi uuid := greatest(uid, p_other_user_id);
  conv_id uuid;
begin
  if uid = p_other_user_id then
    raise exception 'cannot message yourself' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.match_requests r
    where r.id = p_request_id and uid in (r.creator_id, r.target_id)
  ) and not exists (
    select 1 from public.match_request_applications a
    where a.request_id = p_request_id and a.applicant_id = uid
  ) then
    raise exception 'not a participant of this request' using errcode = '42501';
  end if;

  select id into conv_id from public.conversations
    where request_id = p_request_id and participant_low = lo and participant_high = hi;
  if conv_id is null then
    insert into public.conversations (request_id, participant_low, participant_high)
      values (p_request_id, lo, hi) returning id into conv_id;
  end if;
  return conv_id;
end; $$;
revoke all on function public.get_or_create_conversation(uuid, uuid) from public;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;

-- Mark all messages from the OTHER participant as read.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'not a participant' using errcode = '42501';
  end if;
  update public.messages
    set read_at = now()
    where conversation_id = p_conversation_id
      and sender_id <> auth.uid()
      and read_at is null;
end; $$;
revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Total unread messages across the caller's conversations.
create or replace function public.unread_message_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where auth.uid() in (c.participant_low, c.participant_high)
    and m.sender_id <> auth.uid()
    and m.read_at is null;
$$;
revoke all on function public.unread_message_count() from public;
grant execute on function public.unread_message_count() to authenticated;
