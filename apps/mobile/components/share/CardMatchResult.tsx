// components/share/CardMatchResult.tsx — Plan 8 Share Cards.
//
// Instagram-story share card for a finished match result.
// White background design: "GAME, SET, MATCH." hero headline, player initials
// in circle avatars, big score, ELO delta pill, and branding footer.
//
// Fixed aspect: 1080×1920. Captured to PNG at full size via expo-view-shot.

import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
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

// Design constants
const LIME = '#8FD43B';
const PINK = '#F23D8B';
const COURT_BLUE = '#2270BC';
const INK = '#11150E';
const GREY = '#9A9A96';
const NEUTRAL_BORDER = '#C9C9C3';
const SURFACE = '#F4F4F0';

/** Return the first-letter initial of a name, uppercased. Safe for empty strings. */
function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.split(' ')[0][0].toUpperCase();
}

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
  const showDelta = !isVoid && eloDelta !== null;

  // --- Styling per role ---
  // WINNER: green border, dark initial, dark name, green ELO, initial size 88
  // LOSER:  pink border,  grey initial, grey name, grey ELO,  initial size 74
  // VOID:   grey border,  grey initial, grey name, grey ELO,  initial size 80, no pill

  const myIsWinner = isWin;
  const oppIsWinner = won === false; // opp wins when I lose

  function playerBorderColor(isWinner: boolean, isLoser: boolean): string {
    if (isVoid) return NEUTRAL_BORDER;
    if (isWinner) return LIME;
    return PINK; // loser
  }

  function playerInitialColor(isWinner: boolean): string {
    if (isVoid) return '#B6B6B0';
    if (isWinner) return INK;
    return '#B6B6B0';
  }

  function playerNameColor(isWinner: boolean): string {
    if (isVoid) return GREY;
    if (isWinner) return INK;
    return GREY;
  }

  function playerEloColor(isWinner: boolean): string {
    if (isVoid) return '#C2C2BC';
    if (isWinner) return '#5FA61E';
    return '#C2C2BC';
  }

  function playerInitialSize(isWinner: boolean): number {
    if (isVoid) return 80;
    if (isWinner) return 88;
    return 74;
  }

  const myBorder = playerBorderColor(myIsWinner, !myIsWinner);
  const oppBorder = playerBorderColor(oppIsWinner, !oppIsWinner);
  const myInitialColor = playerInitialColor(myIsWinner);
  const oppInitialColor = playerInitialColor(oppIsWinner);
  const myNameColor = playerNameColor(myIsWinner);
  const oppNameColor = playerNameColor(oppIsWinner);
  const myEloColor = playerEloColor(myIsWinner);
  const oppEloColor = playerEloColor(oppIsWinner);
  const myInitialSize = playerInitialSize(myIsWinner);
  const oppInitialSize = playerInitialSize(oppIsWinner);

  // ELO pill
  const pillBg = isWin ? LIME : '#FCE6E4';
  const pillColor = isWin ? '#FFFFFF' : PINK;
  const pillText =
    isWin
      ? `▲ +${eloDelta} ELO`
      : `▼ ${eloDelta} ELO`; // eloDelta already negative for losses

  return (
    <View
      style={{
        width: DESIGN_W,
        height: DESIGN_H,
        backgroundColor: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── "SIRALAMA MAÇI" pill at top ── */}
      <View
        style={{
          position: 'absolute',
          top: 130,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 18,
          }}
        >
          {/* Green dot */}
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: LIME,
            }}
          />
          <Text
            style={{
              fontFamily: 'PlusJakartaSans-Bold',
              fontSize: 30,
              fontWeight: '700',
              letterSpacing: 6.6, // 0.22em @ 30px
              color: GREY,
            }}
          >
            SIRALAMA MAÇI
          </Text>
        </View>
      </View>

      {/* ── Hero headline: GAME, SET, MATCH. ── */}
      <View
        style={{
          position: 'absolute',
          top: 280,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'SpaceGrotesk-ExtraBold',
            fontSize: 184,
            lineHeight: 177, // 184 * 0.96
            color: INK,
            letterSpacing: -7.4, // -0.04em @ 184px
            textAlign: 'center',
          }}
        >
          {'GAME'}
          <Text style={{ color: LIME }}>{','}</Text>
          {'\n'}
          {'SET'}
          <Text style={{ color: COURT_BLUE }}>{','}</Text>
          {'\n'}
          {'MATCH'}
          <Text style={{ color: PINK }}>{'.'}</Text>
        </Text>
      </View>

      {/* ── Players row ── */}
      <View
        style={{
          position: 'absolute',
          top: 880,
          left: 0,
          right: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 60,
        }}
      >
        {/* Left player: Me */}
        <View style={{ alignItems: 'center', gap: 20 }}>
          {/* Avatar circle */}
          <View
            style={{
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: SURFACE,
              borderWidth: 9,
              borderColor: myBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'SpaceGrotesk-ExtraBold',
                fontSize: myInitialSize,
                color: myInitialColor,
              }}
            >
              {initial(myName)}
            </Text>
          </View>
          {/* Name + ELO */}
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans-Bold',
                fontSize: 40,
                fontWeight: '700',
                color: myNameColor,
              }}
            >
              {myName.trim().split(' ')[0] || myName}
            </Text>
            {myElo != null && (
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans-Bold',
                  fontSize: 26,
                  fontWeight: '700',
                  color: myEloColor,
                }}
              >
                {myElo} ELO
              </Text>
            )}
          </View>
        </View>

        {/* VS separator */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans-SemiBold',
            fontSize: 48,
            fontWeight: '600',
            color: NEUTRAL_BORDER,
            marginBottom: 64,
          }}
        >
          vs
        </Text>

        {/* Right player: Opponent */}
        <View style={{ alignItems: 'center', gap: 20 }}>
          {/* Avatar circle */}
          <View
            style={{
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: SURFACE,
              borderWidth: 9,
              borderColor: oppBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'SpaceGrotesk-ExtraBold',
                fontSize: oppInitialSize,
                color: oppInitialColor,
              }}
            >
              {initial(opponentName)}
            </Text>
          </View>
          {/* Name + ELO */}
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'PlusJakartaSans-Bold',
                fontSize: 40,
                fontWeight: '700',
                color: oppNameColor,
              }}
            >
              {opponentName.trim().split(' ')[0] || opponentName}
            </Text>
            {oppElo != null && (
              <Text
                style={{
                  fontFamily: 'PlusJakartaSans-Bold',
                  fontSize: 26,
                  fontWeight: '700',
                  color: oppEloColor,
                }}
              >
                {oppElo} ELO
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Big score ── */}
      <View
        style={{
          position: 'absolute',
          top: 1230,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: 'SpaceGrotesk-ExtraBold',
            fontSize: 280,
            lineHeight: 224, // 280 * 0.8
            color: INK,
            letterSpacing: -11.2, // -0.04em @ 280px
            textAlign: 'center',
          }}
        >
          {score}
        </Text>
      </View>

      {/* ── Bottom area: ELO pill + tagline + branding ── */}
      <View
        style={{
          position: 'absolute',
          bottom: 96,
          left: 0,
          right: 0,
          flexDirection: 'column',
          alignItems: 'center',
          gap: 42,
        }}
      >
        {/* ELO delta pill (only when not void and eloDelta !== null) */}
        {showDelta && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: pillBg,
              paddingHorizontal: 54,
              paddingVertical: 24,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontFamily: 'PlusJakartaSans-Bold',
                fontSize: 48,
                fontWeight: '700',
                color: pillColor,
              }}
            >
              {pillText}
            </Text>
          </View>
        )}

        {/* "Sıradaki kim?" tagline */}
        <Text
          style={{
            fontFamily: 'PlusJakartaSans-Bold',
            fontSize: 38,
            fontWeight: '700',
            color: GREY,
          }}
        >
          Sıradaki kim?
        </Text>

        {/* Branding: tennis ball + app name */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 18,
          }}
        >
          {/* Tennis ball SVG exactly matching the design */}
          <Svg width={52} height={52} viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={46} fill={LIME} />
            <Path
              d="M28 16 C46 38 46 62 28 84"
              fill="none"
              stroke={INK}
              strokeWidth={6.5}
              strokeLinecap="round"
            />
            <Path
              d="M72 16 C54 38 54 62 72 84"
              fill="none"
              stroke={INK}
              strokeWidth={6.5}
              strokeLinecap="round"
            />
          </Svg>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans-ExtraBold',
              fontSize: 32,
              fontWeight: '800',
              color: INK,
            }}
          >
            ChallengeBu!
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared card footer (ChallengeBu! branding)
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
          ChallengeBu!
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
