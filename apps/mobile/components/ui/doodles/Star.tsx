// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/doodles.jsx :: Star
// Five-point star — pink by default, optional outline-only mode.
import Svg, { Path } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../../theme/colors';

interface StarProps {
  size?: number;
  color?: string;
  /** When false, only the outline is drawn (fill = 'none'). */
  filled?: boolean;
  stroke?: number;
  style?: StyleProp<ViewStyle>;
}

export function Star({
  size = 26,
  color = colors.pink,
  filled = true,
  stroke = 2.6,
  style,
}: StarProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      style={style}
    >
      <Path
        d="M12 2.5l2.2 6.3 6.8.2-5.4 4.1 2 6.6L12 16l-5.6 3.7 2-6.6-5.4-4.1 6.8-.2z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
