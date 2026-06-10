// Sheet primitive — Plan 8 Phase C6.
//
// Ports the design bundle's bottom `Sheet` overlay (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function Sheet(...)`) to React Native + NativeWind + Reanimated.
//
// Visual contract:
//   - Backdrop: full-screen dim using rgba(10,9,7,0.55).
//   - Content: bottom-anchored, 100% width, surface bg, rounded-t-xl, 1.5px
//     ink border on the top edge only.
//   - Grab handle (optional, default on): 36×4 pill in surface-3, centered
//     at the top with 8px breathing room beneath.
//   - Title (optional): h3-equivalent (font-display, extrabold, 18px),
//     centered with 12px top padding.
//   - Entry animation: slideUp — translateY from screen height → 0 over
//     220ms using the slideUp cubic-bezier curve.
//
// Behavior:
//   - Backdrop tap closes the sheet.
//   - Hardware back triggers `onClose` via RN's `onRequestClose`.
//   - Pan-down dismissal is deferred to Phase H polish; the grab handle is
//     visual today so callers using a "Done" / "Kapat" button still work.
//
// Consumed by: format seç, kort seç, kategori filtre, askıya al süre seç,
// dept seç (onboarding) action sheets.

import type { ReactNode } from 'react';
import {
  Dimensions,
  Modal as RNModal,
  Pressable,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { curves } from '../../theme/motion';

export interface SheetProps {
  visible: boolean;
  onClose?: () => void;
  title?: string;
  /** Optional grab handle pill on top edge. Defaults to true. */
  grabHandle?: boolean;
  children?: ReactNode;
}

const SCREEN_H = Dimensions.get('window').height;
const SHEET_DURATION = 220;

export function Sheet({
  visible,
  onClose,
  title,
  grabHandle = true,
  children,
}: SheetProps) {
  // useDerivedValue re-targets the animation on the UI thread whenever
  // `visible` flips on the JS thread — no useEffect needed, which keeps the
  // component snapshot-testable without faking React's hook dispatcher.
  const translateY = useDerivedValue(
    () =>
      withTiming(visible ? 0 : SCREEN_H, {
        duration: SHEET_DURATION,
        easing: curves.slideUp,
      }),
    [visible],
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose?.()}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          onPress={() => onClose?.()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10,9,7,0.55)',
          }}
        />
        <Animated.View
          style={contentStyle}
          className="rounded-t-xl border-t-base border-border-strong bg-surface px-5 pt-3 pb-8"
        >
          {grabHandle && (
            <View className="mx-auto mb-2 h-1 w-9 rounded-full bg-surface-3" />
          )}
          {title && (
            <Text className="mb-4 pt-3 text-center font-display text-[18px] font-extrabold text-text">
              {title}
            </Text>
          )}
          {children}
        </Animated.View>
      </View>
    </RNModal>
  );
}
