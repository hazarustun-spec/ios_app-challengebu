// MatchCard — Plan 8 Phase C10.
//
// Match status card used in the matches list + anasayfa "active matches"
// strip. The card has three variants reflecting the match lifecycle:
//
//   - planned  → a match has been scheduled (blue header pip + soft blue bg)
//   - pending  → match is over, awaiting score entry (warn-yellow header)
//   - done     → match has a recorded result (lime header + win/loss row)
//
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx
// — the source assembles this pattern inline inside the matches list screen.
// We extract it here so the three-variant contract stays consistent across
// the home + matches surfaces.
//
// Composition:
//   - Avatar (×2)   — player vs opponent
//   - FormatChip    — match format (top-right of the colored header)
//   - EloChip       — opponent ELO + delta (done variant only)
//   - Button        — call-to-action (planned/pending variants)
//
// Notes:
//   - The header has a 1.5px ink hairline along its bottom edge so the colored
//     band reads as a separate section even when paired with the surface body
//     (matches the design bundle's ink-border depth model).
//   - The "Sen vs <opponent>" copy is hard-coded in Turkish per the project
//     locale — the user is always the left avatar.

import { Text, View } from 'react-native';
import type { FormatKey } from '../../lib/formats';
import { colors } from '../../theme/colors';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { EloChip } from './EloChip';
import { FormatChip } from './FormatChip';

export type MatchKind = 'planned' | 'pending' | 'done';

export interface MatchCardProps {
  kind: MatchKind;
  /** Opponent display name (right-side avatar + header line). */
  opponentName: string;
  /** Opponent ELO. Used by the EloChip in the `done` variant. */
  opponentElo?: number;
  /** Free-form when/where label (e.g., "Bugün 18:30 · Kort 1"). */
  whenLabel: string;
  /** Format key — drives the FormatChip in the colored header. */
  format: FormatKey;
  /** Done variant: did the user win? */
  win?: boolean;
  /** Done variant: scoreline (e.g., "4-2"). */
  score?: string;
  /** Done variant: signed ELO delta surfaced via EloChip. */
  eloDelta?: number;
  /** Planned/pending variant: CTA button label. */
  ctaLabel?: string;
  /** Planned/pending variant: CTA press handler. */
  onCtaPress?: () => void;
}

const STATUS_MAP: Record<
  MatchKind,
  { label: string; color: string; bgClass: string }
> = {
  planned: { label: 'Planlı', color: colors.court, bgClass: 'bg-blue-soft' },
  pending: { label: 'Skor bekliyor', color: colors.warn, bgClass: 'bg-warn-soft' },
  done: { label: 'Tamamlandı', color: colors.win, bgClass: 'bg-lime-soft' },
};

export function MatchCard({
  kind,
  opponentName,
  opponentElo,
  whenLabel,
  format,
  win,
  score,
  eloDelta,
  ctaLabel,
  onCtaPress,
}: MatchCardProps) {
  const status = STATUS_MAP[kind];
  return (
    <View className="rounded-lg overflow-hidden border-base border-border-strong bg-surface">
      <View
        className={[
          'flex-row items-center justify-between px-4 py-2.5',
          status.bgClass,
        ].join(' ')}
        style={{ borderBottomWidth: 1.5, borderColor: colors.borderStrong }}
      >
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: status.color,
            }}
          />
          <Text
            className="font-sans font-extrabold"
            style={{ fontSize: 11.5, color: status.color }}
          >
            {status.label}
          </Text>
        </View>
        <FormatChip fmtKey={format} size={11} />
      </View>

      <View className="p-4">
        <View className="flex-row items-center" style={{ gap: 11 }}>
          <Avatar name="Sen" size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 14, color: colors.text }}
              numberOfLines={1}
            >
              Sen{' '}
              <Text style={{ color: colors.text3, fontWeight: '600' }}>vs</Text>{' '}
              {opponentName}
            </Text>
            <Text
              className="font-sans font-semibold"
              style={{ fontSize: 12, color: colors.text3, marginTop: 2 }}
              numberOfLines={1}
            >
              {whenLabel}
            </Text>
          </View>
          <Avatar name={opponentName} size={40} />
        </View>

        {kind === 'done' ? (
          <View
            className="flex-row items-center justify-between"
            style={{
              marginTop: 13,
              paddingTop: 13,
              borderTopWidth: 1,
              borderColor: colors.surface3,
            }}
          >
            <Text
              className="font-sans font-extrabold"
              style={{
                fontSize: 13,
                color: win ? colors.win : colors.loss,
              }}
            >
              {win ? 'Kazandın' : 'Kaybettin'}
            </Text>
            <Text
              className="font-num font-extrabold"
              style={{ fontSize: 22, color: colors.text }}
            >
              {score}
            </Text>
            {opponentElo !== undefined && eloDelta !== undefined && (
              <EloChip elo={opponentElo} delta={eloDelta} />
            )}
          </View>
        ) : (
          ctaLabel && (
            <View style={{ marginTop: 13 }}>
              <Button
                size="sm"
                variant={kind === 'pending' ? 'primary' : 'secondary'}
                onPress={onCtaPress}
                full
              >
                {ctaLabel}
              </Button>
            </View>
          )
        )}
      </View>
    </View>
  );
}
