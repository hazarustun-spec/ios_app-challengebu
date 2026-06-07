import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface PlayerRow {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  gender_category: 'erkek' | 'kadin' | 'open_only';
  status: string;
}

export function usePlayers(opts?: { gender?: 'erkek' | 'kadin' | 'open_only' }) {
  const myUserId = useAuthStore((s) => s.user?.id);
  return useQuery<PlayerRow[]>({
    queryKey: queryKeys.players.list(opts),
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url, gender_category, status')
        .eq('role', 'player')
        .neq('status', 'anonymized')
        .order('first_name');
      if (opts?.gender) q = q.eq('gender_category', opts.gender);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).filter((p) => p.user_id !== myUserId) as PlayerRow[];
    },
    enabled: !!myUserId,
  });
}
