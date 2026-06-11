// Profile tab — Plan 8 Phase F1.
//
// Ports the design bundle's `Profile` screen (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-profile.jsx
// `function Profile()`) to React Native + NativeWind.
//
// Sections:
//   - Hero: LevelRing avatar + name + pronoun chip + level row +
//     dept/year/hand line + level progress bar to next level.
//   - Vitrin (3 showcased badges) with "Düzenle" → /profile/badges.
//   - Scroll pill tab strip (Sıralamalar / İstatistikler / Rozetler /
//     ELO / Maçlar). Only "Sıralamalar" stays in-screen — every other
//     tab navigates into the matching sub-screen.
//   - MY_RANKS list: big color-rotated cards (lime / court / ink) that
//     open the category leaderboard.
//
// TODO(plan-8-F-polish): swap MY_BADGES / MY_RANKS / ME_ELO for real
// hooks. Today they are inline mocks aligned with the design bundle's
// dummy data so the screen reads and feels right.

import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { LevelRing } from '../../components/ui/LevelRing';
import { LevelIcon } from '../../components/ui/LevelIcon';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useAuthStore } from '../../stores/auth-store';
import { levelForElo, levelProgress } from '../../lib/levels';
import { colors } from '../../theme/colors';

// TODO(plan-8-F-polish): real hooks for elo / badges / ranks
const ME_ELO = 1612;

interface BadgeChip {
  key: string;
  name: string;
  icon: IconName;
  color: string;
}

const MY_BADGES: BadgeChip[] = [
  { key: 'first_win', name: 'İlk Galibiyet', icon: 'medal', color: colors.acGold },
  { key: 'streak5', name: '5 Maç Serisi', icon: 'flame', color: colors.acGreen },
  { key: 'giant', name: 'Dev Avcısı', icon: 'bolt', color: colors.acNavy },
];

interface RankCard {
  cat: string;
  label: string;
  rank: number;
  elo: number;
  delta: number;
}

const MY_RANKS: RankCard[] = [
  { cat: 'erkek_tek', label: 'Erkek Tek', rank: 4, elo: 1612, delta: 22 },
  { cat: 'open_tek', label: 'Open Tek', rank: 9, elo: 1612, delta: 22 },
  { cat: 'erkek_cift', label: 'Erkek Çift', rank: 2, elo: 1540, delta: -8 },
];

interface TabDef {
  key: 'rank' | 'stats' | 'badges' | 'elo' | 'matches';
  label: string;
  go?: string;
}

const TABS: TabDef[] = [
  { key: 'rank', label: 'Sıralamalar' },
  { key: 'stats', label: 'İstatistikler', go: '/profile/stats' },
  { key: 'badges', label: 'Rozetler', go: '/profile/badges' },
  { key: 'elo', label: 'ELO Geçmişi', go: '/profile/elo-history' },
  { key: 'matches', label: 'Maçlar', go: '/match/history' },
];

interface RankTheme {
  bg: string;
  fg: string;
  sub: string;
  pill: string;
  pillFg: string;
}

const THEMES: RankTheme[] = [
  { bg: colors.lime, fg: colors.onLime, sub: 'rgba(22,22,24,0.62)', pill: 'rgba(255,255,255,0.5)', pillFg: colors.onLime },
  { bg: colors.court, fg: '#FFFFFF', sub: 'rgba(255,255,255,0.75)', pill: 'rgba(255,255,255,0.2)', pillFg: '#FFFFFF' },
  { bg: colors.text, fg: colors.bg, sub: 'rgba(255,255,255,0.6)', pill: 'rgba(255,255,255,0.14)', pillFg: colors.bg },
];

export default function ProfileTab() {
  const profile = useAuthStore((s) => s.profile);
  // The auth-store today only ships first/last/role/onboarding. Optional Plan 8
  // profile fields (pronoun / department / class year / dominant hand) are
  // pulled defensively until the store grows to match — keeps this screen
  // shippable without a cross-cutting refactor.
  const extras = profile as
    | (NonNullable<typeof profile> & {
        pronoun?: string;
        departmentName?: string;
        classYear?: string | number;
        dominantHand?: string;
      })
    | null;
  const name = profile?.firstName
    ? `${profile.firstName} ${profile.lastName ?? ''}`.trim()
    : 'Oyuncu';
  const pronoun = extras?.pronoun ?? 'they/them';
  const dept = extras?.departmentName ?? 'Bölüm';
  const year = extras?.classYear ?? '';
  const hand = extras?.dominantHand === 'sol' ? 'Sol' : 'Sağ';

  const lv = levelForElo(ME_ELO);
  const lp = levelProgress(ME_ELO);

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        large
        title="Profil"
        actionIcon="settings"
        onAction={() => router.push('/settings' as never)}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 16,
            flexDirection: 'row',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <LevelRing name={name} elo={ME_ELO} size={82} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              className="flex-row items-center"
              style={{ gap: 7, flexWrap: 'wrap' }}
            >
              <Text
                className="font-display font-extrabold text-text"
                style={{ fontSize: 21, letterSpacing: -0.42 }}
                numberOfLines={1}
              >
                {name}
              </Text>
              <View
                className="bg-surface-2 rounded-pill"
                style={{ paddingHorizontal: 7, paddingVertical: 2 }}
              >
                <Text
                  className="font-sans font-semibold text-text-3"
                  style={{ fontSize: 11.5 }}
                >
                  {pronoun}
                </Text>
              </View>
            </View>
            <View
              className="flex-row items-center"
              style={{ marginTop: 5, gap: 6 }}
            >
              <LevelIcon level={lv} size={16} />
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 13.5, color: lv.color }}
              >
                {lv.name}
              </Text>
            </View>
            <Text
              className="font-sans text-text-3"
              style={{ fontSize: 12.5, marginTop: 3 }}
            >
              {dept} · {year}. sınıf · {hand} el
            </Text>
            {lp.next && (
              <View style={{ marginTop: 7, maxWidth: 210 }}>
                <View
                  style={{
                    height: 5,
                    backgroundColor: colors.surface3,
                    borderRadius: 9999,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${Math.round(lp.pct * 100)}%`,
                      height: '100%',
                      backgroundColor: lv.color,
                    }}
                  />
                </View>
                <Text
                  className="font-sans font-bold text-text-3"
                  style={{ fontSize: 10.5, marginTop: 4 }}
                >
                  {lp.next.name}&rsquo;e {lp.toNext} ELO
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Vitrin Rozetleri */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <View
            className="flex-row items-center justify-between"
            style={{ marginBottom: 8 }}
          >
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 12, letterSpacing: 0.6 }}
            >
              VİTRİN ROZETLERİ
            </Text>
            <Pressable onPress={() => router.push('/profile/badges' as never)}>
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 12.5, color: colors.clay }}
              >
                Düzenle
              </Text>
            </Pressable>
          </View>
          <View className="flex-row" style={{ gap: 10 }}>
            {MY_BADGES.map((b) => (
              <View
                key={b.key}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  padding: 12,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                }}
              >
                <Icon name={b.icon} size={22} color={b.color} />
                <Text
                  className="font-sans font-bold text-text-2"
                  style={{
                    fontSize: 10.5,
                    marginTop: 6,
                    textAlign: 'center',
                    lineHeight: 13,
                  }}
                >
                  {b.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tab strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingBottom: 12,
            gap: 6,
          }}
          style={{ borderBottomWidth: 1, borderColor: colors.surface3 }}
        >
          {TABS.map((t) => {
            const active = t.key === 'rank';
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  if (t.key === 'rank') return;
                  if (t.go) router.push(t.go as never);
                }}
                className="rounded-pill"
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  backgroundColor: active ? colors.text : 'transparent',
                }}
              >
                <Text
                  className="font-sans font-bold"
                  style={{
                    fontSize: 13,
                    color: active ? colors.bg : colors.text2,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Rankings list */}
        <View style={{ padding: 18, gap: 12 }}>
          {MY_RANKS.map((r, i) => {
            const theme = THEMES[i % 3] ?? THEMES[0]!;
            const rl = levelForElo(r.elo);
            return (
              <Pressable
                key={r.cat}
                onPress={() =>
                  router.push(`/leaderboard?cat=${r.cat}` as never)
                }
                style={{
                  backgroundColor: theme.bg,
                  borderRadius: 26,
                  borderWidth: 1.5,
                  borderColor: colors.borderStrong,
                  padding: 20,
                  overflow: 'hidden',
                }}
              >
                <View
                  className="flex-row items-center justify-between"
                  style={{ marginBottom: 18 }}
                >
                  <View
                    style={{
                      backgroundColor: theme.pill,
                      paddingHorizontal: 11,
                      paddingVertical: 5,
                      borderRadius: 9999,
                    }}
                  >
                    <Text
                      className="font-sans font-extrabold"
                      style={{
                        fontSize: 10.5,
                        letterSpacing: 0.84,
                        color: theme.pillFg,
                      }}
                    >
                      {r.label.toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    className="font-num font-extrabold"
                    style={{
                      fontSize: 12.5,
                      color: theme.fg,
                      opacity: 0.9,
                    }}
                  >
                    {r.delta > 0 ? '▲ ' : r.delta < 0 ? '▼ ' : '– '}
                    {Math.abs(r.delta)}
                  </Text>
                </View>
                <View className="flex-row items-end justify-between">
                  <View>
                    <Text
                      className="font-num font-display font-extrabold"
                      style={{ fontSize: 40, lineHeight: 40, color: theme.fg }}
                    >
                      #{r.rank}
                    </Text>
                    <View
                      className="flex-row items-center"
                      style={{ gap: 6, marginTop: 8 }}
                    >
                      <LevelIcon level={rl} size={15} />
                      <Text
                        className="font-sans font-bold"
                        style={{ fontSize: 13, color: theme.sub }}
                      >
                        {rl.name}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      className="font-sans font-bold"
                      style={{ fontSize: 11, color: theme.sub, marginBottom: 2 }}
                    >
                      ELO
                    </Text>
                    <Text
                      className="font-num font-display font-extrabold"
                      style={{ fontSize: 30, lineHeight: 30, color: theme.fg }}
                    >
                      {r.elo}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
