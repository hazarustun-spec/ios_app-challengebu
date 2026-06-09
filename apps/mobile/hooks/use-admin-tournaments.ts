import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useCurrentSeason } from './use-current-season';

export interface AdminTournamentRow {
  id: string;
  category: string;
  bracket_size: number;
  status: 'seeded' | 'in_progress' | 'completed';
}

export function useAdminTournaments() {
  const season = useCurrentSeason();
  const seasonId = season.data?.id;
  return useQuery<AdminTournamentRow[]>({
    queryKey: seasonId ? queryKeys.admin.tournaments(seasonId) : queryKeys.admin.all,
    enabled: !!seasonId,
    queryFn: async () => {
      if (!seasonId) return [];
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, category, bracket_size, status')
        .eq('season_id', seasonId)
        .order('category', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown) as AdminTournamentRow[];
    },
  });
}

export function useVoidBracketMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; reason: string }) => {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'voided', voided_reason: input.reason })
        .eq('id', input.matchId);
      if (error) throw error;
      await supabase.from('audit_log').insert({
        action: 'void_bracket_match',
        entity_type: 'match',
        entity_id: input.matchId,
        details: { reason: input.reason },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tournaments.all });
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
