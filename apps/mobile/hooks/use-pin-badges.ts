import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function usePinBadges() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { selectedBadgeIds: string[] }) => {
      if (!userId) throw new Error('Oturum bulunamadı');
      if (input.selectedBadgeIds.length > 3) {
        throw new Error('En fazla 3 rozet seçebilirsin');
      }
      const { error } = await supabase.rpc('pin_badges', { badge_ids: input.selectedBadgeIds });
      if (error) throw error;
    },
    onSuccess: () => {
      if (!userId) return;
      qc.invalidateQueries({ queryKey: queryKeys.badges.forUser(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    },
  });
}
