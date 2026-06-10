// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/doodles.jsx :: Squiggle
// Wavy pink squiggle decoration.
import Svg, { Path } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../../theme/colors';

interface SquiggleProps {
  /** Width in px (height auto-derives from 0.25 aspect ratio). */
  w?: number;
  color?: string;
  stroke?: number;
  style?: StyleProp<ViewStyle>;
}

export function Squiggle({
  w = 60,
  color = colors.pink,
  stroke = 3,
  style,
}: SquiggleProps) {
  const h = w * 0.25;
  return (
    <Svg width={w} height={h} viewBox="0 0 60 15" fill="none" style={style}>
      <Path
        d="M2 8 C8 2, 14 14, 20 8 S32 2, 38 8 S50 14, 58 8"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
