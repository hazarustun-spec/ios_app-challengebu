// EloChip — Plan 8 Phase C9.
//
// Small pill showing a player's ELO + recent delta (e.g., `1612 ↑22` /
// `1487 ↓14`). The delta arrow + number adopt the semantic win/loss color so
// the chip reads as a single glance even when surrounded by other chips.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// — the design renders this inline as a `<span>` with the SpaceGrotesk
// numeric font; here we ship a React Native View+Text pair styled via the
// shared NativeWind tokens (rounded-pill border-base border-border-strong
// bg-surface) plus inline color + padding for fine control.
//
// Consumers: leaderboard rows, profile header, match cards, ELO history.

import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { Icon } from './Icon';

export interface EloChipProps {
  /** Current ELO rating (whole integer). */
  elo: number;
  /** Signed change since the last match — positive renders win-green ↑, negative renders loss-red ↓. */
  delta: number;
}

export function EloChip({ elo, delta }: EloChipProps) {
  const up = delta >= 0;
  const deltaColor = up ? colors.win : colors.loss;
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-pill border-base border-border-strong bg-surface"
      style={{ paddingHorizontal: 12, paddingVertical: 4 }}
    >
      <Text
        className="font-num font-extrabold"
        style={{ fontSize: 16, color: colors.text }}
      >
        {elo}
      </Text>
      <View className="flex-row items-center" style={{ gap: 1 }}>
        <Icon
          name={up ? 'chevU' : 'chevD'}
          size={13}
          color={deltaColor}
          stroke={3}
        />
        <Text
          className="font-num font-bold"
          style={{ fontSize: 12.5, color: deltaColor }}
        >
          {Math.abs(delta)}
        </Text>
      </View>
    </View>
  );
}
