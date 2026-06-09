import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export type DisputeOutcome = 'approve_a' | 'approve_b' | 'void' | 'replay';

export function useResolveDispute() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.session?.access_token);
  return useMutation({
    mutationFn: async (input: { disputeId: string; outcome: DisputeOutcome; notes?: string }) => {
      if (!accessToken) throw new Error('not authenticated');
      return invokeFunction('resolve-dispute', input, accessToken);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.pendingDisputes() });
      qc.invalidateQueries({ queryKey: queryKeys.admin.disputeDetail(variables.disputeId) });
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
    },
  });
}
