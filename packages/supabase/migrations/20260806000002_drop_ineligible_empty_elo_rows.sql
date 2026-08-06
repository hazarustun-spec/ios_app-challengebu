-- Remove elo_ratings rows for categories a profile is no longer eligible for,
-- but only when the row has no history behind it.
--
-- 20260806000001 seeded the categories for the *new* gender on a gender change
-- and deliberately left the old gender's rows alone, on the grounds that they
-- might carry played matches and rating history. That was half right. Rows
-- with real results do need to survive. Rows that were never played are pure
-- seed rows carrying nothing — and every elo_ratings row puts the player on
-- that category's ladder. A man who re-onboarded ended up listed in the
-- women's leaderboard as well as the men's, which is worse than losing an
-- untouched 1200.
--
-- So the rule is: not eligible AND never played AND still at the seed rating
-- → delete. Anything else stays, and the client already prefers the category
-- matching gender_category (lib/primary-category.ts), so a surviving row with
-- real history is inert rather than misleading.

create or replace function public.eligible_categories_for_gender(p_gender text)
returns match_category[]
language sql
immutable
set search_path = public
as $$
  select case p_gender
    when 'erkek' then array['erkek_tek','open_tek','erkek_cift','open_cift']::match_category[]
    when 'kadin' then array['kadin_tek','open_tek','kadin_cift','open_cift']::match_category[]
    else array['open_tek','open_cift']::match_category[]
  end;
$$;

revoke all on function public.eligible_categories_for_gender(text) from public;

-- One-off cleanup for everyone already carrying stale rows, including the
-- App Review account.
delete from public.elo_ratings e
 using public.profiles p
 where p.user_id = e.profile_id
   and e.matches_played = 0
   and e.rating = 1200
   and not (e.category = any (public.eligible_categories_for_gender(p.gender_category::text)));

-- And keep it that way. Replaces the function installed by 20260806000001:
-- same seeding, plus the matching cleanup so a gender change cannot leave the
-- player on two genders' ladders at once.
create or replace function public.seed_elo_ratings_on_gender_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_categories match_category[];
begin
  v_categories := public.eligible_categories_for_gender(new.gender_category::text);

  insert into public.elo_ratings (profile_id, category, rating, matches_played)
  select new.user_id, c, 1200, 0
  from unnest(v_categories) as c
  on conflict (profile_id, category) do nothing;

  -- Drop only the untouched rows from the categories they just left.
  delete from public.elo_ratings
   where profile_id = new.user_id
     and matches_played = 0
     and rating = 1200
     and not (category = any (v_categories));

  return new;
end;
$$;

revoke all on function public.seed_elo_ratings_on_gender_change() from public;
