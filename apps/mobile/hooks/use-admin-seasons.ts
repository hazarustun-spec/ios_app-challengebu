import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export type SeasonStatus = 'upcoming' | 'active' | 'finale' | 'closed';
export type SeasonName = 'guz' | 'bahar' | 'yaz';

export interface AdminSeason {
  id: string;
  name: SeasonName;
  year: number;
  starts_at: string;
  ends_at: string;
  finale_starts_at: string;
  finale_ends_at: string;
  status: SeasonStatus;
  tournament_count: number;
}

export function useAdminSeasons() {
  return useQuery<AdminSeason[]>({
    queryKey: queryKeys.admin.seasons(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, year, starts_at, ends_at, finale_starts_at, finale_ends_at, status')
        .order('starts_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Omit<AdminSeason, 'tournament_count'>[];

      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return [];
      const { data: tourneys } = await supabase
        .from('tournaments')
        .select('season_id')
        .in('season_id', ids);
      const counts = new Map<string, number>();
      for (const t of tourneys ?? []) {
        counts.set(t.season_id, (counts.get(t.season_id) ?? 0) + 1);
      }
      return rows.map((r) => ({ ...r, tournament_count: counts.get(r.id) ?? 0 }));
    },
  });
}

export function useStartSeasonFinale() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.session?.access_token);
  return useMutation({
    mutationFn: async (seasonId: string) => {
      if (!accessToken) throw new Error('not authenticated');
      return invokeFunction('start-season-finale', { seasonId }, accessToken);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.seasons() });
      qc.invalidateQueries({ queryKey: queryKeys.seasons.all });
    },
  });
}

export function useCloseSeason() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.session?.access_token);
  return useMutation({
    mutationFn: async (seasonId: string) => {
      if (!accessToken) throw new Error('not authenticated');
      return invokeFunction('close-season', { seasonId }, accessToken);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.seasons() });
      qc.invalidateQueries({ queryKey: queryKeys.seasons.all });
    },
  });
}
