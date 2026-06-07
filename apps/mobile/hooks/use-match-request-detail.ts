import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import type { MatchRequestRow } from './use-match-requests';

export function useMatchRequestDetail(id: string | undefined) {
  return useQuery<MatchRequestRow | null>({
    queryKey: queryKeys.matchRequests.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('match_requests')
        .select(`
          id, creator_id, target_id, type, category, format, is_rated,
          proposed_date, proposed_time, court_id, status, expires_at, created_at,
          creator_profile:profiles!match_requests_creator_id_fkey(first_name, last_name, avatar_url),
          target_profile:profiles!match_requests_target_id_fkey(first_name, last_name, avatar_url),
          court:courts(name)
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MatchRequestRow | null;
    },
    enabled: !!id,
  });
}
