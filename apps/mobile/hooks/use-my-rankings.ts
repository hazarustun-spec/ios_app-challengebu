import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface RankingRow {
  category: string;
  rating: number;
  matches_played: number;
  rank: number;
}

export function useMyRankings() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<RankingRow[]>({
    queryKey: queryKeys.rankings.mine(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_user_rankings', { target_user_id: userId });
      if (error) throw error;
      return (data ?? []) as RankingRow[];
    },
    enabled: !!userId,
  });
}

export function useUserRankings(targetUserId: string | undefined) {
  return useQuery<RankingRow[]>({
    queryKey: queryKeys.rankings.forUser(targetUserId ?? ''),
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase.rpc('get_user_rankings', { target_user_id: targetUserId });
      if (error) throw error;
      return (data ?? []) as RankingRow[];
    },
    enabled: !!targetUserId,
  });
}
