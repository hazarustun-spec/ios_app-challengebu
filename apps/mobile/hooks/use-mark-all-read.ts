import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function useMarkAllRead() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('not authenticated');
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
}
