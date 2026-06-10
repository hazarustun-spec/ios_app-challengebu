-- packages/supabase/migrations/20260610000005_kvkk_consent.sql
-- Plan 8 Phase A5: KVKK + Gizlilik Politikası consent kaydı

alter table public.profiles
  add column kvkk_accepted_at timestamptz not null default now();

comment on column public.profiles.kvkk_accepted_at is
  'Kullanıcının KVKK + Gizlilik Politikasını kabul ettiği zaman damgası. Email step inline checkbox ile set edilir (Phase D3 sign-in screen). Migration applied with default now() so existing pre-launch profiles get a backfilled timestamp.';
