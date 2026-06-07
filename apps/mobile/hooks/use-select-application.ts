import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function useSelectApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { applicationId: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<{ matchId: string; requestStatus: string }>(
        'select-open-call-application',
        input,
        token,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.all });
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
    },
  });
}
