// PlayerChip — Plan 8 Phase C10.
//
// Outline pill showing an avatar + name + ELO, with an optional second-line
// subtitle (e.g., "Amatör · 2. sınıf"). Used in:
//   - match-opponent picker rows
//   - application / wait-list lists
//   - inline player references in season + tournament screens
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// — there is no single named `PlayerChip` helper in the source bundle; the
// screens compose this pattern repeatedly with the same hand-tuned padding
// values. We extract those values here so screens stop re-typing them.
//
// Composition: leans on the existing `Avatar` primitive (C8) so the
// deterministic palette stays consistent across surfaces.

import { Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { Avatar } from './Avatar';

export interface PlayerChipProps {
  /** Display name — rendered + handed to Avatar for initials/palette. */
  name: string;
  /** Current ELO rating (integer). */
  elo: number;
  /** Optional secondary line (e.g., "Amatör · 2. sınıf"). */
  sub?: string;
  /** Optional avatar photo URL. */
  avatarUri?: string;
}

export function PlayerChip({ name, elo, sub, avatarUri }: PlayerChipProps) {
  return (
    <View
      className="flex-row items-center rounded-pill border-base border-border-strong bg-surface"
      style={{
        paddingLeft: 6,
        paddingRight: 14,
        paddingVertical: 6,
        gap: 10,
      }}
    >
      <Avatar name={name} size={32} uri={avatarUri} />
      <View style={{ minWidth: 0, flexShrink: 1 }}>
        <Text
          className="font-sans font-bold"
          style={{ fontSize: 13.5, lineHeight: 13.5, color: colors.text }}
          numberOfLines={1}
        >
          {name}
        </Text>
        {sub && (
          <Text
            className="font-sans font-semibold"
            style={{ fontSize: 11, color: colors.text3, marginTop: 3 }}
            numberOfLines={1}
          >
            {sub}
          </Text>
        )}
      </View>
      <Text
        className="font-num font-extrabold"
        style={{ fontSize: 14, color: colors.text, marginLeft: 4 }}
      >
        {elo}
      </Text>
    </View>
  );
}
