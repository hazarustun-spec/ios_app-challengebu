-- Put the App Store review account back to its seeded state on every sign-in.
--
-- Why
-- ---
-- The demo account is the only account App Review touches, and reviewers leave
-- it changed: 1.1.0 (27) was reviewed on an account a previous reviewer had
-- deleted from inside the app (Guideline 5.1.1(v) — they test that), which
-- anonymize-account tombstones in place (first_name 'Silinmiş', scrambled
-- e-mail, status 'anonymized'). Re-seeding by hand only helps until the next
-- reviewer touches something, and there is no way to know what state a review
-- will start from — the seed script is run once, days before anyone opens the
-- app.
--
-- So the reset moves into the login itself. review-login calls this function
-- before handing back a session, and every review sign-in therefore starts
-- from exactly the state seed-review-account-production.sql produces:
--
--   • profile active, un-anonymized, with the seeded demographics
--   • first_name/last_name blank, so the reviewer still walks the full
--     onboarding wizard — Apple asked to see it, and the seed comment is
--     explicit that these stay empty
--   • the demo match startable again, whatever the last reviewer did with it
--     (started, scored, voided by cron)
--   • the incoming challenge pending again, even if it was accepted
--   • the "Oynanmadı" voided leftovers cleared out of match history
--
-- Scope is the one hard-coded review mailbox. It resolves the account through
-- auth.users, not profiles.email, because a deleted account no longer carries
-- its real address in the profile row.
--
-- Remove this with the rest of the demo data after approval (companion:
-- scripts/cleanup-review-seed-production.sql).

create or replace function public.reset_review_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rev   uuid;
  v_court uuid;
  o2 uuid := 'aaaa0002-0000-4000-8000-000000000002';
  o5 uuid := 'aaaa0005-0000-4000-8000-000000000005';
begin
  select id into v_rev from auth.users
   where lower(email) = 'appreview42@proton.me' limit 1;
  -- Nothing to reset on the very first sign-in: review-login creates the auth
  -- user, and the seed script creates the profile and the demo rows.
  if v_rev is null then
    return;
  end if;

  -- 1. Un-anonymize / un-onboard the profile. Blank names are deliberate — see
  --    the header. Only touches a row that already exists; profile creation
  --    stays the seed script's job so this function has no opinion about
  --    columns it is not restoring.
  update public.profiles set
    first_name            = '',
    last_name             = '',
    email                 = 'appreview42@proton.me',
    phone                 = null,
    avatar_url            = null,
    status                = 'active',
    pronoun               = 'they/them',
    pronoun_custom        = null,
    gender_category       = 'open_only',
    class_year            = '3',
    show_department       = true,
    show_class_year       = true,
    skill_self_assessment = 'orta',
    dominant_hand         = 'sag',
    availability_windows  = array['weekday_evening','weekend_morning'],
    kvkk_accepted_at      = coalesce(kvkk_accepted_at, now())
  where user_id = v_rev;

  select id into v_court from public.courts where is_active order by display_order limit 1;
  if v_court is null then
    return;
  end if;

  -- 2. The one match the reviewer can start immediately. played_at 90 minutes
  --    back clears both the 15-minute start gate and the score gate.
  update public.matches set
    court_id      = v_court,
    played_at     = now() - interval '90 minutes',
    score_team_a  = 0,
    score_team_b  = 0,
    winner_team   = null,
    status        = 'awaiting_confirmation',
    started_by    = array[o2]::uuid[],
    confirmed_by  = '{}'::uuid[],
    confirmed_at  = null,
    voided_reason = null
  where id = 'cccc0001-0000-4000-8000-000000000001';

  -- 3. The incoming challenge, back to pending.
  update public.match_requests set
    proposed_date = current_date,
    proposed_time = (now() - interval '20 minutes')::time,
    court_id      = v_court,
    status        = 'pending',
    expires_at    = now() + interval '30 days',
    accepted_at   = null
  where id = 'dddd0001-0000-4000-8000-000000000001'
    and creator_id = o5;

  -- 4. Voided leftovers render in profile history as "Oynanmadı" 0-0 cards and
  --    make the demo account look broken. tournament_matches.match_id has no
  --    ON DELETE action, so bracket-linked rows are left alone.
  delete from public.matches m
   where m.status = 'voided'
     and (m.team_a_player_ids @> array[v_rev] or m.team_b_player_ids @> array[v_rev])
     and not exists (
       select 1 from public.tournament_matches tm where tm.match_id = m.id
     );
end;
$$;

-- Only the service role (review-login runs with it) may call this.
revoke all on function public.reset_review_account() from public;
revoke all on function public.reset_review_account() from anon, authenticated;
