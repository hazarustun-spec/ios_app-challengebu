-- Seed elo_ratings when a profile's gender_category changes, not only on insert.
--
-- trg_seed_elo_ratings (20260714000001) fires `after insert on profiles`. That
-- covers a brand-new signup, but not the two paths that change gender on an
-- existing row:
--
--   1. Re-onboarding after account deletion. anonymize-account keeps the
--      profile row, so use-submit-onboarding.ts takes its UPDATE branch — an
--      INSERT-only trigger never sees it.
--   2. A user correcting the category they picked during onboarding.
--
-- The symptom is quiet and confusing. gender_category flips to 'erkek' while
-- elo_ratings still holds the rows seeded for the previous gender, so the user
-- has no erkek_tek row at all. app/(tabs)/index.tsx then picks their primary
-- category by walking ORDER = ['erkek_tek','kadin_tek','open_tek'] and falls
-- through to kadin_tek — which drives the home hero, the ELO trend and the
-- suggested-opponent list. A man re-onboards and is shown women to challenge.
--
-- Only inserts what is missing. Rows for the old gender are left alone: they
-- may carry played matches and rating history, and deleting them would erase
-- results that really happened. A stale row is harmless once the correct one
-- exists, because the client prefers the category matching gender_category.

create or replace function public.seed_elo_ratings_on_gender_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_categories match_category[];
begin
  v_categories := case new.gender_category
    when 'erkek' then array['erkek_tek','open_tek','erkek_cift','open_cift']::match_category[]
    when 'kadin' then array['kadin_tek','open_tek','kadin_cift','open_cift']::match_category[]
    else array['open_tek','open_cift']::match_category[]
  end;

  insert into public.elo_ratings (profile_id, category, rating, matches_played)
  select new.user_id, c, 1200, 0
  from unnest(v_categories) as c
  on conflict (profile_id, category) do nothing;

  return new;
end;
$$;

revoke all on function public.seed_elo_ratings_on_gender_change() from public;

drop trigger if exists trg_seed_elo_on_gender_change on public.profiles;

create trigger trg_seed_elo_on_gender_change
  after update of gender_category on public.profiles
  for each row
  when (old.gender_category is distinct from new.gender_category)
  execute function public.seed_elo_ratings_on_gender_change();

-- Backfill anyone already stranded by this — including the App Review account,
-- which hit it by re-onboarding after an in-app account deletion.
do $$
declare
  r record;
  v_categories match_category[];
begin
  for r in select user_id, gender_category from public.profiles loop
    v_categories := case r.gender_category
      when 'erkek' then array['erkek_tek','open_tek','erkek_cift','open_cift']::match_category[]
      when 'kadin' then array['kadin_tek','open_tek','kadin_cift','open_cift']::match_category[]
      else array['open_tek','open_cift']::match_category[]
    end;

    insert into public.elo_ratings (profile_id, category, rating, matches_played)
    select r.user_id, c, 1200, 0
    from unnest(v_categories) as c
    on conflict (profile_id, category) do nothing;
  end loop;
end $$;
