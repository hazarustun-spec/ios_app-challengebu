// apps/mobile/app/match/[id]/score.tsx — Plan 8 Phase E6.
//
// Live score entry. Simple one-side flow: tap "+" buttons to award points,
// games auto-advance, "Maçı Bitir" reveals when somebody wins (4 games,
// margin ≥ 1) or the 3-3 voided rule fires.
//
// Notes
//   • The Plan 8 spec removes the live-sync pulse + mismatch UI the design
//     bundle's `ActiveMatch` shipped with — we keep ONLY the simple
//     home-device flow.
//   • Undo exists — server-authoritative + event-sourced. The "Geri Al" button
//     calls the undo_point RPC, which reverses the most recent point; there is
//     no client-side snapshot stack.
//   • Navigates to `/match/[id]/result` with the final state via search
//     params (no Zustand needed at this stage).
//   • Opponent name resolved via useOpponentNames() + useMatchDetail(id).
//   • Wired to live data — no mock constants remain.

import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Icon } from '../../../components/ui/Icon';
import { ScoreInput } from '../../../components/ui/ScoreInput';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { useSubmitMatchScore } from '../../../hooks/use-submit-match-score';
import { useLiveScore } from '../../../hooks/use-live-score';
import {
  startMatchActivity,
  updateMatchActivity,
  endMatchActivity,
  registerActivityPushToken,
} from '../../../lib/live-match-activity';
import { useToast } from '../../../components/ui/ToastProvider';
import { useAuthStore } from '../../../stores/auth-store';
import { env } from '../../../lib/env';
import { colors } from '../../../theme/colors';

const PTS = ['0', '15', '30', '40', 'Ad'];

export default function ActiveMatch() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchQ = useMatchDetail(id);
  const opponentNames = useOpponentNames();
  const userId = useAuthStore((s) => s.user?.id);
  const accessToken = useAuthStore((s) => s.session?.access_token);
  const refreshToken = useAuthStore((s) => s.session?.refresh_token);
  const submitScore = useSubmitMatchScore();
  const toast = useToast();
  const { score, error: liveScoreError, awardPoint, undoPoint } = useLiveScore(id);
  const gA = score?.gamesA ?? 0, gB = score?.gamesB ?? 0;
  const pA = score?.pointsA ?? 0, pB = score?.pointsB ?? 0;
  const isVoid = score?.phase === 'void';
  const someoneWon = score?.phase === 'finished';

  // Resolve opponent name from live match data. Falls back to 'Rakip' while
  // loading or when the match row hasn't arrived yet.
  const match = matchQ.data ?? null;
  const opponent = match ? opponentNames.resolve(match) : null;
  const oppName: string = opponent?.name ?? 'Rakip';
  const oppFirstName: string = opponent?.primaryName?.split(' ')[0] ?? 'Rakip';

  const total = gA + gB;

  // Live Activity — mirror the live score to the Dynamic Island + Lock Screen.
  const youSide: 'a' | 'b' = match?.team_a_player_ids?.includes(userId ?? '')
    ? 'a'
    : 'b';
  const nameA = youSide === 'a' ? 'Sen' : oppFirstName;
  const nameB = youSide === 'a' ? oppFirstName : 'Sen';

  // Latest score in a ref so the unmount cleanup ends the activity with the
  // final state (the start/end effect only runs once per match).
  const scoreRef = useRef({ gA, gB, pA, pB, isVoid, someoneWon });
  scoreRef.current = { gA, gB, pA, pB, isVoid, someoneWon };

  useEffect(() => {
    // Wait for userId before starting: youSide (perspective) and the App-Group
    // accessToken both derive from it. Starting before userId arrives would lock
    // in the wrong perspective ('b' fallback) + empty token and never correct.
    // userId is in the deps so this (re)runs once it lands; match.id is stable so
    // the activity still starts exactly once per match.
    if (!match || !id || !userId) return;
    // Attach the APNs push-token listener BEFORE starting the activity so a
    // token emitted during start() can't be missed. The listener reads a fresh
    // access token at event time, so a late-arriving session still registers.
    // Never breaks scoring on failure.
    const tokenSub = registerActivityPushToken(id);
    startMatchActivity({
      matchId: id,
      youSide,
      nameA,
      nameB,
      supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      accessToken,
      refreshToken,
    });
    return () => {
      tokenSub?.remove();
      const s = scoreRef.current;
      endMatchActivity({
        gamesA: s.gA,
        gamesB: s.gB,
        pointsA: s.pA,
        pointsB: s.pB,
        phase: s.isVoid ? 'void' : 'finished',
        winner: s.someoneWon ? (s.gA === 4 ? 'a' : 'b') : null,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, userId]);

  useEffect(() => {
    if (!match) return;
    const phase: 'ongoing' | 'void' | 'finished' = isVoid
      ? 'void'
      : someoneWon
        ? 'finished'
        : 'ongoing';
    const winner = someoneWon ? (gA === 4 ? 'a' : 'b') : null;
    updateMatchActivity({
      gamesA: gA,
      gamesB: gB,
      pointsA: pA,
      pointsB: pB,
      phase,
      winner,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gA, gB, pA, pB, isVoid, someoneWon, match?.id]);

  // Surface a non-blocking error if the live score failed to load.
  useEffect(() => {
    if (liveScoreError) toast.show('Canlı skor yüklenemedi', 'error');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveScoreError]);

  // Award a point, surfacing RPC failures so a tap that didn't register is
  // visible instead of silently lost.
  const handleAward = (side: 'a' | 'b') => {
    awardPoint(side).catch(() => toast.show('Sayı kaydedilemedi', 'error'));
  };

  // Undo the last point — server-authoritative (event-sourced) via undo_point.
  // Surfaces RPC failures the same way handleAward does.
  const handleUndo = () => {
    undoPoint().catch(() => toast.show('Geri alınamadı', 'error'));
  };

  // Point label: when one side has Advantage (4) but the other is still ≤ 2,
  // render 'Ad'; otherwise look up the standard label table.
  const ptLabel = (p: number, other: number) =>
    p === 4 && other < 3 ? 'Ad' : PTS[Math.min(p, 4)];

  const finish = () => {
    if (!id || submitScore.isPending) return;
    // The UI tracks games as "Sen" (gA) vs opponent (gB), but the backend
    // records scoreTeamA/scoreTeamB against the match's fixed team sides. Map my
    // games onto the correct side so BOTH players submit identical team scores
    // (otherwise the two submissions never match).
    const iAmTeamA = userId ? (match?.team_a_player_ids.includes(userId) ?? true) : true;
    const scoreTeamA = iAmTeamA ? gA : gB;
    const scoreTeamB = iAmTeamA ? gB : gA;
    const winnerTeam: 'a' | 'b' | 'void' = isVoid
      ? 'void'
      : scoreTeamA > scoreTeamB
        ? 'a'
        : 'b';
    submitScore.mutate(
      { matchId: id, scoreTeamA, scoreTeamB, winnerTeam },
      {
        onSuccess: () => router.replace(`/match/${id}/result` as never),
        onError: (e) =>
          Alert.alert(
            'Skor gönderilemedi',
            (e as Error)?.message ?? 'Lütfen tekrar dene.',
          ),
      },
    );
  };

  const rows = [
    { name: 'Sen', g: gA, p: ptLabel(pA, pB), me: true },
    { name: oppName, g: gB, p: ptLabel(pB, pA), me: false },
  ];

  const navSubtitle = match?.court?.name ? match.court.name : undefined;

  // Loading state — show spinner while match data is in flight
  if (matchQ.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Canlı Maç" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  // Error state — graceful fallback
  if (matchQ.isError) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Canlı Maç" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
          <Text className="font-sans text-text-3" style={{ textAlign: 'center', fontSize: 14 }}>
            Maç bilgisi yüklenemedi. Lütfen tekrar dene.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Canlı Maç"
        subtitle={navSubtitle}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 12,
          gap: 10,
        }}
      >
        {/* Score panel — spinner while the live score is still loading so we
            don't render 0-0 as if it were a real score. */}
        <View
          className="bg-surface rounded-lg overflow-hidden"
          style={{ borderWidth: 1, borderColor: colors.borderStrong }}
        >
          {score == null && !liveScoreError ? (
            <View
              className="items-center justify-center"
              style={{ paddingVertical: 40 }}
            >
              <ActivityIndicator color={colors.clay} />
            </View>
          ) : rows.map((r, i) => (
            <View
              key={r.name}
              className="flex-row items-center"
              style={{
                padding: 14,
                paddingHorizontal: 16,
                gap: 12,
                borderTopWidth: i ? 1 : 0,
                borderColor: colors.surface3,
                backgroundColor: r.me ? colors.claySofter : 'transparent',
              }}
            >
              <Avatar name={r.name} size={42} />
              <Text
                className="font-sans font-bold text-text"
                style={{ flex: 1, fontSize: 15.5 }}
              >
                {r.me ? 'Sen' : r.name}
              </Text>
              <Text
                className="font-num font-bold text-text-3"
                style={{ width: 38, textAlign: 'center', fontSize: 16 }}
              >
                {r.p}
              </Text>
              <Text
                className="font-num font-extrabold"
                style={{
                  width: 40,
                  textAlign: 'center',
                  fontSize: 36,
                  color: r.g === 4 ? colors.win : colors.text,
                }}
              >
                {r.g}
              </Text>
            </View>
          ))}
        </View>

        <Text
          className="font-num font-bold text-text-3"
          style={{ textAlign: 'center', fontSize: 12, marginTop: 4 }}
        >
          EL {Math.min(total + 1, 7)} / 7 ·{' '}
          {isVoid ? '3-3 BERABERE' : someoneWon ? 'MAÇ BİTTİ' : 'GÜNCEL'}
        </Text>

        {!someoneWon && !isVoid && (
          <>
            <View className="flex-row" style={{ gap: 12, marginTop: 6 }}>
              <ScoreInput
                label="Sana sayı"
                tint={colors.court}
                onPress={() => handleAward('a')}
              />
              <ScoreInput
                label={`${oppFirstName} sayı`}
                onPress={() => handleAward('b')}
              />
            </View>
          </>
        )}

        {/* Geri Al — reverses the most recent point (server-authoritative,
            event-sourced). Secondary/ghost so it stays reachable without
            competing with the +1 buttons. Reachable even after a void/finish
            so a mistaken match-ending point can be corrected. */}
        {score != null && (
          <View className="flex-row" style={{ justifyContent: 'center', marginTop: 2 }}>
            <Button
              variant="ghost"
              size="sm"
              icon={<Icon name="refresh" size={15} color={colors.text2} />}
              onPress={handleUndo}
            >
              Geri Al
            </Button>
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <Button
          full
          size="lg"
          variant={someoneWon || isVoid ? 'primary' : 'secondary'}
          disabled={(!someoneWon && !isVoid) || submitScore.isPending}
          icon={
            <Icon
              name="flag"
              size={17}
              color={someoneWon || isVoid ? colors.onLime : colors.text}
            />
          }
          onPress={finish}
        >
          {submitScore.isPending
            ? 'Gönderiliyor…'
            : isVoid
              ? 'Berabere — Maçı kapat'
              : 'Maçı Bitir'}
        </Button>
      </View>
    </View>
  );
}
