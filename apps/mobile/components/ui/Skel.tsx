// Skel primitive — Plan 8 Phase C (final batch).
//
// Pulsing skeleton placeholder used while data loads. Mirrors the design
// bundle's `Skel` block (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function Skel(...)`) — a rounded surface-2 block that gently fades
// between full opacity and ~0.45 every 700ms via Reanimated.
//
// Implementation note: we drive the looping fade with `useDerivedValue`
// (UI-thread evaluation of `withRepeat`) rather than `useEffect` —
// mirrors the approach in `Sheet` (see Sheet.tsx) and keeps the
// component snapshot-testable under bun:test without having to fake
// React's hook dispatcher. Reusable: callers control width, height, and
// corner radius. Default dimensions match a single line of body text
// (100% × 16, radius 6).

import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../../theme/colors';

export interface SkelProps {
  /** Width — number (px) or a `${n}%` string. Default '100%'. */
  w?: number | `${number}%`;
  /** Height in px. Default 16. */
  h?: number;
  /** Border radius in px. Default 6. */
  r?: number;
  /** Optional extra style merged on top of the animated wrapper. */
  style?: StyleProp<ViewStyle>;
}

export function Skel({ w = '100%', h = 16, r = 6, style }: SkelProps) {
  // UI-thread driven loop — no useEffect needed, which keeps the
  // component snapshot-testable without faking React's hook dispatcher.
  const opacity = useDerivedValue(() =>
    withRepeat(withTiming(0.45, { duration: 700 }), -1, true),
  );

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width: w as number,
          height: h,
          borderRadius: r,
          backgroundColor: colors.surface2,
        },
        style,
      ]}
    />
  );
}
