import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface EloPoint {
  matchId: string;
  played_at: string;
  elo: number;
  eloBefore: number;
}

export interface SeasonBoundary {
  timestamp: string;
  label: string;
}

export interface EloHistoryResult {
  byCategory: Record<string, EloPoint[]>;
  seasonBoundaries: SeasonBoundary[];
}

interface MatchRow {
  id: string;
  category: string;
  played_at: string;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  rating_before_team_a: number | null;
  rating_after_team_a: number | null;
  rating_before_team_b: number | null;
  rating_after_team_b: number | null;
}

interface SeasonRow {
  name: string;
  year: number;
  starts_at: string;
}

const SEASON_LABEL: Record<string, string> = {
  guz: 'Güz',
  bahar: 'Bahar',
  yaz: 'Yaz',
};

export function useEloHistory(userId: string | undefined) {
  return useQuery<EloHistoryResult>({
    queryKey: userId ? queryKeys.eloHistory.forUser(userId) : queryKeys.eloHistory.all,
    queryFn: async () => {
      if (!userId) return { byCategory: {}, seasonBoundaries: [] };
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, category, played_at,
          team_a_player_ids, team_b_player_ids,
          rating_before_team_a, rating_after_team_a,
          rating_before_team_b, rating_after_team_b
        `)
        .eq('status', 'confirmed')
        .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`)
        .not('rating_after_team_a', 'is', null)
        .not('rating_after_team_b', 'is', null)
        .order('played_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(100);
      if (error) throw error;

      const rows = (((data ?? []) as unknown) as MatchRow[]).slice().reverse();

      const byCategory: Record<string, EloPoint[]> = {};
      for (const m of rows) {
        const onA = m.team_a_player_ids.includes(userId);
        const eloAfter = onA ? m.rating_after_team_a : m.rating_after_team_b;
        const eloBefore = onA ? m.rating_before_team_a : m.rating_before_team_b;
        if (eloAfter === null || eloBefore === null) continue;
        const list = byCategory[m.category] ?? [];
        list.push({ matchId: m.id, played_at: m.played_at, elo: eloAfter, eloBefore });
        byCategory[m.category] = list;
      }

      let seasonBoundaries: SeasonBoundary[] = [];
      if (rows.length > 0) {
        const earliest = rows[0].played_at;
        const { data: seasons } = await supabase
          .from('seasons')
          .select('name, year, starts_at')
          .gte('starts_at', earliest)
          .order('starts_at', { ascending: true });
        seasonBoundaries = ((seasons ?? []) as SeasonRow[]).map((s) => ({
          timestamp: s.starts_at,
          label: `${SEASON_LABEL[s.name] ?? s.name} ${s.year} başladı`,
        }));
      }

      return { byCategory, seasonBoundaries };
    },
    enabled: !!userId,
  });
}
