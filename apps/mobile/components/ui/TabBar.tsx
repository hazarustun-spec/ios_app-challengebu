// TabBar primitive — Plan 8 Phase C8.
//
// Ports the design bundle's `TabBar` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/shell.jsx
// `function TabBar(...)`) to React Native + NativeWind, packaged as a
// drop-in `tabBar` prop for Expo Router's `<Tabs />` navigator.
//
// Visual structure:
//   Lime pill container (h-16, rounded-pill, 1.5px ink border)
//   ├─ Sıralama  (48x48 circle, court-blue fill when active, otherwise transparent)
//   ├─ Maçlar    (idem)
//   ├─ "+"       central, 52x52 court-blue circle, 2px WHITE ring, plus glyph;
//   │            never settles on a tab — taps navigate to the modal
//   │            `new-match` route
//   ├─ Bildirim  (idem) + pink-deep numeric badge bubble (hidden when active)
//   └─ Profil    (idem)
//   Safe-area inset is added below via `react-native-safe-area-context`.
//
// React Navigation integration:
//   The component is shaped to satisfy the `tabBar` prop signature of
//   `expo-router` / `@react-navigation/bottom-tabs`. We accept the same
//   `state` + `navigation` props the navigator passes in.
//
//   `@react-navigation/bottom-tabs` is not installed as a direct dep — it's
//   only present transitively inside `expo-router`'s `build/` tree. To keep
//   type-checking honest without forcing an extra `bun add` we define a
//   local structural type that captures the slice of `BottomTabBarProps` we
//   actually consume (`state.index`, `state.routes`, `navigation.navigate`,
//   `navigation.emit`). Anything Expo Router passes that we don't read is
//   accepted via the optional `descriptors` / `insets` indexed fields.
//
// Slot order matches the Plan 8 design source: ranking, matches, plus,
// notifications, profile. The Expo Router screen names in `(tabs)/_layout.tsx`
// must be created in the same order; the wiring lives in Phase E1.

import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Icon, type IconName } from './Icon';

// ---------------------------------------------------------------------------
// Structural BottomTabBarProps shim
// ---------------------------------------------------------------------------
// Only the fields we touch are typed. Expo Router passes the full
// `BottomTabBarProps` shape at runtime; we ignore everything else.

interface TabRouteLike {
  key: string;
  name: string;
}

interface TabStateLike {
  index: number;
  routes: TabRouteLike[];
}

// `emit` in `@react-navigation/bottom-tabs` is overloaded per-event-type
// with a literal `canPreventDefault: true` for `tabPress`. Our shim only
// fires `tabPress` and only reads `defaultPrevented`. Typing the argument
// AND the return as `any` keeps the shape structurally compatible with
// whatever the real bottom-tabs typings hand us at runtime — the
// alternative (writing the full overload by hand) duplicates upstream
// complexity for zero local benefit.
interface TabNavigationLike {
  navigate: (name: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit: (event: any) => any;
}

export interface TabBarProps {
  state: TabStateLike;
  navigation: TabNavigationLike;
  /** Optional notification badge count. Hidden when 0 or when the notif tab is active. */
  notifBadgeCount?: number;
  // The runtime React Navigation type ships `descriptors` + `insets`; we
  // accept them but never read them, so they stay optional + opaque.
  descriptors?: unknown;
  insets?: unknown;
}

// ---------------------------------------------------------------------------
// Slot configuration
// ---------------------------------------------------------------------------

interface SlotConfig {
  /** Expo Router screen name. Must match the file inside `app/(tabs)/`. */
  name: string;
  icon: IconName;
  /** Central "+" — visually dominant, never persists as the active tab. */
  isCenter?: boolean;
  /** Slot that receives the notif badge count prop. */
  isNotif?: boolean;
}

const SLOTS: SlotConfig[] = [
  { name: 'index', icon: 'home' }, // Anasayfa (landing)
  { name: 'matches', icon: 'matches' },
  { name: 'new-match', icon: 'plus', isCenter: true },
  { name: 'leaderboard', icon: 'ranking' }, // Sıralama (Stack push)
  { name: 'notifications', icon: 'bell', isNotif: true },
  { name: 'profile', icon: 'user' },
];

export function TabBar({ state, navigation, notifBadgeCount = 0 }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;

  return (
    <View style={{ paddingBottom: insets.bottom + 8 }} className="px-4 pt-2">
      <View className="h-16 flex-row items-center justify-between rounded-pill border-base border-border-strong bg-lime px-2">
        {SLOTS.map((slot, i) => {
          const route = state.routes[i];
          if (!route) return null;
          const isActive = activeIndex === i;
          const isCenter = !!slot.isCenter;
          const badgeCount = slot.isNotif ? notifBadgeCount : 0;
          const inkBg = isActive || isCenter;
          const size = isCenter ? 52 : 48;

          const handlePress = () => {
            // Central "+" always routes to the modal — never stays on a tab.
            if (isCenter) {
              navigation.navigate(slot.name);
              return;
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isActive && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={slot.name}
              onPress={handlePress}
              accessibilityRole="button"
              accessibilityLabel={slot.name}
              accessibilityState={{ selected: isActive }}
              style={{ width: size, height: size }}
              className={[
                'items-center justify-center rounded-full',
                inkBg ? 'bg-court' : 'bg-transparent',
                isCenter ? 'border-2 border-white' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <Icon
                name={slot.icon}
                size={isCenter ? 25 : 23}
                color={inkBg ? '#FFFFFF' : colors.onLime}
                stroke={isCenter ? 2.7 : isActive ? 2.4 : 2.1}
              />
              {badgeCount > 0 && !isActive && (
                <View
                  style={{ top: 6, right: 7 }}
                  className="absolute h-[15px] min-w-[15px] items-center justify-center rounded-pill border-base border-lime bg-pink-deep px-1"
                >
                  <Text className="font-sans text-[9.5px] font-extrabold text-white">
                    {badgeCount > 99 ? '99+' : String(badgeCount)}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
