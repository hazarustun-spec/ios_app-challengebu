import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import type { MatchFormat } from '../components/matches/FormatPicker';

export type MatchStatus = 'awaiting_confirmation' | 'confirmed' | 'disputed' | 'voided';

export interface ActiveMatchRow {
  id: string;
  match_request_id: string | null;
  category: string;
  format: MatchFormat;
  is_rated: boolean;
  played_at: string;
  status: MatchStatus;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  score_team_a: number;
  score_team_b: number;
  winner_team: 'a' | 'b' | 'void' | null;
  /** Only selected by the history query — active matches are never voided. */
  voided_reason?: string | null;
  score_details: unknown;
  confirmed_by: string[];
  rating_before_team_a: number | null;
  rating_after_team_a: number | null;
  rating_before_team_b: number | null;
  rating_after_team_b: number | null;
  created_at: string;
  court?: { name: string } | null;
}

export function useActiveMatches() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<ActiveMatchRow[]>({
    queryKey: queryKeys.activeMatches.list(),
    queryFn: async () => {
      if (!userId) return [];
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
        .in('status', ['awaiting_confirmation', 'disputed'])
        .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`)
        .order('played_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ActiveMatchRow[];
    },
    enabled: !!userId,
  });
}

import { useRealtimeChannel } from './use-realtime-channel';

export function useActiveMatchesRealtime() {
  const userId = useAuthStore((s) => s.user?.id);
  useRealtimeChannel({
    channelName: userId ? `matches:active:${userId}` : 'matches:active:none',
    enabled: !!userId,
    // INSERT covers freshly accepted match requests (accept-match-request only
    // invalidates matchRequests.all, not activeMatches.all, so we depend on
    // realtime to surface the new row). UPDATE covers status / score / confirm
    // transitions.
    configs: [
      { event: 'INSERT', table: 'matches' },
      { event: 'UPDATE', table: 'matches' },
    ],
    invalidateKeys: [queryKeys.activeMatches.all],
  });
}
