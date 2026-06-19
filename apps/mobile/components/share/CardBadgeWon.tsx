// components/share/CardBadgeWon.tsx — Plan 8 Share Cards.
//
// Instagram-story share card for a badge earned.
// Ported from docs/superpowers/specs/plan-8-design-bundle/project/Share Cards.html
// `function CardBadgeWon()`.
//
// Fixed aspect: 1080×1920 rendered at device width (scaled down in ShareSheet).
// Background: lime. Big medallion with badge emoji/icon, badge name, subtitle.

import { Text, View } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { BadgeArt } from '../ui/BadgeArt';
import { colors } from '../../theme/colors';
import { CardFooter } from './CardMatchResult';

export interface CardBadgeWonProps {
  name: string;
  badgeLabel: string;
  /** Emoji character or short string to render inside the medallion (fallback) */
  badgeEmoji: string;
  /** DB badge code — renders the designed vector badge when available */
  badgeCode?: string;
  /** Optional subtitle, e.g. "5'te 5. Durduran yok." */
  subtitle?: string;
}

const DESIGN_W = 1080;
const DESIGN_H = 1920;

export function CardBadgeWon({
  name,
  badgeLabel,
  badgeEmoji,
  badgeCode,
  subtitle,
}: CardBadgeWonProps) {
  return (
    <View
      style={{
        width: DESIGN_W,
        height: DESIGN_H,
        backgroundColor: colors.lime,
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
          gap: 52,
          position: 'relative',
        }}
      >
        {/* Eyebrow */}
        <Text
          style={{
            fontSize: 32,
            fontWeight: '800',
            letterSpacing: 7,
            color: colors.onLime,
            opacity: 0.75,
            fontFamily: 'PlusJakartaSans-ExtraBold',
          }}
        >
          ROZET DÜŞTÜ
        </Text>

        {/* Big medallion */}
        <View
          style={{
            width: 560,
            height: 560,
            position: 'relative',
          }}
        >
          {/* Outer ring */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 280,
              backgroundColor: '#fff',
              borderWidth: 10,
              borderColor: colors.borderStrong,
            }}
          />
          {/* Inner circle with clay-softer bg and badge emoji */}
          <View
            style={{
              position: 'absolute',
              top: 56,
              left: 56,
              right: 56,
              bottom: 56,
              borderRadius: 224,
              backgroundColor: colors.claySofter,
              borderWidth: 6,
              borderColor: colors.borderStrong,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {badgeCode ? (
              <BadgeArt code={badgeCode} size={380} fallback={badgeEmoji} />
            ) : (
              <Text
                style={{ fontSize: 220, lineHeight: 240, textAlign: 'center' }}
              >
                {badgeEmoji}
              </Text>
            )}
          </View>
        </View>

        {/* Badge name */}
        <Text
          style={{
            fontWeight: '800',
            fontSize: 120,
            letterSpacing: -2.4,
            color: colors.onLime,
            lineHeight: 120,
            textAlign: 'center',
            fontFamily: 'BricolageGrotesque-ExtraBold',
          }}
        >
          {badgeLabel}
        </Text>

        {/* Subtitle */}
        {subtitle ? (
          <Text
            style={{
              fontSize: 40,
              fontWeight: '700',
              color: colors.onLime,
              opacity: 0.8,
              textAlign: 'center',
              maxWidth: 760,
              lineHeight: 56,
              fontFamily: 'PlusJakartaSans-Bold',
            }}
          >
            {subtitle}
          </Text>
        ) : null}

        {/* Player pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 22,
            backgroundColor: '#fff',
            borderWidth: 6,
            borderColor: colors.borderStrong,
            borderRadius: 999,
            paddingHorizontal: 52,
            paddingVertical: 22,
          }}
        >
          <Avatar name={name} size={88} />
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
        </View>
      </View>

      {/* Footer */}
      <CardFooter onLime />
    </View>
  );
}
