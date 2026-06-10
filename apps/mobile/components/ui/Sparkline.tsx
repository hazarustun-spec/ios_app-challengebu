// Sparkline — Plan 8 Phase C10.
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
//
// Implementation notes:
//   - We deliberately don't render the trailing dot the web version does;
//     in the React Native context the small chart sits inside dense rows
//     and the extra circle reads as noise on a 60×20 box.
//   - `flat()` math is intentionally tiny: 2 fixed-point digits for points
//     so snapshot diffs remain readable across environments.

import Svg, { Polyline } from 'react-native-svg';
import { colors } from '../../theme/colors';

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
  // Fewer than 2 points → render an empty box so the layout slot is still
  // reserved (no jank when the first data point lands).
  if (data.length < 2) {
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
      <Polyline
        points={points}
        fill="none"
        stroke={finalColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
