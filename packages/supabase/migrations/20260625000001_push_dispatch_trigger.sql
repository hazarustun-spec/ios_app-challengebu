-- Auto-deliver a push for every notification row.
--
-- Until now `send-push-notification` (admin-only) was the single push path and
-- no real feature called it, so in-app notifications never reached the device.
-- This adds an AFTER-INSERT trigger on public.notifications that fires the
-- `dispatch-push` Edge Function (via pg_net) for EVERY new notification —
-- badges, match invitations, open-call applications, messages, etc. — which
-- then sends through Expo, gated by the recipient's per-category preference.
--
-- The Edge Function base URL + service-role key are read from Vault (seeded
-- out-of-band, never committed) under the secret names `edge_functions_url`
-- and `service_role_key`. The whole dispatch is wrapped so that a missing
-- secret, a missing extension, or any HTTP error can NEVER block the
-- notification insert itself.

create extension if not exists pg_net;

create or replace function public.dispatch_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault, net
as $$
declare
  v_url text;
  v_key text;
begin
  begin
    select decrypted_secret into v_url
      from vault.decrypted_secrets where name = 'edge_functions_url' limit 1;
    select decrypted_secret into v_key
      from vault.decrypted_secrets where name = 'service_role_key' limit 1;

    if v_url is not null and v_key is not null then
      perform net.http_post(
        url     := v_url || '/dispatch-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body    := jsonb_build_object('notificationId', new.id::text)
      );
    end if;
  exception when others then
    -- Push wiring must never block a notification insert.
    null;
  end;
  return new;
end;
$$;

revoke execute on function public.dispatch_push_on_notification() from authenticated, anon;

drop trigger if exists trg_dispatch_push on public.notifications;
create trigger trg_dispatch_push
  after insert on public.notifications
  for each row execute function public.dispatch_push_on_notification();
