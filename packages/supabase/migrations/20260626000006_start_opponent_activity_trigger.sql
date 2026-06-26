-- AFTER UPDATE on public.matches → when `started_by` changes, push-to-start the
-- Live Activity on every OTHER participant's device, via the start-opponent-activity
-- edge fn.
--
-- Near-verbatim copy of public.push_live_score_on_update() (see
-- 20260626000004_push_live_score_trigger.sql): SECURITY DEFINER, Vault values
-- whitespace-stripped so the 'Bearer <token>' header is always clean (the Vault
-- service_role_key value is mirrored to equal INTERNAL_PUSH_KEY, which the edge
-- fn's auth check compares against). The whole body is wrapped so a push failure
-- never blocks the match write.
--
-- start_match() appends the caller's uid to started_by, so AFTER UPDATE fires on
-- every "Maçı Başlat" tap; the WHEN clause restricts it to started_by changes.
create or replace function public.start_opponent_activity_on_update()
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
    select regexp_replace(decrypted_secret, '\s', '', 'g') into v_url
      from vault.decrypted_secrets where name = 'edge_functions_url' limit 1;
    select regexp_replace(decrypted_secret, '\s', '', 'g') into v_key
      from vault.decrypted_secrets where name = 'service_role_key' limit 1;

    if v_url is not null and v_key is not null then
      perform net.http_post(
        url     := v_url || '/start-opponent-activity',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body    := jsonb_build_object('matchId', new.id::text)
      );
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_start_opponent_activity on public.matches;
create trigger trg_start_opponent_activity
  after update on public.matches
  for each row
  when (new.started_by is distinct from old.started_by)
  execute function public.start_opponent_activity_on_update();
