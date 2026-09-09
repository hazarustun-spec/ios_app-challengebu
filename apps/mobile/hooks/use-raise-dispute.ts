import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface RaiseDisputeResponse {
  disputeId: string;
  status: string;
}

export function useRaiseDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      matchId: string;
      reason: string;
      /**
       * What the reporter says the score should have been, in the format's own
       * unit and against the match's FIXED team sides — not "mine"/"theirs".
       * Send both or neither.
       */
      claimedScoreA?: number;
      claimedScoreB?: number;
    }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<RaiseDisputeResponse>('raise-dispute', input, token);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.detail(variables.matchId) });
    },
  });
}
