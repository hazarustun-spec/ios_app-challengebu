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
      const now = new Date().toISOString();

      const { error: clearErr } = await supabase
        .from('user_badges')
        .update({ pinned_at: null })
        .eq('profile_id', userId)
        .not('pinned_at', 'is', null);
      if (clearErr) throw clearErr;

      if (input.selectedBadgeIds.length > 0) {
        const { error: setErr } = await supabase
          .from('user_badges')
          .update({ pinned_at: now })
          .eq('profile_id', userId)
          .in('badge_id', input.selectedBadgeIds);
        if (setErr) throw setErr;
      }

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ pinned_badge_ids: input.selectedBadgeIds })
        .eq('user_id', userId);
      if (profileErr) throw profileErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.badges.mine() });
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
