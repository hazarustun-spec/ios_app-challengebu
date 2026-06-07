import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface EloPoint {
  matchId: string;
  played_at: string;
  elo: number;
}

export type EloHistoryByCategory = Record<string, EloPoint[]>;

interface MatchRow {
  id: string;
  category: string;
  played_at: string;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  rating_before_team_a: number | null;
  rating_after_team_a: number | null;
  rating_before_team_b: number | null;
  rating_after_team_b: number | null;
}

export function useEloHistory(userId: string | undefined) {
  return useQuery<EloHistoryByCategory>({
    queryKey: userId ? queryKeys.eloHistory.forUser(userId) : queryKeys.eloHistory.all,
    queryFn: async () => {
      if (!userId) return {};
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, category, played_at,
          team_a_player_ids, team_b_player_ids,
          rating_before_team_a, rating_after_team_a,
          rating_before_team_b, rating_after_team_b
        `)
        .eq('status', 'confirmed')
        .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`)
        .not('rating_after_team_a', 'is', null)
        .not('rating_after_team_b', 'is', null)
        .order('played_at', { ascending: true })
        .limit(100);
      if (error) throw error;

      const result: EloHistoryByCategory = {};
      for (const m of ((data ?? []) as unknown) as MatchRow[]) {
        const onA = m.team_a_player_ids.includes(userId);
        const eloAfter = onA ? m.rating_after_team_a : m.rating_after_team_b;
        if (eloAfter === null) continue;
        const list = result[m.category] ?? [];
        list.push({ matchId: m.id, played_at: m.played_at, elo: eloAfter });
        result[m.category] = list;
      }
      return result;
    },
    enabled: !!userId,
  });
}
