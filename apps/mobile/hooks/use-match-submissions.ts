import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface MatchScoreSubmission {
  id: string;
  submitted_by: string;
  score_details: {
    scoreTeamA: number;
    scoreTeamB: number;
    winnerTeam: string;
  };
}

/**
 * Fetches all score submissions for a given match from `match_score_submissions`.
 * RLS allows participants to read all submissions for their own matches, so
 * both players' submissions are visible to both sides.
 * Ordered by submitted_at ascending so the latest per player can be derived
 * by the caller (or here — we return ALL rows; the caller picks the latest per player).
 */
export function useMatchSubmissions(matchId: string | undefined) {
  return useQuery<MatchScoreSubmission[]>({
    queryKey: queryKeys.matchSubmissions.byMatch(matchId ?? ''),
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from('match_score_submissions')
        .select('id, submitted_by, score_details')
        .eq('match_id', matchId)
        .order('submitted_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MatchScoreSubmission[];
    },
    enabled: !!matchId,
  });
}
