-- A Vault-seeded secret can carry embedded whitespace/newlines from a
-- copy-paste (the value came in 3 chars longer than the real key). Embedded
-- whitespace corrupts the 'Bearer <token>' Authorization header — pg_net got
-- back 401 "Auth header is not 'Bearer {token}'". Strip ALL whitespace from the
-- Vault values before building the request so the header is always clean.
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
    select regexp_replace(decrypted_secret, '\s', '', 'g') into v_url
      from vault.decrypted_secrets where name = 'edge_functions_url' limit 1;
    select regexp_replace(decrypted_secret, '\s', '', 'g') into v_key
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
    null;
  end;
  return new;
end;
$$;
