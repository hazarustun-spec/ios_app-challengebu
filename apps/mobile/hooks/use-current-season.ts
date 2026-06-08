import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export type SeasonStatus = 'upcoming' | 'active' | 'finale' | 'closed';
export type SeasonName = 'guz' | 'bahar' | 'yaz';

export interface CurrentSeason {
  id: string;
  name: SeasonName;
  year: number;
  starts_at: string;
  ends_at: string;
  finale_starts_at: string;
  finale_ends_at: string;
  status: SeasonStatus;
}

export function useCurrentSeason() {
  return useQuery<CurrentSeason | null>({
    queryKey: queryKeys.seasons.current(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, year, starts_at, ends_at, finale_starts_at, finale_ends_at, status')
        .in('status', ['active', 'finale'])
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CurrentSeason | null;
    },
    staleTime: 1000 * 60 * 60,
  });
}
