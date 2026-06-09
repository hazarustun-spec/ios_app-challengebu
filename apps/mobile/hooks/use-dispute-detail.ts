import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface DisputeDetail {
  id: string;
  match_id: string;
  reason: string;
  status: 'open' | 'resolved';
  resolution_notes: string | null;
  resolved_at: string | null;
  match: {
    id: string;
    category: string;
    format: string;
    played_at: string;
    team_a_player_ids: string[];
    team_b_player_ids: string[];
    score_team_a: number;
    score_team_b: number;
    score_details: unknown;
    winner_team: 'a' | 'b' | 'void' | null;
  };
  submissions: Array<{
    submitted_by: string;
    submitted_by_name: string;
    score_details: unknown;
    submitted_at: string;
  }>;
}

interface RawSub {
  submitted_by: string;
  score_details: unknown;
  submitted_at: string;
  submitter: { first_name: string; last_name: string } | null;
}

export function useDisputeDetail(disputeId: string | undefined) {
  return useQuery<DisputeDetail | null>({
    queryKey: disputeId ? queryKeys.admin.disputeDetail(disputeId) : queryKeys.admin.all,
    enabled: !!disputeId,
    queryFn: async () => {
      if (!disputeId) return null;
      const { data: d, error } = await supabase
        .from('disputes')
        .select(`
          id, match_id, reason, status, resolution_notes, resolved_at,
          match:matches(
            id, category, format, played_at, team_a_player_ids, team_b_player_ids,
            score_team_a, score_team_b, score_details, winner_team
          )
        `)
        .eq('id', disputeId)
        .single();
      if (error) throw error;
      if (!d) return null;

      const { data: subs } = await supabase
        .from('match_score_submissions')
        .select(`
          submitted_by, score_details, submitted_at,
          submitter:profiles!match_score_submissions_submitted_by_fkey(first_name, last_name)
        `)
        .eq('match_id', d.match_id)
        .order('submitted_at', { ascending: true });

      const submissions = ((subs ?? []) as unknown as RawSub[]).map((s) => ({
        submitted_by: s.submitted_by,
        score_details: s.score_details,
        submitted_at: s.submitted_at,
        submitted_by_name: s.submitter
          ? `${s.submitter.first_name} ${s.submitter.last_name}`
          : 'Bilinmeyen',
      }));

      return {
        id: d.id,
        match_id: d.match_id,
        reason: d.reason,
        status: d.status,
        resolution_notes: d.resolution_notes,
        resolved_at: d.resolved_at,
        match: d.match as unknown as DisputeDetail['match'],
        submissions,
      };
    },
  });
}
