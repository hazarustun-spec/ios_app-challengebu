import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function useRejectMatchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction('reject-match-request', input, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
    },
  });
}
