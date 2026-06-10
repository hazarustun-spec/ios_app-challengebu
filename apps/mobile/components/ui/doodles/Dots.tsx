// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/doodles.jsx :: Dots
// Small dots burst — 8 circles around a centerless ring, alternating radii.
import Svg, { Circle } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../../theme/colors';

interface DotsProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [8, 20],
  [20, 8],
  [32, 20],
  [20, 32],
  [13, 13],
  [27, 13],
  [27, 27],
  [13, 27],
] as const;

export function Dots({ size = 40, color = colors.pink, style }: DotsProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill={color} style={style}>
      {POSITIONS.map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r={i % 2 ? 2 : 2.8} fill={color} />
      ))}
    </Svg>
  );
}
