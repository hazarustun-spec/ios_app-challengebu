// Plan 8 Phase G — admin bracket seed reorder.
//
// Wraps the `admin_reorder_bracket_seeds(tournament_id uuid, seed_player_ids
// uuid[8])` SECURITY DEFINER RPC introduced in
// `20260610000004_admin_extensions.sql`.
//
// The RPC rewrites `season_standings.rank` so that `rank = i+1` corresponds
// to `seedPlayerIds[i]`. The QF pairings (1v8, 4v5, 3v6, 2v7) stay constant;
// only the *players* holding each integer seed move. Doubles tournaments are
// rejected (errcode 0A000) until the doubles standings table is wired up.
//
// Caller contract:
//   - `seedPlayerIds` must be exactly 8 distinct UUIDs — the RPC also
//     validates this and surfaces 22023 on duplicates / wrong length.
//   - On success we invalidate the bracket detail (so the seed list refreshes
//     with the new player order) and the admin umbrella (so any cached
//     standings-driven tile counts re-fetch).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface ReorderBracketInput {
  tournamentId: string;
  seedPlayerIds: string[];
}

export function useReorderBracket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tournamentId, seedPlayerIds }: ReorderBracketInput) => {
      const { error } = await supabase.rpc('admin_reorder_bracket_seeds', {
        tournament_id: tournamentId,
        seed_player_ids: seedPlayerIds,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.tournaments.bracket(variables.tournamentId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
