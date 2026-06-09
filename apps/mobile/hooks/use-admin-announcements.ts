import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface PublishedAnnouncement {
  id: string;
  title: string;
  body: string;
  target_filter: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
}

export function useAdminAnnouncements() {
  return useQuery<PublishedAnnouncement[]>({
    queryKey: queryKeys.announcements.published(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, target_filter, published_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return ((data ?? []) as unknown) as PublishedAnnouncement[];
    },
  });
}
