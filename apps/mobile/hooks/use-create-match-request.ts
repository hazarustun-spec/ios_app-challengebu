import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import type { MatchFormat } from '../components/matches/FormatPicker';

export interface CreateMatchRequestInput {
  type: 'direct_challenge' | 'open_call';
  targetId?: string;
  category: string;
  format: MatchFormat;
  isRated: boolean;
  proposedDate: string;
  proposedTime: string;
  courtId: string;
  creatorPartnerId?: string;
  targetPartnerId?: string;
}

export interface CreateMatchRequestResponse {
  id: string;
  status: string;
  expiresAt: string;
}

export function useCreateMatchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMatchRequestInput) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<CreateMatchRequestResponse>(
        'create-match-request',
        input,
        token,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
    },
  });
}
