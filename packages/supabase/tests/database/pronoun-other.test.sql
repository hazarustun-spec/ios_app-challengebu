-- pgTAP regression test for pronoun = 'other' without a custom pronoun.
--
-- The onboarding wizard's fourth pronoun option is "Diğer / belirtmek
-- istemiyorum" and no screen in the app collects a custom pronoun, so every
-- write that picks it leaves pronoun_custom null. profiles used to carry
-- pronoun_custom_when_other, which rejected exactly that with 23514 — the
-- account could never be created, and App Review reported it as "App displayed
-- an error when were trying to sign up" against 1.1.0 (27).
-- 20260809000002 dropped the constraint. These assertions fail if it ever
-- comes back.
--
-- Run: supabase test db tests/database/pronoun-other.test.sql
begin;
select plan(4);

\set p1 '11119903-1111-1111-1111-111111111111'
\set p2 '11119904-1111-1111-1111-111111111111'

insert into auth.users (id) values (:'p1'), (:'p2');

-- ── Sign-up: create a profile with "prefer not to say" ──────────────────────
select lives_ok(
  $$ insert into public.profiles
       (user_id, first_name, last_name, email, pronoun, pronoun_custom,
        gender_category, class_year, skill_self_assessment, dominant_hand)
     values
       ('11119903-1111-1111-1111-111111111111', 'Ada', 'Other',
        'p1_other@test.local', 'other', null,
        'open_only', '1', 'orta', 'sag') $$,
  'onboarding can create a profile with pronoun other and no custom text');

-- ── Profile edit: switch an existing profile to "other" ─────────────────────
insert into public.profiles
  (user_id, first_name, last_name, email, pronoun, gender_category,
   class_year, skill_self_assessment, dominant_hand)
values
  (:'p2', 'Lee', 'Switch', 'p2_other@test.local', 'he/him', 'erkek',
   '1', 'orta', 'sag');

select lives_ok(
  $$ update public.profiles
        set pronoun = 'other', pronoun_custom = null
      where user_id = '11119904-1111-1111-1111-111111111111' $$,
  'an existing profile can be switched to pronoun other');

-- ── Account deletion: anonymize-account nulls pronoun_custom in place ───────
select lives_ok(
  $$ update public.profiles
        set first_name = 'Silinmiş', last_name = 'Oyuncu',
            pronoun_custom = null, status = 'anonymized'
      where user_id = '11119903-1111-1111-1111-111111111111' $$,
  'a profile whose pronoun is other can still be anonymized');

-- ── The constraint itself is gone ───────────────────────────────────────────
select is_empty(
  $$ select conname from pg_constraint
      where conname = 'pronoun_custom_when_other' $$,
  'pronoun_custom_when_other is not on the table');

select * from finish();
rollback;
