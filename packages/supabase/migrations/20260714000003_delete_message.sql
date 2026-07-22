-- "Delete for everyone" on a chat message. The sender soft-deletes their own
-- message: the row stays (so both clients render a "Bu mesaj silindi"
-- tombstone consistently) but the original text is overwritten so the content
-- is actually gone from the database, not just hidden client-side.

alter table public.messages
  add column if not exists deleted_at timestamptz;

create or replace function public.delete_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid;
  v_conv uuid;
begin
  select sender_id, conversation_id into v_sender, v_conv
  from public.messages
  where id = p_message_id;

  if v_sender is null then
    raise exception 'message not found';
  end if;
  if v_sender <> auth.uid() then
    raise exception 'only the sender can delete this message';
  end if;

  update public.messages
     set deleted_at = now(),
         body = '(silindi)'
   where id = p_message_id
     and deleted_at is null;

  -- If this was the conversation's last message, refresh the preview so the
  -- inbox row doesn't keep showing the deleted text.
  update public.conversations c
     set last_message_preview = 'Bir mesaj silindi'
   where c.id = v_conv
     and c.last_message_at = (
       select m.created_at from public.messages m where m.id = p_message_id
     );
end;
$$;

revoke all on function public.delete_message(uuid) from public;
grant execute on function public.delete_message(uuid) to authenticated;
