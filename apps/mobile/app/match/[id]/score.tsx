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
//   • Undo replays a snapshot stack. Disabled when the stack is empty.
//   • Navigates to `/match/[id]/result` with the final state via search
//     params (no Zustand needed at this stage).
//   • Opponent name resolved via useOpponentNames() + useMatchDetail(id).
//   • Wired to live data — no mock constants remain.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Icon } from '../../../components/ui/Icon';
import { ScoreInput } from '../../../components/ui/ScoreInput';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { colors } from '../../../theme/colors';

const PTS = ['0', '15', '30', '40', 'Ad'];

interface Snapshot {
  gA: number;
  gB: number;
  pA: number;
  pB: number;
}

export default function ActiveMatch() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchQ = useMatchDetail(id);
  const opponentNames = useOpponentNames();
  const [gA, setGA] = useState(0);
  const [gB, setGB] = useState(0);
  const [pA, setPA] = useState(0);
  const [pB, setPB] = useState(0);
  const [hist, setHist] = useState<Snapshot[]>([]);

  // Resolve opponent name from live match data. Falls back to 'Rakip' while
  // loading or when the match row hasn't arrived yet.
  const match = matchQ.data ?? null;
  const opponent = match ? opponentNames.resolve(match) : null;
  const oppName: string = opponent?.name ?? 'Rakip';
  const oppFirstName: string = opponent?.primaryName?.split(' ')[0] ?? 'Rakip';

  const total = gA + gB;
  const isVoid = gA === 3 && gB === 3;
  const someoneWon = gA === 4 || gB === 4;

  const award = (who: 'A' | 'B') => {
    if (someoneWon || isVoid) return;
    setHist((h) => [...h, { gA, gB, pA, pB }]);
    let a = pA;
    let b = pB;
    if (who === 'A') a += 1;
    else b += 1;
    const winsGame = (x: number, y: number) =>
      x >= 4 && x - y >= 1 && !(x === 4 && y === 4);
    if (winsGame(a, b)) {
      if (who === 'A') setGA((g) => g + 1);
      else setGB((g) => g + 1);
      setPA(0);
      setPB(0);
    } else if (a === 4 && b === 4) {
      // Deuce → reset both to 40
      setPA(3);
      setPB(3);
    } else {
      setPA(a);
      setPB(b);
    }
  };

  const undo = () => {
    setHist((h) => {
      if (!h.length) return h;
      const s = h[h.length - 1];
      if (s) {
        setGA(s.gA);
        setGB(s.gB);
        setPA(s.pA);
        setPB(s.pB);
      }
      return h.slice(0, -1);
    });
  };

  // Point label: when one side has Advantage (4) but the other is still ≤ 2,
  // render 'Ad'; otherwise look up the standard label table.
  const ptLabel = (p: number, other: number) =>
    p === 4 && other < 3 ? 'Ad' : PTS[Math.min(p, 4)];

  const finish = () => {
    const win = gA > gB;
    router.replace({
      pathname: `/match/${id}/result`,
      params: {
        win: String(win),
        score: `${gA}-${gB}`,
        voided: String(isVoid),
        opp: oppName,
      },
    } as never);
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
        {/* Score panel */}
        <View
          className="bg-surface rounded-lg overflow-hidden"
          style={{ borderWidth: 1, borderColor: colors.borderStrong }}
        >
          {rows.map((r, i) => (
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
                onPress={() => award('A')}
              />
              <ScoreInput
                label={`${oppFirstName} sayı`}
                onPress={() => award('B')}
              />
            </View>
            <Pressable
              onPress={undo}
              disabled={!hist.length}
              className="flex-row items-center justify-center rounded-md"
              style={{
                width: '100%',
                height: 44,
                marginTop: 4,
                gap: 8,
                borderWidth: 1.5,
                borderColor: colors.borderStrong,
                opacity: hist.length ? 1 : 0.4,
              }}
            >
              <Icon name="refresh" size={16} color={colors.text} />
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 13.5 }}
              >
                Son sayıyı geri al
              </Text>
            </Pressable>
            <View
              className="flex-row items-center justify-center"
              style={{ gap: 5, marginTop: 6 }}
            >
              <Icon name="refresh" size={12} color={colors.text3} />
              <Text
                className="font-sans font-semibold text-text-3"
                style={{ fontSize: 11 }}
              >
                Çevrimdışıyken kaydedilir, bağlanınca eşitlenir
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <Button
          full
          size="lg"
          variant={someoneWon || isVoid ? 'primary' : 'secondary'}
          disabled={!someoneWon && !isVoid}
          icon={
            <Icon
              name="flag"
              size={17}
              color={someoneWon || isVoid ? colors.onLime : colors.text}
            />
          }
          onPress={finish}
        >
          {isVoid ? 'Berabere — Maçı kapat' : 'Maçı Bitir'}
        </Button>
      </View>
    </View>
  );
}
