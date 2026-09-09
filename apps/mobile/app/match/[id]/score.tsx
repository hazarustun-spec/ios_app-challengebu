// apps/mobile/app/match/[id]/score.tsx — live score entry.
//
// Two things this screen used to get wrong, both fixed here.
//
// 1. PERSPECTIVE. `live_match_scores` is absolute: side 'a' is always team A,
//    for both phones. This screen read it as if side 'a' were "me" — it
//    rendered `Sen` next to games_a and wired the "Sana sayı" button to
//    award_point('a'). For a team-A player the two models coincide and it
//    looked fine. For a team-B player everything mirrored: they saw their
//    opponent's score under their own name, their taps scored for the
//    opponent, and `finish()` swapped the numbers to "compensate", so the two
//    players submitted opposite scores and the match never settled. The Live
//    Activity had it right all along (LiveMatchAttributes.youSide), so the
//    widget and the screen disagreed about the same match.
//
//    Now there is exactly one mapping — `mySide` — and everything derives from
//    it. The hook stays absolute, matching the database.
//
// 2. UNIT. Entry was rally-by-rally (15/30/40 → a game every four points), and
//    only ever implemented BÜ Klasik. Nobody picks up a phone between rallies,
//    and a Pro Set or a tiebreak was being scored under Klasik's rule. Entry is
//    now one tap per unit of whatever the match's format actually counts —
//    games, tiebreak points or sets — see lib/live-format.ts.
//
// Point-by-point entry is deferred to an Apple Watch mode (docs/roadmap).

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { NavHeader } from '../../../components/ui/NavHeader';
import { ScoreStepper } from '../../../components/ui/ScoreStepper';
import { useToast } from '../../../components/ui/ToastProvider';
import { useLiveScore } from '../../../hooks/use-live-score';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { useSubmitMatchScore } from '../../../hooks/use-submit-match-score';
import { env } from '../../../lib/env';
import { liveFormatRule, progressLabel } from '../../../lib/live-format';
import {
  endMatchActivity,
  registerActivityPushToken,
  startMatchActivity,
  updateMatchActivity,
} from '../../../lib/live-match-activity';
import { resolveMatchSides, toPerspective } from '../../../lib/match-sides';
import { userMessage } from '../../../lib/user-message';
import { useAuthStore } from '../../../stores/auth-store';
import { colors } from '../../../theme/colors';

export default function ActiveMatch() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchQ = useMatchDetail(id);
  const opponentNames = useOpponentNames();
  const userId = useAuthStore((s) => s.user?.id);
  const accessToken = useAuthStore((s) => s.session?.access_token);
  const refreshToken = useAuthStore((s) => s.session?.refresh_token);
  const submitScore = useSubmitMatchScore();
  const toast = useToast();
  const { score, error: liveScoreError, awardUnit, revokeUnit } = useLiveScore(id);

  const match = matchQ.data ?? null;
  const rule = liveFormatRule(match?.format);

  // Absolute, exactly as the server holds them.
  const unitsA = score?.unitsA ?? 0;
  const unitsB = score?.unitsB ?? 0;
  const isVoid = score?.phase === 'void';
  const someoneWon = score?.phase === 'finished';
  const matchOver = isVoid || someoneWon;

  // THE mapping, and the only one — lib/match-sides.ts. Nothing below reads
  // 'a'/'b' out of the match itself.
  const sides = resolveMatchSides(match, userId);
  const mySide = sides.mine;
  const oppSide = sides.theirs;
  const { mine: myUnits, theirs: oppUnits } = toPerspective(sides, unitsA, unitsB);

  const opponent = match ? opponentNames.resolve(match) : null;
  const oppName: string = opponent?.name ?? 'Rakip';
  const oppFirstName: string = opponent?.primaryName?.split(' ')[0] ?? 'Rakip';

  // Live Activity labels are per-team, because the widget maps them back
  // through `youSide` itself (targets/live-activity/ScoreFormat.swift `Sides`).
  const nameA = mySide === 'a' ? 'Sen' : oppFirstName;
  const nameB = mySide === 'a' ? oppFirstName : 'Sen';

  // Latest score in a ref so the unmount cleanup ends the activity with the
  // final state (the start/end effect only runs once per match).
  const scoreRef = useRef({ unitsA, unitsB, isVoid, someoneWon, winner: score?.winner ?? null });
  scoreRef.current = { unitsA, unitsB, isVoid, someoneWon, winner: score?.winner ?? null };

  // biome-ignore lint/correctness/useExhaustiveDependencies: starts the Live Activity exactly once per match — scoreRef exists so the unmount cleanup sees the final score without the score being a dependency here
  useEffect(() => {
    // Wait for userId before starting: mySide (perspective) and the App-Group
    // accessToken both derive from it. Starting before userId arrives would
    // lock in the wrong perspective ('b' fallback) and never correct it.
    if (!match || !id || !userId) return;
    // Attach the APNs push-token listener BEFORE starting the activity so a
    // token emitted during start() can't be missed.
    const tokenSub = registerActivityPushToken(id);
    startMatchActivity({
      matchId: id,
      youSide: mySide,
      nameA,
      nameB,
      formatKey: match.format,
      unitLabel: rule.unit,
      supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      accessToken,
      refreshToken,
    });
    return () => {
      tokenSub?.remove();
      const s = scoreRef.current;
      endMatchActivity({
        unitsA: s.unitsA,
        unitsB: s.unitsB,
        phase: s.isVoid ? 'void' : 'finished',
        winner: s.winner,
      });
    };
  }, [match?.id, userId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: updateMatchActivity is a module function, not state; the score values it sends are already the deps
  useEffect(() => {
    if (!match) return;
    updateMatchActivity({
      unitsA,
      unitsB,
      phase: isVoid ? 'void' : someoneWon ? 'finished' : 'ongoing',
      // Trust the server's winner rather than re-deriving it from the counts:
      // each format decides differently, and a second implementation here is a
      // second thing to get wrong.
      winner: score?.winner ?? null,
    });
  }, [unitsA, unitsB, isVoid, someoneWon, score?.winner, match?.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fires the toast on a new error only; toast is a stable context value and listing it would re-show the message on every render
  useEffect(() => {
    if (liveScoreError) toast.show('Canlı skor yüklenemedi', 'error');
  }, [liveScoreError]);

  // `sides.resolved` guards the write path: until the match row says which team
  // this player is on, a tap has no correct side to land on and must not guess.
  // Guessing is precisely what the old screen did.
  const handleAward = (side: 'a' | 'b') => {
    if (!sides.resolved) return;
    awardUnit(side).catch((e) => toast.show(userMessage(e, 'Skor kaydedilemedi.'), 'error'));
  };
  const handleRevoke = (side: 'a' | 'b') => {
    if (!sides.resolved) return;
    revokeUnit(side).catch((e) => toast.show(userMessage(e, 'Geri alınamadı.'), 'error'));
  };

  const finish = () => {
    if (!id || submitScore.isPending) return;
    // No perspective swap. `unitsA`/`unitsB` are already the match's fixed team
    // sides, which is exactly what the backend records — the old code mapped
    // "my games" onto a side and produced mirrored submissions from the two
    // phones, which is why scores never matched.
    const winnerTeam: 'a' | 'b' | 'void' = isVoid ? 'void' : (score?.winner ?? 'a');
    submitScore.mutate(
      { matchId: id, scoreTeamA: unitsA, scoreTeamB: unitsB, winnerTeam },
      {
        onSuccess: () => router.replace(`/match/${id}/result` as never),
        onError: (e) => Alert.alert('Skor gönderilemedi', userMessage(e, 'Lütfen tekrar dene.')),
      },
    );
  };

  const rows = [
    { name: 'Sen', units: myUnits, side: mySide, me: true },
    { name: oppName, units: oppUnits, side: oppSide, me: false },
  ];

  const navSubtitle = match?.court?.name ? match.court.name : undefined;

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
      <NavHeader title="Canlı Maç" subtitle={navSubtitle} onBack={() => router.back()} />
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
            <View className="items-center justify-center" style={{ paddingVertical: 40 }}>
              <ActivityIndicator color={colors.clay} />
            </View>
          ) : (
            rows.map((r, i) => (
              <View
                key={r.side}
                className="flex-row items-center"
                style={{
                  padding: 12,
                  paddingHorizontal: 14,
                  gap: 10,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: colors.surface3,
                  backgroundColor: r.me ? colors.claySofter : 'transparent',
                }}
              >
                <Avatar name={r.me ? oppName : r.name} size={38} />
                <Text
                  className="font-sans font-bold text-text"
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 15 }}
                >
                  {r.name}
                </Text>
                <ScoreStepper
                  value={r.units}
                  mine={r.me}
                  ownerLabel={r.name}
                  unitLabel={rule.unit}
                  disabled={matchOver || !sides.resolved}
                  onIncrement={() => handleAward(r.side)}
                  onDecrement={() => handleRevoke(r.side)}
                />
              </View>
            ))
          )}
        </View>

        <Text
          className="font-num font-bold text-text-3"
          style={{ textAlign: 'center', fontSize: 12, marginTop: 4 }}
        >
          {progressLabel(rule, unitsA, unitsB)} ·{' '}
          {isVoid ? 'BERABERE' : someoneWon ? 'MAÇ BİTTİ' : 'GÜNCEL'}
        </Text>

        {!matchOver && (
          <View
            className="flex-row items-center"
            style={{ justifyContent: 'center', gap: 5, marginTop: 6 }}
          >
            <Icon name="refresh" size={12} color={colors.text3} />
            <Text className="font-sans text-text-3" style={{ fontSize: 11.5, textAlign: 'center' }}>
              {`Kazanılan ${rule.unitPlural} sayısını gir · ikiniz de girebilir, anlık eşitlenir`}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <Button
          full
          size="lg"
          variant={matchOver ? 'primary' : 'secondary'}
          disabled={!matchOver || submitScore.isPending}
          icon={<Icon name="flag" size={17} color={matchOver ? colors.onLime : colors.text} />}
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
