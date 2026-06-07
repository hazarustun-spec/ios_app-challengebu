import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import type { ActiveMatchRow } from './use-active-matches';

export function useMatchDetail(id: string | undefined) {
  return useQuery<ActiveMatchRow | null>({
    queryKey: queryKeys.activeMatches.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, match_request_id, category, format, is_rated, played_at, status,
          team_a_player_ids, team_b_player_ids,
          score_team_a, score_team_b, winner_team, score_details, confirmed_by,
          rating_before_team_a, rating_after_team_a,
          rating_before_team_b, rating_after_team_b,
          created_at,
          court:courts(name)
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ActiveMatchRow | null;
    },
    enabled: !!id,
  });
}
