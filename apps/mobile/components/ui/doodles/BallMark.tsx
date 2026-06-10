// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/doodles.jsx :: BallMark
// Tennis ball mark — clean, bold outline style (lime fill, ink seam lines).
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../../../theme/colors';

interface BallMarkProps {
  size?: number;
  /** Ball fill color (defaults to lime). */
  color?: string;
  /** Seam + outline stroke color (defaults to ink). */
  stroke?: string;
  /** Stroke width. */
  sw?: number;
}

export function BallMark({
  size = 88,
  color = colors.lime,
  stroke = colors.text,
  sw = 3.2,
}: BallMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={46} fill={color} stroke={stroke} strokeWidth={sw} />
      <Path
        d="M16 18 C40 36, 40 64, 16 82"
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <Path
        d="M84 18 C60 36, 60 64, 84 82"
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </Svg>
  );
}
