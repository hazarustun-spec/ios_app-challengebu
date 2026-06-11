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

import { ScrollView, Text, View } from 'react-native';
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
import { colors } from '../../theme/colors';

export default function NotificationPreferences() {
  const { data: prefs } = useNotificationPreferences();
  const update = useUpdateNotificationPreference();

  const enabledMap = new Map<NotificationCategory, boolean>(
    (prefs ?? []).map((p) => [p.category, p.enabled]),
  );

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Bildirim Tercihleri" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
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
