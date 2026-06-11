// Plan 8 Phase G — singles bracket seed list for the admin reorder screen.
//
// `useTournamentBracket` already returns rendered seed labels but it does so
// via a name-only `public_profiles` join, dropping the `profile_id` we need
// to call `admin_reorder_bracket_seeds(tournament_id, seed_player_ids uuid[])`.
//
// This hook reads `season_standings` directly (singles tournaments only —
// doubles brackets aren't reorderable from the admin sheet yet, see
// `20260610000004_admin_extensions.sql` doubles rejection branch) and returns
// `[{ rank, profile_id, first_name, last_name }, ...]` sorted by rank, so
// the admin screen can move rows up/down and submit the new ordering as a
// uuid[8] array.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface BracketSeedEntry {
  rank: number;
  profile_id: string;
  first_name: string;
  last_name: string;
}

interface Raw {
  rank: number;
  profile_id: string;
  profile: { first_name: string; last_name: string } | null;
}

export interface UseBracketSeedsInput {
  seasonId: string | undefined;
  category: string | undefined;
  bracketSize: number;
}

export function useBracketSeeds({
  seasonId,
  category,
  bracketSize,
}: UseBracketSeedsInput) {
  return useQuery<BracketSeedEntry[]>({
    queryKey: seasonId && category
      ? [...queryKeys.admin.all, 'bracket-seeds', seasonId, category, bracketSize]
      : [...queryKeys.admin.all, 'bracket-seeds', 'disabled'],
    enabled: !!seasonId && !!category,
    queryFn: async () => {
      if (!seasonId || !category) return [];
      const { data, error } = await supabase
        .from('season_standings')
        .select(
          `rank, profile_id,
           profile:public_profiles!season_standings_profile_id_fkey(first_name, last_name)`,
        )
        .eq('season_id', seasonId)
        .eq('category', category)
        .lte('rank', bracketSize)
        .order('rank', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as Raw[]).map((r) => ({
        rank: r.rank,
        profile_id: r.profile_id,
        first_name: r.profile?.first_name ?? '?',
        last_name: r.profile?.last_name ?? '',
      }));
    },
  });
}
