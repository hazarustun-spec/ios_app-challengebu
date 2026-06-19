// hooks/use-start-match.ts — Mutation that calls start_match RPC.
//
// Idempotent: the backend SECURITY DEFINER function appends the calling user
// to matches.started_by only once.  On success we invalidate both the detail
// query for that specific match and the full activeMatches list so any card
// in the hub tab also reflects the change.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export function useStartMatch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.rpc('start_match', { p_match_id: matchId });
      if (error) throw error;
    },
    onSuccess: (_data, matchId) => {
      // Invalidate the specific match detail so started_by is refreshed.
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.detail(matchId) });
      // Invalidate the whole activeMatches namespace to keep hub cards in sync.
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
    },
  });
}
