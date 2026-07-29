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
      const { data, error } = await supabase
        .from('match_requests')
        .delete()
        .eq('id', id)
        .select('id');
      if (error) throw error;
      // RLS silently filters a DELETE to zero rows instead of erroring (e.g.
      // the request was already accepted server-side), which would otherwise
      // read as a successful withdrawal that did nothing.
      if (!data || data.length === 0) {
        throw new Error('Teklif artık geri çekilemiyor');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
      // Withdrawing a pending direct challenge cascades to delete its
      // conversation + messages server-side (conversations.request_id ON
      // DELETE CASCADE) — refresh the conversation list, unread count, and
      // contacts so the messages pip / /messages screen don't reference a
      // deleted thread.
      qc.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}
