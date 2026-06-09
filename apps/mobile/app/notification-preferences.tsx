import { Alert, Text, View } from 'react-native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { Toggle } from '../components/ui/Toggle';
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  type NotificationCategory,
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from '../hooks/use-notification-preferences';

// Match the migration's create_default_notification_preferences trigger so a
// missing row renders the spec-correct default instead of OFF.
const DEFAULT_ON: Record<NotificationCategory, boolean> = {
  match_proposals: true,
  match_reminders: true,
  score_confirmations: true,
  elo_and_ranking: false,
  badges: true,
  season_and_tournament: true,
  community_announcements: true,
  inactivity_warning: true,
};

export default function NotificationPreferencesScreen() {
  const { data, isLoading, isError } = useNotificationPreferences();
  const update = useUpdateNotificationPreference();

  if (isLoading) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-red-700">Tercihler yüklenemedi. Lütfen tekrar dene.</Text>
      </ScreenContainer>
    );
  }

  const map = new Map((data ?? []).map((p) => [p.category, p.enabled]));

  return (
    <ScreenContainer scrollable>
      <Text className="mb-2 text-base font-semibold text-gray-900">Bildirim Tercihleri</Text>
      <Text className="mb-4 text-xs text-gray-500">
        Kategoriler kapalıysa o tür için push gönderilmez, in-app bildirim de görünmez.
      </Text>
      <View>
        {ALL_CATEGORIES.map((cat) => (
          <Toggle
            key={cat}
            label={CATEGORY_LABELS[cat]}
            value={map.get(cat) ?? DEFAULT_ON[cat]}
            onValueChange={(v) =>
              update.mutate(
                { category: cat, enabled: v },
                { onError: () => Alert.alert('Hata', 'Tercih kaydedilemedi.') },
              )
            }
          />
        ))}
      </View>
    </ScreenContainer>
  );
}
