import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import type { ActiveMatchRow } from './use-active-matches';

function fetchHistoryFor(userId: string) {
  return supabase
    .from('matches')
    .select(`
      id, match_request_id, category, format, is_rated, played_at, status,
      team_a_player_ids, team_b_player_ids,
      score_team_a, score_team_b, winner_team, score_details, confirmed_by,
      voided_reason,
      rating_before_team_a, rating_after_team_a,
      rating_before_team_b, rating_after_team_b,
      created_at,
      court:courts(name)
    `)
    .in('status', ['confirmed', 'voided'])
    .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`)
    .order('played_at', { ascending: false })
    .limit(20);
}

export function useMyMatchHistory() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<ActiveMatchRow[]>({
    queryKey: queryKeys.matchHistory.mine(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchHistoryFor(userId);
      if (error) throw error;
      return (data ?? []) as unknown as ActiveMatchRow[];
    },
    enabled: !!userId,
  });
}

export function useUserMatchHistory(userId: string | undefined) {
  return useQuery<ActiveMatchRow[]>({
    queryKey: queryKeys.matchHistory.forUser(userId ?? '__none__'),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await fetchHistoryFor(userId);
      if (error) throw error;
      return (data ?? []) as unknown as ActiveMatchRow[];
    },
    enabled: !!userId,
  });
}
