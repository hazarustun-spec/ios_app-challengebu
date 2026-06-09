import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import type { NotificationCategory } from './use-notification-preferences';

export interface NotificationRow {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<NotificationRow[]>({
    queryKey: queryKeys.notifications.list(),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, category, title, body, data, read_at, created_at')
        .eq('recipient_id', userId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return ((data ?? []) as unknown) as NotificationRow[];
    },
  });
}
