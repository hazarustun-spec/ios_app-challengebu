import { Alert, Text, View } from 'react-native';
import { DEFAULT_ON } from '@tennis/shared';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { Toggle } from '../components/ui/Toggle';
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from '../hooks/use-notification-preferences';

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
