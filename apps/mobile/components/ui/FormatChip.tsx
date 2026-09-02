// FormatChip — Plan 8 Phase C9.
//
// Small colored pill identifying the match format (Klasik / Hızlı
// Tiebreak / Pro Set 8 / 3 Set Klasik). Glyph + text adopt the format brand
// color; background is the same color tinted ~13% so the chip pops without
// drowning out the surrounding row.
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// `function FormatChip({ fmtKey, ... })` — the design uses
// `color-mix(in srgb, color 12%, transparent)` for the tint, which we
// approximate by appending `22` (≈13.3% alpha) to the 6-digit hex.
//
// Consumers: match preview, match cards, leaderboard format filter, ELO
// history rows, season + tournament screens.

import { Text, View } from 'react-native';
import { FORMATS, type FormatKey } from '../../lib/formats';
import { Icon } from './Icon';

export interface FormatChipProps {
  fmtKey: FormatKey;
  /** Font size for the label. Default 11. Glyph rendered at `size + 2`. */
  size?: number;
}

export function FormatChip({ fmtKey, size = 11 }: FormatChipProps) {
  const fmt = FORMATS.find((f) => f.key === fmtKey)!;
  return (
    <View
      className="flex-row items-center gap-1 rounded-pill"
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        // 6-digit hex + "22" alpha ≈ 13% — matches the design's
        // color-mix(in srgb, fmt.color 12%, transparent) tint.
        backgroundColor: `${fmt.color}22`,
      }}
    >
      <Icon name={fmt.mark} size={size + 2} color={fmt.color} />
      <Text
        className="font-sans font-bold"
        style={{ fontSize: size, color: fmt.color }}
      >
        {fmt.name}
      </Text>
    </View>
  );
}
