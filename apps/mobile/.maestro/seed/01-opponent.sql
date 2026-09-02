-- 01-opponent.sql — psql companion to seed-opponent.js (TWO-USER SEEDING 1/4).
--
-- Creates the opponent auth user + an ACTIVE 'kadin' profile so the signed-in
-- user's default kadin_tek challenge has a valid rival. Idempotent.
--
-- Use this only if you drive seeding EXTERNALLY (Maestro's runScript JS sandbox
-- cannot shell out to psql — inside a flow use seed-opponent.js instead). Run:
--   psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' \
--     -f apps/mobile/.maestro/seed/01-opponent.sql
--
-- Opponent email is hard-coded to match the Maestro flows; change in one place.
\set opp_email '''rakip.test@example.edu.tr'''

-- Minimal local auth user (LOCAL DEV ONLY — bypasses GoTrue).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated', :opp_email,
  crypt('Passw0rd!seed', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
where not exists (select 1 from auth.users where email = :opp_email);

insert into public.profiles (
  user_id, first_name, last_name, email, pronoun, gender_category,
  class_year, skill_self_assessment, dominant_hand, status
)
select u.id, 'Rakip', 'Test', u.email, 'she/her', 'kadin',
       '2', 'orta', 'sag', 'active'
from auth.users u
where u.email = :opp_email
on conflict (user_id) do nothing;
