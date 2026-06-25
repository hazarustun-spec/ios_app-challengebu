-- AFTER UPDATE on public.live_match_scores → push the new content-state to every
-- registered Live Activity token for the match, via the push-live-score edge fn.
--
-- Near-verbatim copy of public.dispatch_push_on_notification() (see
-- 20260625000002_push_dispatch_strip_ws.sql): SECURITY DEFINER, Vault values
-- whitespace-stripped so the 'Bearer <token>' header is always clean (the Vault
-- service_role_key value is mirrored to equal INTERNAL_PUSH_KEY, which the edge
-- fn's auth check compares against). The whole body is wrapped so a push failure
-- never blocks the score write.
--
-- award_point always ends with an UPDATE on the row (even the first point, which
-- the RPC seeds via INSERT ... ON CONFLICT then UPDATEs), so AFTER UPDATE fires
-- on every scored point.
create or replace function public.push_live_score_on_update()
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
        url     := v_url || '/push-live-score',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body    := jsonb_build_object('notificationId', null, 'matchId', new.match_id::text)
      );
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_push_live_score on public.live_match_scores;
create trigger trg_push_live_score
  after update on public.live_match_scores
  for each row
  execute function public.push_live_score_on_update();
