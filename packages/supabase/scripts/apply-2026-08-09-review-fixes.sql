-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (production, zbjkauljjdosyuwguuhv).
-- =============================================================================
-- Combines the two migrations behind the 1.1.0 (27) rejection fix:
--
--   20260809000002  drop pronoun_custom_when_other   ← the actual rejection
--   20260809000001  reset_review_account()           ← keeps the demo account
--                                                      healthy between reviews
--
-- Idempotent. Safe to re-run.
-- =============================================================================

-- 1 --------------------------------------------------------------------------
-- The rejection. Picking "Diğer / belirtmek istemiyorum" in the onboarding
-- wizard writes pronoun = 'other'; no screen collects pronoun_custom, so the
-- final step failed with 23514 and the account could never be created. The
-- same constraint also blocked profile edit and in-app account deletion for
-- anyone whose pronoun was 'other'.
alter table public.profiles
  drop constraint if exists pronoun_custom_when_other;

comment on column public.profiles.pronoun_custom is
  'Free-text pronoun. Reserved: no screen collects it today — the onboarding '
  '"other" option means "prefer not to say" and leaves this null.';

-- 2 --------------------------------------------------------------------------
-- Per-login reset of the App Store review account, so a review never starts on
-- whatever state the previous reviewer left behind (a deleted/anonymized
-- profile, a played-out demo match, an accepted challenge). review-login calls
-- this before handing back a session.
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
  if v_rev is null then
    return;
  end if;

  -- Blank names are deliberate: the reviewer still walks the full onboarding
  -- wizard, which is what Apple asked to see.
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

  update public.match_requests set
    proposed_date = current_date,
    proposed_time = (now() - interval '20 minutes')::time,
    court_id      = v_court,
    status        = 'pending',
    expires_at    = now() + interval '30 days',
    accepted_at   = null
  where id = 'dddd0001-0000-4000-8000-000000000001'
    and creator_id = o5;

  delete from public.matches m
   where m.status = 'voided'
     and (m.team_a_player_ids @> array[v_rev] or m.team_b_player_ids @> array[v_rev])
     and not exists (
       select 1 from public.tournament_matches tm where tm.match_id = m.id
     );
end;
$$;

revoke all on function public.reset_review_account() from public;
revoke all on function public.reset_review_account() from anon, authenticated;

-- Verify ----------------------------------------------------------------------
select 'pronoun_constraint_left' as check,
       count(*)::text as n
  from pg_constraint
 where conname = 'pronoun_custom_when_other'
union all
select 'reset_fn_installed',
       count(*)::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'reset_review_account';
-- expect: pronoun_constraint_left 0 · reset_fn_installed 1
