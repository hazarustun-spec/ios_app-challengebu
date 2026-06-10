// Modal primitive — Plan 8 Phase C6.
//
// Ports the design bundle's centered `Modal` overlay (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function Modal(...)`) to React Native + NativeWind + Reanimated.
//
// Visual contract:
//   - Backdrop: full-screen dim using rgba(10,9,7,0.55).
//   - Content: centered, max 88% width, surface background, 1.5px ink border,
//     rounded-lg corners and generous padding.
//   - Entry animation: popIn over `durations.fast` — scale 0.92 → 1 and
//     opacity 0 → 1 using the popIn cubic-bezier curve (slight overshoot).
//
// Behavior:
//   - Backdrop tap closes when `dismissible` is true (the default).
//   - Hardware back / ESC trigger `onClose` via RN's `onRequestClose`.
//   - Inner content stops backdrop press propagation via a non-op Pressable
//     wrapper so taps inside the content do not dismiss the modal.
//
// Consumed by: "hesabı sil" two-step confirm, format kuralları onay, ELO
// çarpan tablosu, etc.

import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { curves, durations } from '../../theme/motion';

export interface ModalProps {
  visible: boolean;
  onClose?: () => void;
  /**
   * When false, taps on the backdrop do not close the modal. Defaults to
   * true. Hardware back still fires `onClose` regardless — callers that
   * need a fully blocking modal should ignore `onClose` themselves.
   */
  dismissible?: boolean;
  children?: ReactNode;
}

export function Modal({
  visible,
  onClose,
  dismissible = true,
  children,
}: ModalProps) {
  // useDerivedValue re-targets the animation on the UI thread whenever
  // `visible` flips on the JS thread — no useEffect needed, which keeps the
  // component snapshot-testable without faking React's hook dispatcher.
  const scale = useDerivedValue(
    () =>
      withTiming(visible ? 1 : 0.92, {
        duration: durations.fast,
        easing: curves.popIn,
      }),
    [visible],
  );
  const opacity = useDerivedValue(
    () => withTiming(visible ? 1 : 0, { duration: durations.fast }),
    [visible],
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleBackdropPress = dismissible ? () => onClose?.() : undefined;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose?.()}
      statusBarTranslucent
    >
      <Pressable
        onPress={handleBackdropPress}
        accessibilityRole={dismissible ? 'button' : undefined}
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: 'rgba(10,9,7,0.55)' }}
      >
        {/* Intercept presses on the content surface so they don't bubble to
            the backdrop and dismiss the modal. */}
        <Pressable onPress={() => {}} className="w-full max-w-[88%]">
          <Animated.View
            style={contentStyle}
            className="rounded-lg border-base border-border-strong bg-surface p-5"
          >
            <View>{children}</View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
