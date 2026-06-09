import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface AdminHealth {
  totalUsers: number;
  activeUsers: number;
  matchesTodayCount: number;
  openDisputeCount: number;
  pendingMatchRequestCount: number;
}

export function useAdminHealth() {
  return useQuery<AdminHealth>({
    queryKey: queryKeys.admin.health(),
    queryFn: async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startIso = startOfToday.toISOString();

      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: matchesTodayCount },
        { count: openDisputeCount },
        { count: pendingMatchRequestCount },
      ] = await Promise.all([
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('user_id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .gte('played_at', startIso),
        supabase
          .from('disputes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open'),
        supabase
          .from('match_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);

      return {
        totalUsers: totalUsers ?? 0,
        activeUsers: activeUsers ?? 0,
        matchesTodayCount: matchesTodayCount ?? 0,
        openDisputeCount: openDisputeCount ?? 0,
        pendingMatchRequestCount: pendingMatchRequestCount ?? 0,
      };
    },
    staleTime: 1000 * 60,
  });
}
