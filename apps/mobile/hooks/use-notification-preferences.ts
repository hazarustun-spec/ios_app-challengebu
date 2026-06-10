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

// Legacy single-string map kept for the pre-Plan-8 notification-preferences.tsx
// screen. Renamed away from `CATEGORY_LABELS` so it can't silently shadow the
// richer shape exported by @tennis/shared (title/subtitle/icon). Phase G rebuilds
// the screen against the shared rich map; this constant can be deleted then.
export const CATEGORY_LABEL_STRINGS: Record<NotificationCategory, string> = {
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
