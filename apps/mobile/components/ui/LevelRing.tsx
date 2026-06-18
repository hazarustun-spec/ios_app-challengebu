// LevelRing primitive — Plan 8 Phase C → Wave 1 SVG ring draw-on.
//
// Renders the player's Avatar WITHOUT the solid-border ring (so Avatar
// renders at its natural size), then overlays an absolutely-positioned SVG
// circle that DRAWS itself clockwise from empty → full on mount over 750ms.
//
// Animation approach — UI-thread only (no useEffect / React hooks):
//   A `useDerivedValue` driven by `withTiming(1, …)` animates a progress
//   scalar 0 → 1 once on mount.  `useAnimatedProps` maps
//   progress ∈ [0,1] → strokeDashoffset ∈ [circumference, 0] via
//   `interpolate`, producing the draw-on effect.
//   This mirrors the pattern used by Skel's shimmer (`useDerivedValue` +
//   `interpolate`) so the component stays snapshot-testable under bun:test
//   without needing to fake React's hook dispatcher.
//
// Geometry:
//   Circle is centered at (size/2, size/2) with radius r = (size–strokeWidth)/2
//   so its outer edge sits flush with the Avatar's bounding box — same visual
//   position as the old solid border ring.
//
// Props (unchanged):
//   name    — display name forwarded to Avatar
//   elo     — drives ring color via levelForElo
//   size?   — pixel diameter (default 82)
//   uri?    — optional photo URL forwarded to Avatar

import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { levelForElo } from '../../lib/levels';
import { Avatar } from './Avatar';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface LevelRingProps {
  /** Display name forwarded to Avatar. */
  name: string;
  /** Current ELO — drives the ring color via `levelForElo`. */
  elo: number;
  /** Pixel diameter. Default 82 (profile hero size). */
  size?: number;
  /** Optional photo URI forwarded to Avatar. */
  uri?: string;
}

export function LevelRing({ name, elo, size = 82, uri }: LevelRingProps) {
  const lv = levelForElo(elo);

  // Stroke width scales with size but never goes below 3px.
  const strokeWidth = Math.max(3, size * 0.04);
  // Circle radius so the stroke sits flush at the Avatar's edge.
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  // Progress 0 → 1 driven on the UI thread — fires once on mount.
  // `withTiming(1)` animates the derived value from its default (0) to 1.
  const progress = useDerivedValue(() =>
    withTiming(1, {
      duration: 750,
      easing: Easing.out(Easing.cubic),
    }),
  );

  // Map progress [0, 1] → strokeDashoffset [circumference, 0]
  // so at progress=0 the ring is invisible and at progress=1 it is fully drawn.
  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [circumference, 0]),
  }));

  return (
    <View style={{ width: size, height: size }}>
      {/* Avatar rendered without the built-in ring so we own the ring geometry */}
      <Avatar name={name} size={size} uri={uri} />

      {/* SVG ring overlay — absolutely positioned over the avatar */}
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="none"
      >
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={lv.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          // rotate -90° so the stroke starts at the top of the circle
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          animatedProps={animProps}
        />
      </Svg>
    </View>
  );
}
