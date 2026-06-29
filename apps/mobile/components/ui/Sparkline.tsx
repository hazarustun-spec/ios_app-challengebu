// Sparkline — Plan 8 Phase C10, motion-polished (draw-in animation added).
//
// Tiny SVG line chart for ELO trends. Lives inside the home-screen ELO hero
// card and the leaderboard rows where the trailing 5–10 ELO points need to
// communicate momentum at a glance.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function Sparkline({ data, color, w, h, stroke })`.
//
// Behaviour:
//   - Renders nothing meaningful (empty SVG box) when fewer than 2 points
//     exist — guards against the initial-history edge case.
//   - `color='auto'` (default) picks `colors.win` when the last point is at
//     or above the first point and `colors.loss` otherwise — mirrors the
//     web design's up/down semantic split.
//   - Any explicit color string (hex, named) is passed straight through.
//   - On mount (or when `data.length` changes) the line draws in left→right
//     over 600ms via strokeDashoffset (same pattern as elo-history.tsx).
//
// Implementation notes:
//   - We deliberately don't render the trailing dot the web version does;
//     in the React Native context the small chart sits inside dense rows
//     and the extra circle reads as noise on a 60×20 box.
//   - `flat()` math is intentionally tiny: 2 fixed-point digits for points
//     so snapshot diffs remain readable across environments.
//   - Animation hooks are called unconditionally (before the < 2 early return)
//     to satisfy React's rules of hooks.

import { useEffect } from 'react';
import Svg, { Polyline } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

// Defined outside the component so createAnimatedComponent runs only once.
const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

/**
 * Approximate chord-length sum of the sparkline polyline, with a 25% buffer
 * for visual completeness (ensures strokeDashoffset=0 fully reveals the line).
 * Mirrors the approxPathLen helper in elo-history.tsx.
 */
function approxSparklineLen(data: number[], w: number, h: number): number {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const xFn = (i: number) => (i / (data.length - 1)) * w;
  const yFn = (v: number) => h - ((v - min) / range) * h;
  let len = 0;
  for (let i = 1; i < data.length; i++) {
    const dx = xFn(i) - xFn(i - 1);
    const dy = yFn(data[i]!) - yFn(data[i - 1]!);
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len * 1.25;
}

export interface SparklineProps {
  /** ELO history (chronological — index 0 is oldest). */
  data: number[];
  /** 'auto' picks win/loss color from trend; or a literal color string. */
  color?: 'auto' | string;
  /** Width in points. Default 60. */
  w?: number;
  /** Height in points. Default 20. */
  h?: number;
  /** Stroke width. Default 2. */
  stroke?: number;
}

export function Sparkline({
  data,
  color = 'auto',
  w = 60,
  h = 20,
  stroke = 2,
}: SparklineProps) {
  const hasData = data.length >= 2;
  // Compute path length up-front so SharedValue sync happens before useEffect.
  const pathLen = hasData ? approxSparklineLen(data, w, h) : 1;

  // Animation SharedValues — called unconditionally before any early return.
  const pathLenSV = useSharedValue(pathLen);
  const drawProgress = useSharedValue(0);

  // Draw left→right on mount and whenever the data set changes size.
  useEffect(() => {
    if (!hasData) return;
    pathLenSV.value = pathLen;
    drawProgress.value = 0;
    drawProgress.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    // pathLenSV / drawProgress are stable SharedValue refs — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length]);

  // strokeDashoffset: pathLen (hidden) → 0 (fully drawn), mirroring elo-history.
  const animatedPolylineProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLenSV.value * (1 - drawProgress.value),
  }));

  // Fewer than 2 points → render an empty box so the layout slot is still
  // reserved (no jank when the first data point lands).
  if (!hasData) {
    return <Svg width={w} height={h} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / range) * h;
  const points = data
    .map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`)
    .join(' ');

  const first = data[0]!;
  const last = data[data.length - 1]!;
  const finalColor =
    color === 'auto' ? (last >= first ? colors.win : colors.loss) : color;

  return (
    <Svg width={w} height={h}>
      <AnimatedPolyline
        points={points}
        fill="none"
        stroke={finalColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLen}
        animatedProps={animatedPolylineProps}
      />
    </Svg>
  );
}
