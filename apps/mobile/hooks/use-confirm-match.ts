import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface ConfirmMatchResponse {
  confirmed: boolean;
  status?: string;
  alreadyConfirmed?: boolean;
}

export function useConfirmMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<ConfirmMatchResponse>('confirm-match', input, token);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.detail(variables.matchId) });
      qc.invalidateQueries({ queryKey: queryKeys.matchHistory.all });
    },
  });
}
