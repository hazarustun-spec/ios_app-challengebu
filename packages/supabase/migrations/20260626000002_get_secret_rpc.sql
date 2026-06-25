-- SECURITY DEFINER RPC so edge functions can read Vault secrets
-- without needing direct access to vault.decrypted_secrets.
-- The raw value is returned (no whitespace stripping) so the .p8 PEM
-- keeps its internal newlines for importKey to parse correctly.
create or replace function public.get_secret(p_name text) returns text
language sql security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;

revoke execute on function public.get_secret(text) from anon, authenticated;
