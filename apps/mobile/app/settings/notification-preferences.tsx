// Notification preferences — Plan 8 Phase G3.
//
// Ports the design source's `NotifPrefs` screen (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-profile.jsx
// `function NotifPrefs(...)`) and replaces the Plan 7 legacy screen at
// `app/notification-preferences.tsx`. The canonical 8 categories ship from
// `@tennis/shared/notifications` (NOTIFICATION_CATEGORIES + CATEGORY_LABELS).
//
// Behavior:
//   - useNotificationPreferences() reads the per-profile rows.
//   - Falling back on DEFAULT_ON keeps the toggles correct during the brief
//     window where the create_default_notification_preferences trigger
//     hasn't materialized rows yet (e.g., right after sign-up).
//   - useUpdateNotificationPreference() upserts so we never lose a toggle
//     when a row is missing.

import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  NOTIFICATION_CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_ON,
  type NotificationCategory,
} from '@tennis/shared';
import { NavHeader } from '../../components/ui/NavHeader';
import { Toggle } from '../../components/ui/Toggle';
import { Icon, type IconName } from '../../components/ui/Icon';
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from '../../hooks/use-notification-preferences';
import { registerForPushAsync } from '../../hooks/use-push-registration';
import { useAuthStore } from '../../stores/auth-store';
import { colors } from '../../theme/colors';

export default function NotificationPreferences() {
  const { data: prefs } = useNotificationPreferences();
  const update = useUpdateNotificationPreference();
  const session = useAuthStore((s) => s.session);
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    Notifications.getPermissionsAsync().then((s) => setPushGranted(s.granted));
  }, []);

  const enablePush = async () => {
    if (!session?.access_token || enabling) return;
    setEnabling(true);
    try {
      await registerForPushAsync(session.access_token);
    } catch {
      // status is re-read below regardless
    } finally {
      const s = await Notifications.getPermissionsAsync();
      setPushGranted(s.granted);
      setEnabling(false);
      if (!s.granted) {
        Alert.alert(
          'Bildirim izni gerekli',
          'Telefon bildirimlerini almak için izni Ayarlar > ChallengeBu! > Bildirimler bölümünden açabilirsin.',
        );
      }
    }
  };

  const enabledMap = new Map<NotificationCategory, boolean>(
    (prefs ?? []).map((p) => [p.category, p.enabled]),
  );

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Bildirim Tercihleri" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {pushGranted === false && (
          <Pressable
            onPress={enablePush}
            className="bg-surface rounded-lg flex-row items-center"
            style={{
              borderWidth: 1.5,
              borderColor: colors.clay,
              padding: 14,
              gap: 12,
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 14,
                backgroundColor: colors.claySofter,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="bell" size={18} color={colors.clay} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 14.5 }}
              >
                Telefon bildirimleri kapalı
              </Text>
              <Text
                className="font-sans text-text-3"
                style={{ fontSize: 12, marginTop: 1 }}
              >
                Push bildirimleri almak için dokun ve izin ver.
              </Text>
            </View>
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 14, color: colors.clay }}
            >
              {enabling ? '…' : 'Aç'}
            </Text>
          </Pressable>
        )}
        <View
          className="bg-surface rounded-lg overflow-hidden"
          style={{ borderWidth: 1, borderColor: colors.borderStrong }}
        >
          {NOTIFICATION_CATEGORIES.map((cat, i) => {
            const def = CATEGORY_LABELS[cat];
            const enabled = enabledMap.get(cat) ?? DEFAULT_ON[cat];
            return (
              <View
                key={cat}
                className="flex-row items-center"
                style={{
                  padding: 13,
                  paddingHorizontal: 16,
                  gap: 13,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: colors.surface3,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 14,
                    backgroundColor: colors.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={def.icon as IconName} size={18} color={colors.clay} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 14.5 }}
                  >
                    {def.title}
                  </Text>
                  <Text
                    className="font-sans text-text-3"
                    style={{ fontSize: 12, marginTop: 1 }}
                  >
                    {def.subtitle}
                  </Text>
                </View>
                <Toggle
                  value={enabled}
                  onChange={(v) =>
                    update.mutate({ category: cat, enabled: v })
                  }
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
