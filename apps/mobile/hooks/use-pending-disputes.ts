import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface PendingDispute {
  id: string;
  match_id: string;
  raised_by: string;
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
  raised_by_name: string;
  match_played_at: string;
  match_category: string;
}

interface Raw {
  id: string;
  match_id: string;
  raised_by: string;
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
  raised_by_profile: { first_name: string; last_name: string } | null;
  match: { played_at: string; category: string } | null;
}

export function usePendingDisputes() {
  return useQuery<PendingDispute[]>({
    queryKey: queryKeys.admin.pendingDisputes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          id, match_id, raised_by, reason, status, created_at,
          raised_by_profile:profiles!disputes_raised_by_fkey(first_name, last_name),
          match:matches(played_at, category)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Raw[]).map((r) => ({
        id: r.id,
        match_id: r.match_id,
        raised_by: r.raised_by,
        reason: r.reason,
        status: r.status,
        created_at: r.created_at,
        raised_by_name: r.raised_by_profile
          ? `${r.raised_by_profile.first_name} ${r.raised_by_profile.last_name}`
          : 'Bilinmeyen',
        match_played_at: r.match?.played_at ?? r.created_at,
        match_category: r.match?.category ?? '',
      }));
    },
  });
}
