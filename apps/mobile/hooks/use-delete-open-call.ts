import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

/**
 * Delete the creator's own pending open call. RLS only allows deleting a
 * `pending` request you created; FKs cascade so applications + chat go too.
 */
export function useDeleteOpenCall() {
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
