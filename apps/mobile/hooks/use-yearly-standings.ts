import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface YearlyStanding {
  category: string;
  rank: number;
  profile_id: string;
  total_finale_points: number;
  first_name: string;
  last_name: string;
}

interface RawRow {
  category: string;
  rank: number;
  profile_id: string;
  total_finale_points: number;
  profile: { first_name: string; last_name: string } | null;
}

export function useYearlyStandings(year: number) {
  return useQuery<Record<string, YearlyStanding[]>>({
    queryKey: queryKeys.yearly.standings(year),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yearly_championship')
        .select(`
          category, rank, profile_id, total_finale_points,
          profile:profiles!yearly_championship_profile_id_fkey(first_name, last_name)
        `)
        .eq('year', year)
        .order('category', { ascending: true })
        .order('rank', { ascending: true });
      if (error) throw error;
      const grouped: Record<string, YearlyStanding[]> = {};
      for (const r of ((data ?? []) as unknown as RawRow[])) {
        const list = grouped[r.category] ?? [];
        list.push({
          category: r.category,
          rank: r.rank,
          profile_id: r.profile_id,
          total_finale_points: r.total_finale_points,
          first_name: r.profile?.first_name ?? 'Bilinmeyen',
          last_name: r.profile?.last_name ?? '',
        });
        grouped[r.category] = list;
      }
      return grouped;
    },
    staleTime: 1000 * 60 * 60,
  });
}
