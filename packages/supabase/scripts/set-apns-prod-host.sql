-- APNs'i ÜRETİM ortamına geçir (TestFlight + App Store build'leri production APNs kullanır).
-- DİKKAT: Bunu çalıştırınca Xcode/dev (sandbox) build'lerinin push'u çalışmayı bırakır
-- (production APNs sandbox token'larını BadDeviceToken ile reddeder). Üretim build'i
-- yayınlarken çalıştır. Geri dönmek için değeri https://api.sandbox.push.apple.com yap.
do $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'apns_host';
  if v_id is null then
    perform vault.create_secret('https://api.push.apple.com', 'apns_host', 'APNs host (production)');
  else
    perform vault.update_secret(v_id, 'https://api.push.apple.com', 'apns_host', 'APNs host (production)');
  end if;
end $$;

-- Doğrulama:
select name, decrypted_secret from vault.decrypted_secrets where name = 'apns_host';
