import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function useUnreadCount() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<number>({
    queryKey: queryKeys.notifications.unreadCount(),
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId!)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 30,
  });
}
