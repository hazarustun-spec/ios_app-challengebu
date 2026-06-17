// components/share/CardEloProgress.tsx — Plan 8 Share Cards.
//
// Instagram-story share card for ELO progress.
// Ported from docs/superpowers/specs/plan-8-design-bundle/project/Share Cards.html
// `function CardEloProgress()`.
//
// Fixed aspect: 1080×1920 rendered at device width (scaled down in ShareSheet).
// Background: white (var(--bg)). Big current ELO number + sparkline chart panel.

import { Text, View } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Sparkline } from '../ui/Sparkline';
import { colors } from '../../theme/colors';
import { CardFooter } from './CardMatchResult';

export interface CardEloProgressProps {
  name: string;
  currentElo: number;
  /** Level name, e.g. "Rekabetçi" */
  levelName: string;
  /** Category label, e.g. "Erkek Tek" */
  categoryLabel?: string;
  /** Rank in this category, e.g. 4 */
  rank?: number;
  /** Chronological ELO values for Sparkline (oldest first) */
  trend: number[];
  /** Total ELO gain label e.g. "+38" or "-12" */
  gainLabel?: string;
  /** Number of rated matches */
  matchCount?: number;
  /** Number of wins */
  winCount?: number;
  /** Win rate percentage 0-100 */
  winPct?: number;
}

const DESIGN_W = 1080;
const DESIGN_H = 1920;

const DAY_LABELS = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];

export function CardEloProgress({
  name,
  currentElo,
  levelName,
  categoryLabel = 'Erkek Tek',
  rank,
  trend,
  gainLabel,
  matchCount,
  winCount,
  winPct,
}: CardEloProgressProps) {
  // Compute gain from trend if not supplied
  const computedGain =
    gainLabel ??
    (trend.length > 1
      ? (() => {
          const diff = (trend[trend.length - 1] ?? 0) - (trend[0] ?? 0);
          return diff >= 0 ? `+${diff}` : `${diff}`;
        })()
      : null);

  const isPositive = computedGain ? !computedGain.startsWith('-') : true;

  const stats: Array<[string, string]> = [
    [String(matchCount ?? trend.length), 'MAÇ'],
    [String(winCount ?? '—'), 'GALİBİYET'],
    [winPct != null ? `%${winPct}` : '—', 'ORAN'],
  ];

  return (
    <View
      style={{
        width: DESIGN_W,
        height: DESIGN_H,
        backgroundColor: colors.bg,
        flexDirection: 'column',
        padding: 88,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 44,
        }}
      >
        {/* Player identity row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Avatar name={name} size={120} />
          <View style={{ alignItems: 'flex-start' }}>
            <Text
              style={{
                fontSize: 44,
                fontWeight: '800',
                color: colors.text,
                fontFamily: 'PlusJakartaSans-ExtraBold',
              }}
            >
              {name}
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: colors.text3,
                marginTop: 4,
                fontFamily: 'PlusJakartaSans-Bold',
              }}
            >
              {categoryLabel}
              {rank != null ? ` · #${rank}` : ''}
              {levelName ? ` · ${levelName}` : ''}
            </Text>
          </View>
        </View>

        {/* Tagline */}
        <Text
          style={{
            fontSize: 30,
            fontWeight: '800',
            letterSpacing: 6,
            color: colors.text3,
            fontFamily: 'PlusJakartaSans-ExtraBold',
          }}
        >
          GRAFİK YALAN SÖYLEMEZ
        </Text>

        {/* Big ELO + gain */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 28 }}>
          <Text
            style={{
              fontWeight: '800',
              fontSize: 240,
              lineHeight: 216,
              letterSpacing: -9.6,
              color: colors.text,
              fontFamily: 'SpaceGrotesk-Bold',
            }}
          >
            {currentElo}
          </Text>
          {computedGain != null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 18,
              }}
            >
              <Icon
                name={isPositive ? 'chevU' : 'chevD'}
                size={56}
                color={isPositive ? colors.win : colors.loss}
                stroke={3}
              />
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 64,
                  color: isPositive ? colors.win : colors.loss,
                  fontFamily: 'SpaceGrotesk-Bold',
                }}
              >
                {computedGain.replace(/^[+-]/, '')}
              </Text>
            </View>
          )}
        </View>

        {/* Chart panel */}
        <View
          style={{
            width: '100%',
            backgroundColor: colors.surface,
            borderWidth: 5,
            borderColor: colors.borderStrong,
            borderRadius: 40,
            paddingTop: 64,
            paddingHorizontal: 56,
            paddingBottom: 48,
          }}
        >
          <Sparkline
            data={trend.length >= 2 ? trend : [currentElo, currentElo]}
            color={colors.court}
            w={904}
            h={260}
            stroke={9}
          />
          {/* Day labels */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 28,
            }}
          >
            {DAY_LABELS.map((d) => (
              <Text
                key={d}
                style={{
                  fontSize: 26,
                  fontWeight: '700',
                  color: colors.text3,
                  fontFamily: 'SpaceGrotesk-Bold',
                }}
              >
                {d}
              </Text>
            ))}
          </View>
        </View>

        {/* Stat pills */}
        <View style={{ flexDirection: 'row', gap: 24 }}>
          {stats.map(([v, l]) => (
            <View
              key={l}
              style={{
                alignItems: 'center',
                backgroundColor: colors.limeSoft,
                borderWidth: 5,
                borderColor: colors.borderStrong,
                borderRadius: 32,
                paddingHorizontal: 52,
                paddingVertical: 30,
              }}
            >
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 72,
                  lineHeight: 72,
                  color: colors.text,
                  fontFamily: 'SpaceGrotesk-Bold',
                }}
              >
                {v}
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '800',
                  letterSpacing: 2.4,
                  color: colors.text2,
                  marginTop: 10,
                  fontFamily: 'PlusJakartaSans-ExtraBold',
                }}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <CardFooter />
    </View>
  );
}
