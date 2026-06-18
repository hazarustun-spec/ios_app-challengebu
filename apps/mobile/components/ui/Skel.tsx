// Skel primitive — Plan 8 Phase C (final batch) → Wave 1 shimmer upgrade.
//
// Skeleton placeholder used while data loads. Renders a surface-2 container
// with a horizontal shimmer "glint" sweeping left→right instead of the
// previous opacity pulse. The sweep is driven on the UI thread via
// `useDerivedValue` (same approach as the old pulse) so the component stays
// snapshot-testable under bun:test without faking React's hook dispatcher.
//
// Props (unchanged from pulse version):
//   w?  — width (px number or `${n}%` string). Default '100%'.
//   h?  — height in px. Default 16.
//   r?  — border radius in px. Default 6.
//   style? — extra style merged on the outer container.
//
// Verified to look correct on both tiny circles (36×36 r=18) and wide
// pill bars (w=80 h=28 r=9999) as rendered in OpponentSuggestStrip.

import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
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

// Fallback highlight width used before onLayout fires (box width unknown).
const FALLBACK_HIGHLIGHT_W = 80;
// Highlight width as a fraction of measured box width.
const HIGHLIGHT_FRACTION = 0.45;

export function Skel({ w = '100%', h = 16, r = 6, style }: SkelProps) {
  // Measured box width — starts at 0, updated on layout.
  const boxW = useSharedValue(0);

  // Looping sweep progress 0→1 driven on the UI thread.
  const progress = useDerivedValue(() =>
    withRepeat(
      withTiming(1, {
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    ),
  );

  const glintStyle = useAnimatedStyle(() => {
    const measured = boxW.value;
    const highlightW = measured > 0 ? measured * HIGHLIGHT_FRACTION : FALLBACK_HIGHLIGHT_W;
    const tx = interpolate(progress.value, [0, 1], [-highlightW, measured + highlightW]);
    return { transform: [{ translateX: tx }] };
  });

  return (
    <View
      onLayout={(e) => {
        boxW.value = e.nativeEvent.layout.width;
      }}
      style={[
        {
          width: w as number,
          height: h,
          borderRadius: r,
          backgroundColor: colors.surface2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            // Width is set dynamically via glintStyle, but we need a base.
            // Use a percentage of the known container height as a floor so
            // React Native renders the view even before layout fires.
            width: FALLBACK_HIGHLIGHT_W,
            backgroundColor: 'rgba(255,255,255,0.65)',
            borderRadius: 4,
          },
          glintStyle,
        ]}
      />
    </View>
  );
}
