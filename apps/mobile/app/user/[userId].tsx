// apps/mobile/app/user/[userId].tsx — Plan 8 Phase F (F6).
//
// Other-player preview at `/user/[userId]`. Ports the design bundle's
// `function PlayerPreview(...)` (see
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-leaderboard.jsx)
// to React Native + NativeWind.
//
// Hero stack (avatar + name + pronoun chip + level chip + dept/year),
// 2×2 stats grid, ELO + badges card, optional frozen banner, and a sticky
// footer with two CTAs: "Profil" (secondary) + "Meydan oku" (primary).
//
// Pre-TestFlight hardening #2 — the "Meydan oku" CTA prefills the
// new-match store's `opponent` field and pushes to `/match/new/detail`
// so the wizard lands on detail with the opponent already chosen. The
// detail screen's existing opponent slot reads from the same store.
//
// TODO(plan-8-F-polish): wire useOtherPlayerProfile(userId) + real badges
// to replace the hard-coded mock that ships with this batch.

import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { LevelIcon } from '../../components/ui/LevelIcon';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { levelForElo } from '../../lib/levels';
import { useNewMatchStore } from '../../stores/new-match-store';
import { colors } from '../../theme/colors';

interface MockPlayer {
  userId: string;
  name: string;
  pronoun: string;
  rank: number;
  elo: number;
  wl: [number, number];
  streak: string;
  dept: string;
  year: string;
  badges: string[];
  status: 'active' | 'frozen_30';
  seasonChamp: boolean;
}

// TODO(plan-8-F-polish): useOtherPlayerProfile(userId)
const MOCK_PLAYER: MockPlayer = {
  userId: 'mock',
  name: 'Berk Aydın',
  pronoun: 'he/him',
  rank: 3,
  elo: 1748,
  wl: [16, 7],
  streak: 'W4',
  dept: 'Mühendislik Fakültesi',
  year: '3',
  badges: ['first_win', 'streak5', 'iron'],
  status: 'active',
  seasonChamp: false,
};

export default function PlayerPreview() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const setField = useNewMatchStore((s) => s.setField);
  const p: MockPlayer = { ...MOCK_PLAYER, userId: userId || MOCK_PLAYER.userId };
  const lv = levelForElo(p.elo);
  const frozen = p.status === 'frozen_30';

  const meydanOku = () => {
    // Pre-fill opponent in the new-match store + skip directly to the detail
    // step. The detail screen reads opponent from the same store, so the
    // wizard lands with the opponent slot already filled.
    setField('opponent', { userId: p.userId, name: p.name, elo: p.elo });
    router.push('/match/new/detail' as never);
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Oyuncu" onBack={() => router.back()} close />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Hero */}
        <View style={{ alignItems: 'center', gap: 8, paddingTop: 6 }}>
          <Avatar name={p.name} size={92} ring={lv.color} />
          <View
            className="flex-row items-center"
            style={{ gap: 8, marginTop: 4 }}
          >
            <Text
              className="font-display font-extrabold text-text"
              style={{ fontSize: 23, letterSpacing: -0.46 }}
            >
              {p.name}
            </Text>
            {p.seasonChamp && (
              <Icon name="crown" size={20} color="#C9982E" />
            )}
          </View>
          <View
            className="flex-row items-center"
            style={{ gap: 8 }}
          >
            <View
              className="bg-surface-2 rounded-pill"
              style={{ paddingHorizontal: 8, paddingVertical: 2 }}
            >
              <Text
                className="font-sans font-semibold"
                style={{ fontSize: 12, color: colors.text3 }}
              >
                {p.pronoun}
              </Text>
            </View>
            <View
              className="flex-row items-center"
              style={{ gap: 5 }}
            >
              <LevelIcon level={lv} size={16} />
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 13.5, color: lv.color }}
              >
                {lv.name}
              </Text>
            </View>
          </View>
          <Text
            className="font-sans"
            style={{ fontSize: 13, color: colors.text2 }}
          >
            {p.dept} · {p.year}. sınıf
          </Text>
        </View>

        {/* Stats 2x2 row */}
        <View
          className="flex-row"
          style={{ gap: 8, marginTop: 12 }}
        >
          {(
            [
              ['Rank', `#${p.rank}`],
              ['Galibiyet', String(p.wl[0])],
              ['Mağlubiyet', String(p.wl[1])],
              ['Seri', p.streak],
            ] as const
          ).map(([l, v]) => (
            <View
              key={l}
              style={{
                flex: 1,
                backgroundColor: colors.surface2,
                borderRadius: 18,
                padding: 12,
                paddingHorizontal: 4,
                alignItems: 'center',
              }}
            >
              <Text
                className="font-num font-bold text-text"
                style={{ fontSize: 19 }}
              >
                {v}
              </Text>
              <Text
                className="font-sans font-semibold"
                style={{ fontSize: 11, marginTop: 2, color: colors.text3 }}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>

        {/* ELO + badges */}
        <View
          className="flex-row items-center justify-between bg-surface rounded-md"
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          <View>
            <Text
              className="font-sans font-semibold"
              style={{ fontSize: 12.5, color: colors.text3 }}
            >
              Mevcut ELO
            </Text>
            <Text
              className="font-num font-extrabold"
              style={{ fontSize: 26, color: lv.color }}
            >
              {p.elo}
            </Text>
          </View>
          <View className="flex-row" style={{ gap: 4 }}>
            {/* TODO(plan-8-F-polish): real badge icons from server */}
            {p.badges.slice(0, 3).map((b) => (
              <View
                key={b}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 14,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="medal" size={18} color={colors.acGold} />
              </View>
            ))}
          </View>
        </View>

        {frozen && (
          <View
            className="flex-row bg-frozen-soft rounded-md"
            style={{ padding: 13, gap: 10 }}
          >
            <Icon name="snow" size={18} color={colors.frozen} />
            <Text
              className="font-sans"
              style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 18,
                color: colors.text2,
              }}
            >
              Bu oyuncu{' '}
              <Text className="font-bold">donmuş</Text> durumda (30+ gündür
              inaktif). Meydan okuman onu yeniden aktifleştirir.
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={{ padding: 20, flexDirection: 'row', gap: 10 }}
      >
        <View style={{ flex: 1 }}>
          <Button
            size="lg"
            variant="secondary"
            full
            icon={<Icon name="user" size={17} color={colors.text} />}
            onPress={() => {
              // TODO(plan-8-F-polish): push to full profile when wired
            }}
          >
            Profil
          </Button>
        </View>
        <View style={{ flex: 2 }}>
          <Button
            size="lg"
            full
            icon={<Icon name="bolt" size={17} color={colors.onLime} />}
            onPress={meydanOku}
          >
            Meydan oku
          </Button>
        </View>
      </View>
    </View>
  );
}
