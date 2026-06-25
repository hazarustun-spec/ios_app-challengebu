-- When someone applies to an open call (insert into match_request_applications),
-- notify the listing's creator in-app (home bell + notifications list). The new
-- apply path is a direct client insert (no Edge Function), so this AFTER INSERT
-- trigger is what surfaces the notification. SECURITY DEFINER + pinned
-- search_path so it can write to notifications regardless of the applicant's RLS.

create or replace function public.notify_open_call_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
  v_name text;
begin
  select creator_id into v_creator
    from public.match_requests
    where id = new.request_id;

  -- No notification for an orphan request or a self-application.
  if v_creator is null or v_creator = new.applicant_id then
    return new;
  end if;

  select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    into v_name
    from public.profiles
    where user_id = new.applicant_id;

  insert into public.notifications (recipient_id, category, title, body, data)
  values (
    v_creator,
    'open_listings',
    'Yeni başvuru geldi! ⚡️',
    coalesce(v_name, 'Bir oyuncu') || ' açık ilanına başvurdu — rakibini seç! 🎾',
    jsonb_build_object(
      'request_id', new.request_id,
      'applicant_id', new.applicant_id,
      'action', 'open_call_application'
    )
  );

  return new;
end;
$$;

revoke all on function public.notify_open_call_application() from public;

drop trigger if exists trg_notify_open_call_application on public.match_request_applications;
create trigger trg_notify_open_call_application
  after insert on public.match_request_applications
  for each row execute function public.notify_open_call_application();
