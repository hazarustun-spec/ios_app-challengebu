// TabBar primitive — Plan 8 Phase C8 (+ tab-switch animations).
//
// Ports the design bundle's `TabBar` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/shell.jsx) to React
// Native + NativeWind, packaged as a drop-in `tabBar` prop for Expo Router's
// `<Tabs />` navigator.
//
// Visual structure:
//   Lime pill container (h-16, rounded-pill, 1.5px ink border)
//   ├─ Anasayfa · Maçlar · "+" (center) · Sıralama · Profil
//   The active highlight is a single court-blue circle that SLIDES between
//   tabs (the previous version snapped instantly). Each icon springs on press.
//   The central "+" keeps a permanent court-blue fill + white ring and never
//   settles on a tab (taps route to the new-match modal).
//
// React Navigation integration: shaped to satisfy the `tabBar` prop of
// expo-router / @react-navigation/bottom-tabs. We accept the `state` +
// `navigation` props the navigator passes and read only the slice we need
// (see the structural shims below).

import { useEffect, useRef } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Icon, type IconName } from './Icon';

// ---------------------------------------------------------------------------
// Structural BottomTabBarProps shim — only the fields we touch are typed.
// ---------------------------------------------------------------------------

interface TabRouteLike {
  key: string;
  name: string;
}

interface TabStateLike {
  index: number;
  routes: TabRouteLike[];
}

interface TabNavigationLike {
  navigate: (name: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit: (event: any) => any;
}

export interface TabBarProps {
  state: TabStateLike;
  navigation: TabNavigationLike;
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
}

const SLOTS: SlotConfig[] = [
  { name: 'index', icon: 'home' }, // Anasayfa (landing)
  { name: 'matches', icon: 'matches' },
  { name: 'new-match', icon: 'plus', isCenter: true },
  { name: 'leaderboard', icon: 'ranking' }, // Sıralama
  { name: 'profile', icon: 'user' },
];

const SLOT_SIZE = 48;

// ---------------------------------------------------------------------------
// TabSlot — one pressable icon with a press-bounce.
// ---------------------------------------------------------------------------

interface TabSlotProps {
  slot: SlotConfig;
  isActive: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}

function TabSlot({ slot, isActive, onPress, onLayout }: TabSlotProps) {
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isCenter = !!slot.isCenter;
  const inkBg = isActive || isCenter;
  const size = isCenter ? 52 : SLOT_SIZE;

  const handlePress = () => {
    // Light haptic tap (best-effort; no-op on the simulator/unsupported).
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Quick squash → spring back.
    scale.value = withSequence(
      withTiming(0.8, { duration: 90 }),
      withSpring(1, { damping: 9, stiffness: 320 }),
    );
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={slot.name}
      accessibilityState={{ selected: isActive }}
      style={{
        width: size,
        height: size,
        // Same color token as the sliding indicator so the center "+" and the
        // active pill are pixel-identical blues (avoids any NativeWind-vs-token
        // discrepancy). Center keeps a white ring; non-center slots stay
        // transparent and get their highlight from the sliding indicator.
        backgroundColor: isCenter ? colors.court : 'transparent',
      }}
      className={[
        'items-center justify-center rounded-full',
        isCenter ? 'border-2 border-white' : '',
      ].join(' ')}
    >
      <Animated.View style={iconStyle}>
        <Icon
          name={slot.icon}
          size={isCenter ? 25 : 23}
          color={inkBg ? '#FFFFFF' : colors.onLime}
          stroke={isCenter ? 2.7 : isActive ? 2.4 : 2.1}
        />
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// TabBar
// ---------------------------------------------------------------------------

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;

  // Measured top-left of each slot within the inner (padding-free) row, so the
  // sliding indicator can land exactly on the active slot.
  const positions = useRef<Record<number, { x: number; y: number }>>({});
  const indicatorX = useSharedValue<number | null>(null);
  const indicatorY = useSharedValue(0);

  const onSlotLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, y } = e.nativeEvent.layout;
    positions.current[i] = { x, y };
    if (i === activeIndex) {
      indicatorY.value = y;
      if (indicatorX.value === null) indicatorX.value = x; // place without animating on first paint
    }
  };

  useEffect(() => {
    const p = positions.current[activeIndex];
    if (!p) return;
    indicatorY.value = p.y;
    if (indicatorX.value === null) {
      indicatorX.value = p.x;
    } else {
      indicatorX.value = withSpring(p.x, { damping: 16, stiffness: 220, mass: 0.8 });
    }
  }, [activeIndex, indicatorX, indicatorY]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorX.value === null ? 0 : 1,
    transform: [
      { translateX: indicatorX.value ?? 0 },
      { translateY: indicatorY.value },
    ],
  }));

  return (
    <View style={{ paddingBottom: insets.bottom + 8 }} className="px-4 pt-2">
      <View className="h-16 flex-row items-center rounded-pill border-base border-border-strong bg-lime px-2">
        {/* Inner padding-free row: shared origin for the indicator + slots. */}
        <View
          style={{ flex: 1, position: 'relative' }}
          className="flex-row items-center justify-between"
        >
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: 0,
                width: SLOT_SIZE,
                height: SLOT_SIZE,
                borderRadius: SLOT_SIZE / 2,
                backgroundColor: colors.court,
              },
              indicatorStyle,
            ]}
          />
          {SLOTS.map((slot, i) => {
            const route = state.routes[i];
            if (!route) return null;
            const isActive = activeIndex === i;

            const handlePress = () => {
              // Emit tabPress so screen listeners can intercept. The center "+"
              // listener in (tabs)/_layout.tsx calls preventDefault + pushes the
              // new-match wizard; without emitting it the "+" would just land on
              // the empty new-match placeholder.
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (event.defaultPrevented) return;
              if (!isActive) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabSlot
                key={slot.name}
                slot={slot}
                isActive={isActive}
                onPress={handlePress}
                onLayout={onSlotLayout(i)}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
