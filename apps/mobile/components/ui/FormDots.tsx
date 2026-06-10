// FormDots — Plan 8 Phase C9.
//
// Row of green/red dots representing a player's last N match results
// (W = win-green, L = loss-red). Compact form indicator used in
// leaderboards, head-to-head cards, and the profile recent-form strip.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function FormDots({ form, size, gap })` — the design uses a 1.5px ink
// border on the *last* dot to highlight the most recent result. We drop
// that border here for the first port (it competes with the dense
// surrounding chrome on mobile); reintroduce it if QA flags the regression.

import { View } from 'react-native';
import { colors } from '../../theme/colors';

export interface FormDotsProps {
  /** Last N results, oldest → newest. */
  form: ('W' | 'L')[];
  /** Dot diameter. Default 9. */
  size?: number;
  /** Pixels between dots. Default 3. */
  gap?: number;
}

export function FormDots({ form, size = 9, gap = 3 }: FormDotsProps) {
  return (
    <View className="flex-row" style={{ gap }}>
      {form.map((r, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: r === 'W' ? colors.win : colors.loss,
          }}
        />
      ))}
    </View>
  );
}
