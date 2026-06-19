import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import type { MatchRequestRow } from './use-match-requests';

export function useOpenCallsFeed() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<MatchRequestRow[]>({
    queryKey: queryKeys.openCalls.feed(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('match_requests')
        .select(`
          id, creator_id, target_id, type, category, format, is_rated,
          proposed_date, proposed_time, court_id, status, expires_at, created_at,
          creator_profile:profiles!match_requests_creator_id_fkey(first_name, last_name, avatar_url),
          court:courts(name)
        `)
        .eq('type', 'open_call')
        .eq('status', 'pending')
        .neq('creator_id', userId ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MatchRequestRow[];
    },
    enabled: !!userId,
  });
}

/** The current user's OWN pending open calls (excluded from the community feed). */
export function useMyOpenCalls() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<MatchRequestRow[]>({
    queryKey: queryKeys.openCalls.mine(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('match_requests')
        .select(`
          id, creator_id, target_id, type, category, format, is_rated,
          proposed_date, proposed_time, court_id, status, expires_at, created_at,
          creator_profile:profiles!match_requests_creator_id_fkey(first_name, last_name, avatar_url),
          court:courts(name)
        `)
        .eq('type', 'open_call')
        .eq('status', 'pending')
        .eq('creator_id', userId ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MatchRequestRow[];
    },
    enabled: !!userId,
  });
}
