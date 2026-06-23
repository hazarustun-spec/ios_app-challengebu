// apps/mobile/app/match/[id]/result.tsx — Plan 8 Phase E8, live-wired.
//
// Match summary screen. Renders the win/loss/void tag, the avatars +
// final score, and (for non-void matches) an ELO delta card with a
// CountUp animation interpolating from the player's ELO before the match
// to `rating_before + eloDelta`.
//
// Live data: useMatchDetail(id) → ActiveMatchRow; myPerspective() orients
// win/score/eloDelta toward the current user; useOpponentNames().resolve()
// provides the opponent display name from the roster.
//
// Route params: only `id` is consumed; the legacy win/score/voided/opp
// search params are no longer used — all values come from the match row.

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ScreenEnter } from '../../../components/ui/ScreenEnter';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { colors } from '../../../theme/colors';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { useConfirmMatch } from '../../../hooks/use-confirm-match';
import { useRealtimeChannel } from '../../../hooks/use-realtime-channel';
import { queryKeys } from '../../../lib/query-keys';
import { myPerspective } from '../../../lib/match-opponent';
import { useAuthStore } from '../../../stores/auth-store';
import { ShareSheet } from '../../../components/share/ShareSheet';
import { CardMatchResult } from '../../../components/share/CardMatchResult';
import { Confetti } from '../../../components/ui/Confetti';

// AnimatedTextInput: drives the ELO count-up at 60fps via reanimated.
// Must be defined OUTSIDE the component so createAnimatedComponent runs once.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// SpaceGrotesk-ExtraBold is the fontFamily behind the NativeWind `font-num` class.
const NUM_FONT_FAMILY = 'SpaceGrotesk-ExtraBold';

// Avatar size used in the score row (must match the JSX below).
const AVATAR_SIZE = 58;
// Glow circle is slightly larger than the avatar.
const GLOW_SIZE = AVATAR_SIZE + 28;

export default function MatchResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const profile = useAuthStore((s) => s.profile);
  const [shareVisible, setShareVisible] = useState(false);

  const matchQ = useMatchDetail(id);
  const opponentNames = useOpponentNames();
  const confirmMutation = useConfirmMatch();

  // Live-refresh when the opponent submits their score or confirms.
  useRealtimeChannel({
    channelName: id ? `match:result:${id}` : 'match:result:none',
    enabled: !!id,
    configs: [{ event: 'UPDATE', table: 'matches', filter: `id=eq.${id}` }],
    invalidateKeys: [queryKeys.activeMatches.detail(id ?? '')],
  });

  const match = matchQ.data ?? null;

  // Confirmation handshake state.
  const scoresSettled = match?.winner_team != null;
  const myConfirmed = !!(userId && match?.confirmed_by?.includes(userId));
  const isSettled = match?.status === 'confirmed' || match?.status === 'voided';

  // Derive perspective from live match data
  const perspective = match && userId ? myPerspective(match, userId) : null;
  const isWin = perspective?.won === true;
  const isVoid = match ? match.winner_team === 'void' : false;
  const myScore = perspective?.myScore ?? 0;
  const oppScore = perspective?.oppScore ?? 0;
  const finalScore = match ? `${myScore}-${oppScore}` : '—';

  // eloDelta from live data; null when not yet rated/confirmed
  const delta = perspective?.eloDelta ?? null;
  const deltaDisplay = isVoid ? 0 : (delta ?? 0);

  // rating_before for the current user's team — used as the CountUp start value
  const myTeamSide =
    match && userId
      ? match.team_a_player_ids.includes(userId)
        ? 'a'
        : match.team_b_player_ids.includes(userId)
          ? 'b'
          : 'a'
      : 'a';
  const ratingBefore =
    match
      ? myTeamSide === 'a'
        ? (match.rating_before_team_a ?? null)
        : (match.rating_before_team_b ?? null)
      : null;

  // Opponent name from roster
  const opponent = match ? opponentNames.resolve(match) : null;
  const opponentName = opponentNames.isLoading
    ? 'Rakip'
    : (opponent?.name ?? 'Rakip');

  // CountUp: reanimated TextInput drives ELO from startElo → targetElo over 900ms.
  const startElo = ratingBefore ?? 0;
  const targetElo = startElo + deltaDisplay;
  const counter = useSharedValue(startElo);

  useEffect(() => {
    counter.value = startElo;
    if (isVoid || deltaDisplay === 0 || startElo === 0) return;
    counter.value = withTiming(targetElo, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [startElo, targetElo, deltaDisplay, isVoid]);

  const animatedEloProps = useAnimatedProps(() => ({
    text: String(Math.round(counter.value)),
  } as any /* RN TextInput `text` prop driven by reanimated */));

  // (1) Success haptic on mount — win only
  useEffect(() => {
    if (isWin && !isVoid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    }
  }, []);

  // (3) Green glow halo — pulses 3× (~6 half-cycles) then rests
  const glow = useSharedValue(0);
  useEffect(() => {
    if (isWin && !isVoid) {
      glow.value = withRepeat(withTiming(1, { duration: 700 }), 6, true);
    }
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.45]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.22]) }],
  }));

  const tagColor = isVoid ? colors.warn : isWin ? colors.win : colors.loss;
  const tagBg = isVoid ? colors.warnSoft : isWin ? colors.limeSoft : '#FCE6E4';
  const tagText = isVoid
    ? 'Berabere (voided)'
    : isWin
      ? 'Kazandın!'
      : 'Kaybettin';
  const tagIcon: IconName = isVoid ? 'info' : isWin ? 'trophy' : 'x';
  const eloColor = isWin ? colors.win : colors.loss;

  // My name for the share card — prefer profile but fall back to "Sen"
  const myName = profile?.firstName ?? 'Sen';

  // Loading state
  if (matchQ.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader
          title="Maç Sonucu"
          close
          onBack={() => router.replace('/(tabs)/matches' as never)}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  // Error or missing match
  if (matchQ.isError || !match) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader
          title="Maç Sonucu"
          close
          onBack={() => router.replace('/(tabs)/matches' as never)}
        />
        <View className="flex-1 items-center justify-center" style={{ padding: 32 }}>
          <Text
            className="font-sans font-semibold text-text-3"
            style={{ fontSize: 14, textAlign: 'center' }}
          >
            Maç sonucu yüklenemedi.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScreenEnter className="flex-1 bg-bg">
      <NavHeader
        title="Maç Sonucu"
        close
        onBack={() => router.replace('/(tabs)/matches' as never)}
        actionIcon="share"
        onAction={() => setShareVisible(true)}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 16, paddingVertical: 12 }}>
          <View
            className="flex-row items-center rounded-pill"
            style={{
              paddingHorizontal: 16,
              paddingVertical: 7,
              gap: 6,
              backgroundColor: tagBg,
            }}
          >
            <Icon name={tagIcon} size={16} color={tagColor} stroke={2.5} />
            <Text
              className="font-sans font-extrabold"
              style={{ fontSize: 14, color: tagColor }}
            >
              {tagText}
            </Text>
          </View>

          <View
            className="flex-row items-center justify-center"
            style={{ gap: 16 }}
          >
            {/* Winner avatar with optional green glow halo */}
            <View style={styles.avatarContainer}>
              {isWin && !isVoid && (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.glowCircle, glowStyle]}
                />
              )}
              <Avatar
                name="Sen"
                size={AVATAR_SIZE}
                ring={isWin && !isVoid ? colors.win : undefined}
              />
            </View>

            <Text
              className="font-num font-extrabold text-text"
              style={{ fontSize: 40, letterSpacing: -1.2 }}
            >
              {finalScore}
            </Text>

            <Avatar
              name={opponentName}
              size={AVATAR_SIZE}
              ring={!isWin && !isVoid ? colors.win : undefined}
            />
          </View>
          <Text
            className="font-sans font-semibold text-text-3"
            style={{ fontSize: 13 }}
          >
            BÜ Klasik · Bugün
          </Text>
        </View>

        {!isVoid && delta !== null && (
          <View
            className="bg-surface rounded-lg"
            style={{ padding: 18, borderWidth: 1, borderColor: colors.borderStrong }}
          >
            <Text
              className="font-sans font-bold text-text-3"
              style={{ fontSize: 12.5 }}
            >
              Tahmini ELO değişimi
            </Text>
            <View
              className="flex-row items-center"
              style={{ marginTop: 10, gap: 14 }}
            >
              <Text
                className="font-num font-bold text-text-3"
                style={{ fontSize: 26 }}
              >
                {startElo}
              </Text>
              <Icon name="chevR" size={20} color={colors.text3} />
              {/* Reanimated TextInput count-up — same visual as the old <Text> */}
              <AnimatedTextInput
                editable={false}
                underlineColorAndroid="transparent"
                value={String(Math.round(startElo))}
                animatedProps={animatedEloProps}
                style={{
                  fontSize: 30,
                  lineHeight: 34,
                  color: eloColor,
                  fontFamily: NUM_FONT_FAMILY,
                  fontWeight: '800',
                  padding: 0,
                  margin: 0,
                  includeFontPadding: false,
                  textAlign: 'center',
                  minWidth: 60,
                }}
              />
              <View
                className="rounded-pill"
                style={{
                  marginLeft: 'auto',
                  paddingHorizontal: 11,
                  paddingVertical: 4,
                  backgroundColor: isWin ? colors.limeSoft : '#FCE6E4',
                }}
              >
                <Text
                  className="font-num font-extrabold"
                  style={{
                    fontSize: 17,
                    color: isWin ? colors.win : colors.loss,
                  }}
                >
                  {deltaDisplay > 0 ? '+' : ''}
                  {deltaDisplay}
                </Text>
              </View>
            </View>
            <Text
              className="font-sans text-text-3"
              style={{ fontSize: 12, marginTop: 12, lineHeight: 18 }}
            >
              Çarpan: {finalScore} → {isWin ? '1.1×' : '1.0×'}. Onaylandığında
              kesinleşir.
            </Text>
          </View>
        )}

        {isVoid && (
          <View
            className="flex-row bg-warn-soft rounded-md"
            style={{ padding: 14, gap: 10 }}
          >
            <Icon name="info" size={18} color={colors.warn} />
            <Text
              className="font-sans text-text-2"
              style={{ flex: 1, fontSize: 13, lineHeight: 19 }}
            >
              3-3 berabere — bu maç ELO&apos;yu etkilemez ama
              istatistiklerine işlenir.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 20, gap: 12 }}>
        {!isSettled && (
          <Text
            className="font-sans text-text-3"
            style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 18 }}
          >
            {!scoresSettled
              ? 'Skorun gönderildi — rakibinin de skoru girmesi bekleniyor.'
              : myConfirmed
                ? 'Onayın alındı — rakibinin onayı bekleniyor.'
                : 'Skorlar eşleşti. Onaylayınca ELO güncellenir.'}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              size="lg"
              variant="secondary"
              full
              icon={<Icon name="flag" size={17} color={colors.text} />}
              onPress={() => router.push(`/match/${id}/dispute` as never)}
            >
              İtiraz et
            </Button>
          </View>
          <View style={{ flex: 1.5 }}>
            {isSettled ? (
              <Button
                size="lg"
                full
                icon={
                  <Icon name="check" size={17} color={colors.onLime} stroke={3} />
                }
                onPress={() => router.replace('/(tabs)/matches' as never)}
              >
                Tamam
              </Button>
            ) : (
              <Button
                size="lg"
                full
                disabled={
                  !scoresSettled || myConfirmed || confirmMutation.isPending
                }
                icon={
                  <Icon name="check" size={17} color={colors.onLime} stroke={3} />
                }
                onPress={() =>
                  id &&
                  confirmMutation.mutate(
                    { matchId: id },
                    {
                      onError: (e) =>
                        Alert.alert(
                          'Onaylanamadı',
                          (e as Error)?.message ?? 'Lütfen tekrar dene.',
                        ),
                    },
                  )
                }
              >
                {confirmMutation.isPending
                  ? 'Onaylanıyor…'
                  : !scoresSettled
                    ? 'Rakip bekleniyor'
                    : myConfirmed
                      ? 'Rakip onayı bekleniyor'
                      : 'Onayla'}
              </Button>
            )}
          </View>
        </View>
      </View>

      {/* Share card sheet */}
      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        title="Maç kartını paylaş"
      >
        <CardMatchResult
          myName={myName}
          opponentName={opponentName}
          myScore={myScore}
          oppScore={oppScore}
          won={perspective?.won ?? null}
          eloDelta={deltaDisplay !== 0 ? deltaDisplay : null}
          myElo={ratingBefore ?? undefined}
        />
      </ShareSheet>

      {/* (4) Confetti overlay — win only, one-shot on mount */}
      {isWin && !isVoid && <Confetti />}
    </ScreenEnter>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: colors.win,
    // Rendered before the Avatar in the same container, so paint order already
    // layers it behind — no negative zIndex (which can clip behind the screen
    // background on iOS).
  },
});
