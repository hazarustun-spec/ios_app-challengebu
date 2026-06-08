import { useQuery } from '@tanstack/react-query';
import { seasonDisplayName, type SeasonName } from '@tennis/shared';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface PastChampion {
  label: string;
  kind: 'season' | 'yearly';
}

interface RawRow {
  earned_at: string;
  season_id: string | null;
  badge: { code: string } | null;
  season: { name: SeasonName; year: number } | null;
}

export function usePastChampion(userId: string | undefined) {
  return useQuery<PastChampion | null>({
    queryKey: userId ? queryKeys.yearly.pastChampion(userId) : queryKeys.yearly.all,
    queryFn: async () => {
      if (!userId) return null;
      // !inner forces PostgREST to drop user_badges rows whose joined
      // badge.code doesn't match — without it the .in() filter only
      // nulls the embedded resource and the .limit(5) blows away real
      // champion rows in favor of recent milestone badges.
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          earned_at, season_id,
          badge:badges!inner(code),
          season:seasons(name, year)
        `)
        .eq('profile_id', userId)
        .in('badge.code', ['season_champion', 'yearly_champion'])
        .order('earned_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      const rows = (data ?? []) as unknown as RawRow[];
      if (rows.length === 0) return null;
      const top = rows[0];
      if (top.badge?.code === 'yearly_champion') {
        const yr = top.season?.year ?? new Date(top.earned_at).getUTCFullYear();
        return { label: `${yr} Yıllık Şampiyon`, kind: 'yearly' };
      }
      const name = top.season ? seasonDisplayName(top.season.name) : 'Sezon';
      const year = top.season?.year ?? new Date(top.earned_at).getUTCFullYear();
      return { label: `${name} ${year} Şampiyonu`, kind: 'season' };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60,
  });
}
