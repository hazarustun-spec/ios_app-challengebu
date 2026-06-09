import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export type NotificationCategory =
  | 'match_proposals'
  | 'match_reminders'
  | 'score_confirmations'
  | 'elo_and_ranking'
  | 'badges'
  | 'season_and_tournament'
  | 'community_announcements'
  | 'inactivity_warning';

export interface NotificationPreference {
  category: NotificationCategory;
  enabled: boolean;
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  match_proposals: 'Maç teklifleri',
  match_reminders: 'Maç hatırlatma',
  score_confirmations: 'Skor onayları',
  elo_and_ranking: 'ELO ve sıralama',
  badges: 'Rozet',
  season_and_tournament: 'Sezon ve turnuva',
  community_announcements: 'Topluluk duyuruları',
  inactivity_warning: 'Pasiflik uyarısı',
};

export const ALL_CATEGORIES: NotificationCategory[] = [
  'match_proposals',
  'match_reminders',
  'score_confirmations',
  'elo_and_ranking',
  'badges',
  'season_and_tournament',
  'community_announcements',
  'inactivity_warning',
];

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
