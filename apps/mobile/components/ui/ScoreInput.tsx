// ScoreInput primitive — Plan 8 Phase C (final batch).
//
// The "Sana sayı" / "Berk sayı" tappable score buttons on the live match
// screen (see
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens/active_match.jsx
// — the pair of large `<button>` cards). Each rendered as an 84px-tall
// surface card with a 1.5px ink border, a big `+` glyph, and the
// player's label. `tint` lets the home/opp buttons pick a side-specific
// accent for the `+` glyph (court blue for me, ink for the opponent).

import { Pressable, Text } from 'react-native';

import { colors } from '../../theme/colors';
import { Icon } from './Icon';

export interface ScoreInputProps {
  /** Visible label, e.g., "Sana sayı". */
  label: string;
  /** Accent color for the `+` glyph. Defaults to `colors.text`. */
  tint?: string;
  /** Tap handler. Ignored when `disabled`. */
  onPress: () => void;
  /** Disables press + dims to 50% opacity. Defaults to false. */
  disabled?: boolean;
}

export function ScoreInput({ label, tint, onPress, disabled }: ScoreInputProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      className={[
        'items-center justify-center rounded-lg border-base border-border-strong bg-surface',
        'active:opacity-80',
        disabled ? 'opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ flex: 1, height: 84, gap: 5 }}
    >
      <Icon name="plus" size={27} color={tint ?? colors.text} stroke={2.6} />
      <Text
        className="font-sans font-extrabold"
        style={{ fontSize: 13.5, color: colors.text }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
