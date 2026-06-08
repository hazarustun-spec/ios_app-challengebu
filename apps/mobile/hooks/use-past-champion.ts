import { useQuery } from '@tanstack/react-query';
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
  season: { name: string; year: number } | null;
}

const SEASON_LABEL: Record<string, string> = {
  guz: 'Güz',
  bahar: 'Bahar',
  yaz: 'Yaz',
};

export function usePastChampion(userId: string | undefined) {
  return useQuery<PastChampion | null>({
    queryKey: userId ? queryKeys.yearly.pastChampion(userId) : queryKeys.yearly.all,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          earned_at, season_id,
          badge:badges(code),
          season:seasons(name, year)
        `)
        .eq('profile_id', userId)
        .in('badge.code' as never, ['season_champion', 'yearly_champion'])
        .order('earned_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      const rows = ((data ?? []) as unknown as RawRow[]).filter(
        (r) => r.badge?.code === 'season_champion' || r.badge?.code === 'yearly_champion',
      );
      if (rows.length === 0) return null;
      const top = rows[0];
      if (top.badge?.code === 'yearly_champion') {
        const yr = top.season?.year ?? new Date(top.earned_at).getUTCFullYear();
        return { label: `${yr} Yıllık Şampiyon`, kind: 'yearly' };
      }
      const name = top.season ? SEASON_LABEL[top.season.name] ?? top.season.name : 'Sezon';
      const year = top.season?.year ?? new Date(top.earned_at).getUTCFullYear();
      return { label: `${name} ${year} Şampiyonu`, kind: 'season' };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60,
  });
}
