import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

/**
 * Delete a pending `match_requests` row the current user created — either an
 * open call or a direct challenge. RLS enforces creator + `pending`
 * (20260619000004_match_request_creator_delete.sql); FKs cascade so
 * applications and any attached chat go with it.
 */
export function useDeleteMatchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('match_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
    },
  });
}
