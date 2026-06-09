import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'completed';
export type RequestType = 'direct_challenge' | 'open_call';

export interface MatchRequestRow {
  id: string;
  creator_id: string;
  target_id: string | null;
  type: RequestType;
  category: string;
  format: string;
  is_rated: boolean;
  proposed_date: string;
  proposed_time: string;
  court_id: string;
  status: RequestStatus;
  expires_at: string;
  created_at: string;
  creator_profile?: { first_name: string; last_name: string; avatar_url: string | null } | null;
  target_profile?: { first_name: string; last_name: string; avatar_url: string | null } | null;
  court?: { name: string } | null;
}

function selectQuery() {
  return supabase.from('match_requests').select(`
    id, creator_id, target_id, type, category, format, is_rated,
    proposed_date, proposed_time, court_id, status, expires_at, created_at,
    creator_profile:profiles!match_requests_creator_id_fkey(first_name, last_name, avatar_url),
    target_profile:profiles!match_requests_target_id_fkey(first_name, last_name, avatar_url),
    court:courts(name)
  `);
}

export function useIncomingMatchRequests() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<MatchRequestRow[]>({
    queryKey: queryKeys.matchRequests.incoming(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await selectQuery()
        .eq('target_id', userId)
        .eq('type', 'direct_challenge')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MatchRequestRow[];
    },
    enabled: !!userId,
  });
}

export function useOutgoingMatchRequests() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<MatchRequestRow[]>({
    queryKey: queryKeys.matchRequests.outgoing(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await selectQuery()
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MatchRequestRow[];
    },
    enabled: !!userId,
  });
}

import { useRealtimeChannel } from './use-realtime-channel';

export function useMatchRequestsRealtime() {
  const userId = useAuthStore((s) => s.user?.id);
  // match_requests SELECT policy is `using (true)` — without scoped filters
  // every authenticated client would receive an event for every request in
  // the community. We scope to two channels with scalar filters that Realtime
  // does support: outgoing (creator_id) and incoming-direct (target_id).
  // Open-call discovery is left to pull-to-refresh.
  useRealtimeChannel({
    channelName: userId ? `match-requests:outgoing:${userId}` : 'match-requests:none',
    enabled: !!userId,
    configs: userId
      ? [
          { event: 'INSERT', table: 'match_requests', filter: `creator_id=eq.${userId}` },
          { event: 'UPDATE', table: 'match_requests', filter: `creator_id=eq.${userId}` },
        ]
      : [],
    invalidateKeys: [queryKeys.matchRequests.all],
  });
  useRealtimeChannel({
    channelName: userId ? `match-requests:incoming:${userId}` : 'match-requests:none-in',
    enabled: !!userId,
    configs: userId
      ? [
          { event: 'INSERT', table: 'match_requests', filter: `target_id=eq.${userId}` },
          { event: 'UPDATE', table: 'match_requests', filter: `target_id=eq.${userId}` },
        ]
      : [],
    invalidateKeys: [queryKeys.matchRequests.all],
  });
}
