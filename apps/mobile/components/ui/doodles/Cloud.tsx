// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/doodles.jsx :: Cloud
// Outline cloud/blob — used over lime hero blocks.
import Svg, { Path } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../../theme/colors';

interface CloudProps {
  /** Width in px (height auto-derives from 0.62 aspect ratio). */
  w?: number;
  /** Stroke color (defaults to ink). */
  color?: string;
  /** Stroke width. */
  stroke?: number;
  /** Fill color (defaults to 'none' = outline only). */
  fill?: string;
  style?: StyleProp<ViewStyle>;
}

export function Cloud({
  w = 120,
  color = colors.text,
  stroke = 3.4,
  fill = 'none',
  style,
}: CloudProps) {
  const h = w * 0.62;
  return (
    <Svg width={w} height={h} viewBox="0 0 120 74" fill={fill} style={style}>
      <Path
        d="M28 64c-13 0-22-9-22-20 0-9 6-16 15-19-1-12 8-21 20-21 9 0 16 5 19 13 3-2 7-3 11-3 11 0 19 8 19 18 9 1 17 7 17 17 0 11-9 18-21 18H28z"
        stroke={color}
        strokeWidth={stroke}
        strokeLinejoin="round"
        fill={fill}
      />
    </Svg>
  );
}
