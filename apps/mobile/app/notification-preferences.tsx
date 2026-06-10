import { Alert, Text, View } from 'react-native';
import { DEFAULT_ON } from '@tennis/shared';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { Toggle } from '../components/ui/Toggle';
import {
  ALL_CATEGORIES,
  CATEGORY_LABEL_STRINGS,
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
          <View
            key={cat}
            className="mb-3 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3"
          >
            <Text className="flex-1 text-base text-gray-800">
              {CATEGORY_LABEL_STRINGS[cat]}
            </Text>
            <Toggle
              value={map.get(cat) ?? DEFAULT_ON[cat]}
              onChange={(v) =>
                update.mutate(
                  { category: cat, enabled: v },
                  { onError: () => Alert.alert('Hata', 'Tercih kaydedilemedi.') },
                )
              }
            />
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}
