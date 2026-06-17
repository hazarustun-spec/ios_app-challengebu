// components/share/CardMatchResult.tsx — Plan 8 Share Cards.
//
// Instagram-story share card for a finished match result.
// Ported from docs/superpowers/specs/plan-8-design-bundle/project/Share Cards.html
// `function CardMatchResult()`.
//
// Fixed aspect: 1080×1920 rendered at device width (scaled down).
// Background: court blue. Court-line decorative elements in white opacity.
// Big score number, player avatars with ELO, win/loss ELO delta pill.

import { Text, View } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { BallMark } from '../ui/doodles/BallMark';
import { colors } from '../../theme/colors';

export interface CardMatchResultProps {
  myName: string;
  opponentName: string;
  myScore: number;
  oppScore: number;
  /** true = win, false = loss, null = void */
  won: boolean | null;
  /** ELO delta for my side (positive = gain, negative = loss) */
  eloDelta: number | null;
  /** My ELO before the match */
  myElo?: number | null;
  /** Opponent's ELO before the match */
  oppElo?: number | null;
}

// The card is designed at 1080×1920. We scale it down to a fixed render width
// so it fits on-screen in the ShareSheet preview while remaining high-fidelity
// when captured at full size.
const DESIGN_W = 1080;
const DESIGN_H = 1920;

export function CardMatchResult({
  myName,
  opponentName,
  myScore,
  oppScore,
  won,
  eloDelta,
  myElo,
  oppElo,
}: CardMatchResultProps) {
  const isVoid = won === null;
  const isWin = won === true;

  const score = `${myScore}–${oppScore}`;
  const deltaDisplay = eloDelta ?? 0;
  const showDelta = !isVoid && eloDelta !== null;

  return (
    <View
      style={{
        width: DESIGN_W,
        height: DESIGN_H,
        backgroundColor: colors.court,
        flexDirection: 'column',
        padding: 88,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Court-line decorative border */}
      <View
        style={{
          position: 'absolute',
          top: 64,
          left: 64,
          right: 64,
          bottom: 64,
          borderWidth: 5,
          borderColor: 'rgba(255,255,255,0.22)',
          borderRadius: 16,
        }}
        pointerEvents="none"
      />
      {/* Dashed net line */}
      <View
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          top: '50%',
          borderTopWidth: 6,
          borderColor: 'rgba(255,255,255,0.16)',
          borderStyle: 'dashed',
        }}
        pointerEvents="none"
      />

      {/* Main content */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48,
        }}
      >
        {/* Match type pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 18,
            backgroundColor: 'rgba(255,255,255,0.14)',
            borderWidth: 4,
            borderColor: 'rgba(255,255,255,0.5)',
            paddingHorizontal: 44,
            paddingVertical: 18,
            borderRadius: 999,
          }}
        >
          <Icon name="trophy" size={44} color={colors.lime} />
          <Text
            style={{
              fontSize: 32,
              fontWeight: '800',
              letterSpacing: 6,
              color: '#fff',
              fontFamily: 'PlusJakartaSans-ExtraBold',
            }}
          >
            SIRALAMA MAÇI
          </Text>
        </View>

        {/* Hero tagline */}
        <Text
          style={{
            fontWeight: '800',
            fontSize: 150,
            letterSpacing: -4.5,
            color: '#fff',
            lineHeight: 143,
            textAlign: 'center',
            fontFamily: 'BricolageGrotesque-ExtraBold',
          }}
        >
          {isWin ? 'KORT BENİM.' : isVoid ? 'BERABERE.' : 'İYİ OYUN.'}
        </Text>

        {/* Players row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 72,
            marginTop: 24,
          }}
        >
          {/* Me */}
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                borderWidth: 8,
                borderColor: colors.lime,
                borderRadius: 999,
                padding: 8,
              }}
            >
              <Avatar name={myName} size={240} />
            </View>
            <Text
              style={{
                fontSize: 42,
                fontWeight: '800',
                color: '#fff',
                marginTop: 26,
                fontFamily: 'PlusJakartaSans-ExtraBold',
              }}
            >
              {myName.split(' ')[0]}
            </Text>
            {myElo != null && (
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: '700',
                  color: colors.lime,
                  marginTop: 6,
                  fontFamily: 'SpaceGrotesk-Bold',
                }}
              >
                {myElo} ELO
              </Text>
            )}
          </View>

          {/* VS */}
          <Text
            style={{
              fontSize: 64,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.55)',
              fontFamily: 'SpaceGrotesk-Bold',
            }}
          >
            VS
          </Text>

          {/* Opponent */}
          <View style={{ alignItems: 'center', opacity: 0.82 }}>
            <View
              style={{
                borderWidth: 8,
                borderColor: 'rgba(255,255,255,0.4)',
                borderRadius: 999,
                padding: 8,
              }}
            >
              <Avatar name={opponentName} size={240} />
            </View>
            <Text
              style={{
                fontSize: 42,
                fontWeight: '800',
                color: '#fff',
                marginTop: 26,
                fontFamily: 'PlusJakartaSans-ExtraBold',
              }}
            >
              {opponentName.split(' ')[0]}
            </Text>
            {oppElo != null && (
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 6,
                  fontFamily: 'SpaceGrotesk-Bold',
                }}
              >
                {oppElo} ELO
              </Text>
            )}
          </View>
        </View>

        {/* Big score */}
        <Text
          style={{
            fontWeight: '800',
            fontSize: 280,
            lineHeight: 280,
            color: '#fff',
            letterSpacing: -11.2,
            fontFamily: 'SpaceGrotesk-Bold',
          }}
        >
          {score}
        </Text>

        {/* ELO delta pill */}
        {showDelta && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              backgroundColor: isWin ? colors.lime : '#FCE6E4',
              borderWidth: 5,
              borderColor: colors.borderStrong,
              borderRadius: 999,
              paddingHorizontal: 56,
              paddingVertical: 20,
            }}
          >
            <Icon
              name={isWin ? 'chevU' : 'chevD'}
              size={52}
              color={isWin ? colors.onLime : colors.loss}
              stroke={3}
            />
            <Text
              style={{
                fontWeight: '800',
                fontSize: 56,
                color: isWin ? colors.onLime : colors.loss,
                fontFamily: 'SpaceGrotesk-Bold',
              }}
            >
              {deltaDisplay > 0 ? '+' : ''}
              {deltaDisplay} ELO
            </Text>
          </View>
        )}

        <Text
          style={{
            fontSize: 52,
            fontWeight: '800',
            color: 'rgba(255,255,255,0.92)',
            letterSpacing: -0.5,
            fontFamily: 'BricolageGrotesque-ExtraBold',
          }}
        >
          Sıradaki kim?
        </Text>
      </View>

      {/* Footer */}
      <CardFooter light />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared card footer (Tennis Challenger branding)
// ---------------------------------------------------------------------------

function CardFooter({
  light,
  onLime,
}: {
  light?: boolean;
  onLime?: boolean;
}) {
  const c = light ? '#fff' : colors.text;
  const sub = light
    ? 'rgba(255,255,255,0.62)'
    : onLime
      ? 'rgba(22,22,24,0.55)'
      : colors.text3;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
      }}
    >
      <BallMark
        size={64}
        sw={4}
        stroke={light ? '#fff' : colors.text}
        color={light ? '#fff' : colors.lime}
      />
      <View style={{ alignItems: 'flex-start' }}>
        <Text
          style={{
            fontWeight: '800',
            fontSize: 44,
            letterSpacing: -0.44,
            color: c,
            lineHeight: 44,
            fontFamily: 'BricolageGrotesque-ExtraBold',
          }}
        >
          Tennis Challenger
        </Text>
        <Text
          style={{
            fontSize: 24,
            fontWeight: '700',
            letterSpacing: 3.4,
            color: sub,
            marginTop: 8,
            fontFamily: 'PlusJakartaSans-Bold',
          }}
        >
          BOĞAZİÇİ ÜNİVERSİTESİ
        </Text>
      </View>
    </View>
  );
}

// Export for reuse in other card files
export { CardFooter };
