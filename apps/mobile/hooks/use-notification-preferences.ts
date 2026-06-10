import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from '@tennis/shared';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export type { NotificationCategory };

export interface NotificationPreference {
  category: NotificationCategory;
  enabled: boolean;
}

// Legacy single-string CATEGORY_LABELS map kept for callers that haven't
// migrated to the richer @tennis/shared `CATEGORY_LABELS` (title/subtitle/icon)
// yet. Once notification-preferences.tsx is rebuilt against the Plan-8 design
// the legacy map can be deleted.
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  match_invitations: 'Maç teklifleri',
  match_score_pending: 'Maç onayları',
  badges_earned: 'Rozet kazanımı',
  season_lifecycle: 'Sezon & finaller',
  ladder_movement: 'Sıralama değişimi',
  community_announcements: 'Topluluk duyuruları',
  open_listings: 'Açık ilanlar',
  match_reminders: 'Hatırlatmalar',
};

export const ALL_CATEGORIES: readonly NotificationCategory[] = NOTIFICATION_CATEGORIES;

export function useNotificationPreferences() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<NotificationPreference[]>({
    queryKey: queryKeys.notifications.preferences(),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('category, enabled')
        .eq('profile_id', userId!);
      if (error) throw error;
      return (data ?? []) as NotificationPreference[];
    },
  });
}

export function useUpdateNotificationPreference() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { category: NotificationCategory; enabled: boolean }) => {
      if (!userId) throw new Error('not authenticated');
      // Upsert so a profile created before the default-prefs trigger landed
      // (or anywhere the trigger silently failed) still gets a row written.
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          { profile_id: userId, category: input.category, enabled: input.enabled },
          { onConflict: 'profile_id,category' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
    },
  });
}
