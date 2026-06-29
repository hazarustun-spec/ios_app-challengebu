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

import { useEffect, useRef, useState } from 'react';
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
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { haptics } from '../../../lib/haptics';
import { ScreenEnter } from '../../../components/ui/ScreenEnter';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { colors } from '../../../theme/colors';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useMatchSubmissions } from '../../../hooks/use-match-submissions';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { useConfirmMatch } from '../../../hooks/use-confirm-match';
import { useRealtimeChannel } from '../../../hooks/use-realtime-channel';
import { queryKeys } from '../../../lib/query-keys';
import { myPerspective } from '../../../lib/match-opponent';
import { formatByKey, DB_TO_UI_FORMAT } from '../../../lib/formats';
import { formatDateLabel } from '../../../lib/match-dates';
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

  // Live-refresh submissions — INSERT events fire on conflict (matches row isn't
  // updated when scores disagree, so the matches UPDATE channel won't fire).
  useRealtimeChannel({
    channelName: id ? `match:submissions:${id}` : 'match:submissions:none',
    enabled: !!id,
    configs: [{ event: 'INSERT', table: 'match_score_submissions', filter: `match_id=eq.${id}` }],
    invalidateKeys: [queryKeys.matchSubmissions.byMatch(id ?? '')],
  });

  const submissionsQ = useMatchSubmissions(id);
  const submissions = submissionsQ.data ?? [];

  const match = matchQ.data ?? null;

  // Real format · date line (replaces the old hardcoded "BÜ Klasik · Bugün").
  const metaLine = match
    ? `${formatByKey(DB_TO_UI_FORMAT[match.format] ?? 'klasik').name} · ${formatDateLabel(match.played_at)}`
    : '';

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

  // Win celebration — ref-guarded so realtime refetches never retrigger it.
  // Fires once as soon as isWin first becomes true. Drives: haptic crescendo,
  // trophy spring pop, tag bounce, and glow pulse — all in one coherent moment.
  const celebrationFiredRef = useRef(false);
  const trophyScale = useSharedValue(0);
  const tagScale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (isWin && !isVoid && !celebrationFiredRef.current) {
      celebrationFiredRef.current = true;
      // Trophy: spring in from 0 → natural overshoot → settle at 1
      trophyScale.value = withSpring(1, { damping: 7, stiffness: 200 });
      // Tag: quick compress then spring back (pop-in feel)
      tagScale.value = withSequence(
        withTiming(0.88, { duration: 80 }),
        withSpring(1, { damping: 6, stiffness: 280 }),
      );
      // Glow: pulses 3× (6 half-cycles) then rests
      glow.value = withRepeat(withTiming(1, { duration: 700 }), 6, true);
      // Haptic crescendo: medium → heavy → notification success
      haptics.medium();
      setTimeout(() => haptics.heavy(), 120);
      setTimeout(() => haptics.success(), 260);
    }
  }, [isWin, isVoid]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.45]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.22]) }],
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
    // opacity tracks scale so the icon is invisible at rest-zero
    opacity: trophyScale.value,
  }));

  const tagStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tagScale.value }],
  }));

  // When scores haven't both been submitted yet, show a neutral pending state
  // rather than defaulting to "Kaybettin" / "0-0" which is misleading.
  const isPending = !scoresSettled;

  // --- Conflict detection ---
  // hasConflict: match unsettled AND every participant has a submission but
  // they differ (all submitted, none agree).
  // "every participant has submitted" is determined by checking that both team
  // player lists are covered by the set of submitters.
  const submitters = new Set(submissions.map((s) => s.submitted_by));
  const everyone = match
    ? [...match.team_a_player_ids, ...match.team_b_player_ids]
    : [];
  const hasConflict =
    !scoresSettled &&
    everyone.length > 0 &&
    everyone.every((p) => submitters.has(p));

  // Oriented conflict scores: "my games – opp games" perspective.
  // iAmTeamA was already derived above as myTeamSide === 'a'.
  const iAmTeamA = myTeamSide === 'a';
  const mySubmission = submissions.find((s) => s.submitted_by === userId);
  const oppSubmission = submissions.find((s) => s.submitted_by !== userId);

  const conflictMyMine = mySubmission
    ? iAmTeamA
      ? mySubmission.score_details.scoreTeamA
      : mySubmission.score_details.scoreTeamB
    : null;
  const conflictMyOpp = mySubmission
    ? iAmTeamA
      ? mySubmission.score_details.scoreTeamB
      : mySubmission.score_details.scoreTeamA
    : null;
  const conflictOppMine = oppSubmission
    ? iAmTeamA
      ? oppSubmission.score_details.scoreTeamA
      : oppSubmission.score_details.scoreTeamB
    : null;
  const conflictOppOpp = oppSubmission
    ? iAmTeamA
      ? oppSubmission.score_details.scoreTeamB
      : oppSubmission.score_details.scoreTeamA
    : null;
  const tagColor = hasConflict
    ? colors.warn
    : isPending
      ? colors.text3
      : isVoid
        ? colors.warn
        : isWin
          ? colors.win
          : colors.loss;
  const tagBg = hasConflict
    ? colors.warnSoft
    : isPending
      ? colors.surface
      : isVoid
        ? colors.warnSoft
        : isWin
          ? colors.limeSoft
          : '#FCE6E4';
  const tagText = hasConflict
    ? 'Skorlar uyuşmuyor!'
    : isPending
      ? 'Skor onayı bekleniyor'
      : isVoid
        ? 'Berabere (voided)'
        : isWin
          ? 'Kazandın!'
          : 'Kaybettin';
  const tagIcon: IconName = hasConflict ? 'info' : isPending ? 'info' : isVoid ? 'info' : isWin ? 'trophy' : 'x';
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
          <Animated.View
            className="flex-row items-center rounded-pill"
            style={[
              {
                paddingHorizontal: 16,
                paddingVertical: 7,
                gap: 6,
                backgroundColor: tagBg,
              },
              isWin && !isVoid ? tagStyle : null,
            ]}
          >
            <Icon name={tagIcon} size={16} color={tagColor} stroke={2.5} />
            <Text
              className="font-sans font-extrabold"
              style={{ fontSize: 14, color: tagColor }}
            >
              {tagText}
            </Text>
          </Animated.View>

          {/* Trophy pop — springs in on win, layered with confetti/glow/count-up */}
          {isWin && !isVoid && (
            <Animated.View style={trophyStyle}>
              <Icon name="trophy" size={38} color={colors.win} stroke={1.5} />
            </Animated.View>
          )}

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
            {metaLine}
          </Text>
        </View>

        {!isVoid && delta !== null && !isPending && !hasConflict && (
          <View
            className="bg-surface rounded-lg"
            style={{ padding: 18, borderWidth: 1, borderColor: colors.borderStrong }}
          >
            <Text
              className="font-sans font-bold text-text-3"
              style={{ fontSize: 12.5 }}
            >
              {isSettled ? 'ELO değişimi' : 'Tahmini ELO değişimi'}
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
              {isSettled
                ? `Çarpan: ${finalScore} → ${isWin ? '1.1×' : '1.0×'}.`
                : `Çarpan: ${finalScore} → ${isWin ? '1.1×' : '1.0×'}. Onaylandığında kesinleşir.`}
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

        {hasConflict && (
          <View
            className="bg-warn-soft rounded-lg"
            style={{ padding: 16, gap: 10, borderWidth: 1, borderColor: colors.warn }}
          >
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Icon name="info" size={16} color={colors.warn} />
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 13, color: colors.warn }}
              >
                Skorlar uyuşmuyor
              </Text>
            </View>
            <Text
              className="font-sans text-text-2"
              style={{ fontSize: 13, lineHeight: 19 }}
            >
              {conflictMyMine !== null && conflictMyOpp !== null
                ? `Sen ${conflictMyMine}-${conflictMyOpp} girdin`
                : 'Senin skorun bilinmiyor'}
              {conflictOppMine !== null && conflictOppOpp !== null
                ? `, rakibin ${conflictOppMine}-${conflictOppOpp} girdi.`
                : ', rakibin skoru bilinmiyor.'}
              {' '}Skoru düzelterek tekrar gönderebilirsin.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 20, gap: 12 }}>
        {!isSettled && !hasConflict && (
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
            ) : hasConflict ? (
              <Button
                size="lg"
                full
                onPress={() => router.replace(`/match/${id}/score` as never)}
              >
                Skoru tekrar gir
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
