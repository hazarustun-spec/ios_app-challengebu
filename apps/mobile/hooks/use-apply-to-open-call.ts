import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function useApplyToOpenCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; applicantPartnerId?: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction('apply-to-open-call', input, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.all });
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
    },
  });
}
