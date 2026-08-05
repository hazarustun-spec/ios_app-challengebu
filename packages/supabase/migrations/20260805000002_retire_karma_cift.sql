-- Retire 'karma_cift' — Open Çift is the only mixed doubles category now.
--
-- Why: nothing ever enforced the thing that makes "karma" mean anything.
-- Mixed doubles is one man + one woman per team, but no constraint, trigger
-- or client check imposed that — two men could open a karma_cift match. The
-- only implemented difference between the two categories was eligibility:
--
--   20260714000001, eligible categories by gender_category
--     erkek      → …, karma_cift, open_cift
--     kadin      → …, karma_cift, open_cift
--     open_only  → open_cift only
--
-- So karma_cift was open_cift minus open_only players, and nothing else. Two
-- ladders, two sets of ratings, one meaning. Collapse them into open_cift.
--
-- The enum value itself is NOT dropped. Postgres cannot remove a value from
-- an enum in place, and doing it the long way (new type, rewrite every
-- dependent column, swap) buys nothing here — after this migration no row
-- carries the value and no code writes it. It stays as a tombstone.

-- 1. elo_ratings. `unique (profile_id, category)` means anyone eligible for
--    karma already has an open_cift row too, so a blanket UPDATE would
--    violate the constraint. Move the karma rating over only where there is
--    no open row to collide with, then drop the rest.
--
--    Where both exist the open_cift rating wins and the karma one is
--    discarded rather than merged. Merging two independent ELO series has no
--    correct answer — averaging invents a rating neither ladder produced.
--    Keeping the surviving ladder's own number is the honest choice.
update public.elo_ratings e
   set category = 'open_cift'
 where e.category = 'karma_cift'
   and not exists (
     select 1 from public.elo_ratings o
      where o.profile_id = e.profile_id
        and o.category = 'open_cift'
   );

delete from public.elo_ratings where category = 'karma_cift';

-- 2. Played matches. Re-filing them under open_cift keeps them visible in
--    history and in the open ladder's match counts. Ratings were already
--    applied when each match was confirmed; this does not recompute them.
update public.matches
   set category = 'open_cift'
 where category = 'karma_cift';

-- 3. Season doubles teams. The table's check constraint already permits
--    'open_cift' (20260609000003), so no constraint change is needed.
update public.season_doubles_teams
   set category = 'open_cift'
 where category = 'karma_cift';

-- 4. Pending/accepted match requests, so nothing in flight still asks for a
--    category the app no longer offers.
update public.match_requests
   set category = 'open_cift'
 where category = 'karma_cift';

-- 5. Stop seeding it. Replaces the function from 20260714000001 with the
--    karma_cift entries removed; everything else about it is unchanged.
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
