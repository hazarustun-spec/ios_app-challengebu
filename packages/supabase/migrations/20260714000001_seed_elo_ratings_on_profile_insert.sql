-- Auto-seed elo_ratings (1200 rating, 0 matches) for every category a profile
-- is eligible for, right when the profile row is created.
--
-- Bug: the onboarding client (use-submit-onboarding.ts) tried to insert
-- elo_ratings itself using the user's own session, but elo_ratings RLS only
-- allows admins/service_role to write ("Only admins can directly
-- insert/update/delete elo_ratings", 20260606000002_elo_ratings.sql). The
-- insert was silently rejected (error not checked/thrown client-side), so
-- every signup landed in zero rankings — invisible to challengers, unable to
-- receive match offers.
--
-- SECURITY DEFINER trigger bypasses RLS safely here because the row set is
-- fully determined by NEW.gender_category, not arbitrary user input — same
-- pattern as push_live_score_on_update (20260626000004).

create or replace function public.seed_elo_ratings_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_categories match_category[];
begin
  v_categories := case new.gender_category
    when 'erkek' then array['erkek_tek','open_tek','erkek_cift','karma_cift','open_cift']::match_category[]
    when 'kadin' then array['kadin_tek','open_tek','kadin_cift','karma_cift','open_cift']::match_category[]
    else array['open_tek','open_cift']::match_category[]
  end;

  insert into public.elo_ratings (profile_id, category, rating, matches_played)
  select new.user_id, c, 1200, 0
  from unnest(v_categories) as c
  on conflict (profile_id, category) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_seed_elo_ratings on public.profiles;
create trigger trg_seed_elo_ratings
  after insert on public.profiles
  for each row
  execute function public.seed_elo_ratings_for_profile();

-- Backfill: profiles that already exist but are missing rows in one or more
-- of their eligible categories (the exact bug reported in production — every
-- signed-up user invisible in every ranking, including the owner's own
-- test account).
do $$
declare
  r record;
  v_categories match_category[];
begin
  for r in select user_id, gender_category from public.profiles loop
    v_categories := case r.gender_category
      when 'erkek' then array['erkek_tek','open_tek','erkek_cift','karma_cift','open_cift']::match_category[]
      when 'kadin' then array['kadin_tek','open_tek','kadin_cift','karma_cift','open_cift']::match_category[]
      else array['open_tek','open_cift']::match_category[]
    end;

    insert into public.elo_ratings (profile_id, category, rating, matches_played)
    select r.user_id, c, 1200, 0
    from unnest(v_categories) as c
    on conflict (profile_id, category) do nothing;
  end loop;
end $$;
