import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useCurrentSeason } from './use-current-season';

export type FinaleStatus =
  | 'inactive'
  | 'announced'
  | 'qualifying'
  | 'finale_in_progress'
  | 'finale_complete';

const ANNOUNCE_WINDOW_DAYS = 21;

export function useUpcomingFinaleStatus() {
  const seasonQ = useCurrentSeason();
  const seasonId = seasonQ.data?.id;

  return useQuery<FinaleStatus>({
    queryKey: queryKeys.seasons.finaleStatus(),
    enabled: !!seasonId,
    queryFn: async () => {
      if (!seasonQ.data) return 'inactive';
      const s = seasonQ.data;
      const now = Date.now();
      const finaleStart = Date.parse(s.finale_starts_at);
      const finaleEnd = Date.parse(s.finale_ends_at);

      if (s.status === 'closed') return 'finale_complete';

      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, status')
        .eq('season_id', s.id);
      const list = tournaments ?? [];
      const hasAny = list.length > 0;
      const allCompleted = hasAny && list.every((t) => t.status === 'completed');

      if (s.status === 'finale' && allCompleted) return 'finale_complete';
      if (s.status === 'finale' && hasAny) return 'finale_in_progress';

      if (now >= finaleStart && now <= finaleEnd) return 'qualifying';

      const announceFrom = finaleStart - ANNOUNCE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      if (now >= announceFrom && now < finaleStart) return 'announced';
      return 'inactive';
    },
    staleTime: 1000 * 60 * 15,
  });
}
