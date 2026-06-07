-- Returns per-category ELO + rank for the given profile.
-- Rank is computed using window function across all elo_ratings rows in that category.
create or replace function public.get_user_rankings(target_user_id uuid)
returns table (
  category text,
  rating integer,
  matches_played integer,
  rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      profile_id,
      category::text as category,
      rating,
      matches_played,
      rank() over (partition by category order by rating desc) as rank
    from public.elo_ratings
  )
  select category, rating, matches_played, rank
  from ranked
  where profile_id = target_user_id
  order by rating desc;
$$;

grant execute on function public.get_user_rankings(uuid) to authenticated;
