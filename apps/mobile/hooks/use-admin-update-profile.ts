import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface AdminUpdateProfileInput {
  targetUserId: string;
  role?: 'player' | 'admin';
  status?: 'active' | 'suspended' | 'banned';
  notes?: string;
}

export function useAdminUpdateProfile() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.session?.access_token);
  return useMutation({
    mutationFn: async (input: AdminUpdateProfileInput) => {
      if (!accessToken) throw new Error('not authenticated');
      return invokeFunction('admin-update-profile', input, accessToken);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.userDetail(variables.targetUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
