create unique index if not exists seasons_one_active_idx
  on public.seasons ((1))
  where status in ('active', 'finale');
