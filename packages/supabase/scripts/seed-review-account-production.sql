-- Seed / complete the App Store review account on PRODUCTION.
-- Run in Supabase Dashboard → SQL Editor (project zbjkauljjdosyuwguuhv).
--
-- Prerequisite: appreview42@proton.me must exist in auth.users (sign in once
-- via the app with OTP 424242 / review-login, or create via Auth dashboard).
--
-- After this script: reviewer lands on main tabs, has ladder row + opponent pool.

do $$
declare
  v_uid uuid;
  v_dept uuid;
  v_dummy uuid := gen_random_uuid();
begin
  select id into v_uid from auth.users where lower(email) = 'appreview42@proton.me' limit 1;
  if v_uid is null then
    raise exception 'auth.users row missing for appreview42@proton.me — sign in once in the app first';
  end if;

  select id into v_dept from public.departments
   where name ilike '%Fizik Bölümü%' and program_level = 'lisans'
   limit 1;

  insert into public.profiles (
    user_id, role, first_name, last_name, email,
    pronoun, gender_category, department_id, class_year,
    show_department, show_class_year,
    skill_self_assessment, dominant_hand, availability_windows,
    status, kvkk_accepted_at
  ) values (
    v_uid, 'player', 'App', 'Review', 'appreview42@proton.me',
    'they/them', 'open_only', v_dept, '3',
    true, true,
    'orta', 'sag', array['weekday_evening','weekend_morning'],
    'active', now()
  )
  on conflict (user_id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    gender_category = excluded.gender_category,
    department_id = excluded.department_id,
    class_year = excluded.class_year,
    skill_self_assessment = excluded.skill_self_assessment,
    dominant_hand = excluded.dominant_hand,
    availability_windows = excluded.availability_windows,
    status = 'active',
    kvkk_accepted_at = coalesce(public.profiles.kvkk_accepted_at, now());

  insert into public.elo_ratings (profile_id, category, rating, matches_played)
  values
    (v_uid, 'open_tek', 1248, 3),
    (v_uid, 'kadin_tek', 1200, 0)
  on conflict (profile_id, category) do update set
    rating = excluded.rating,
    matches_played = excluded.matches_played;

  -- Optional second player so leaderboard / opponent suggest is not empty.
  insert into public.profiles (
    user_id, role, first_name, last_name, email,
    pronoun, gender_category, department_id, class_year,
    show_department, show_class_year,
    skill_self_assessment, dominant_hand, availability_windows,
    status, kvkk_accepted_at
  ) values (
    v_dummy, 'player', 'Demo', 'Rakip', 'demo.rakip.review@std.bogazici.edu.tr',
    'she/her', 'kadin', v_dept, '2',
    true, true,
    'orta', 'sag', array['weekday_evening'],
    'active', now()
  )
  on conflict (user_id) do nothing;

  insert into public.elo_ratings (profile_id, category, rating, matches_played)
  values (v_dummy, 'kadin_tek', 1185, 5)
  on conflict (profile_id, category) do nothing;

  raise notice 'Review account seeded for user_id=%', v_uid;
end $$;

-- Verify:
select user_id, first_name, last_name, email, gender_category, status
  from public.profiles where email in ('appreview42@proton.me', 'demo.rakip.review@std.bogazici.edu.tr');