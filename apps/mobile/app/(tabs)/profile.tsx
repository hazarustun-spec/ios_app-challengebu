// Profile tab — Plan 8 Phase F1, wired to live data (F-polish pass).
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
//   - Rankings list: big color-rotated cards (lime / court / ink) that
//     open the category leaderboard.
//
// Live-data sources:
//   - Hero ELO + level: useMyRankings (primary category rating)
//   - ELO delta: useEloHistory (last confirmed match delta for primary cat)
//   - Rankings list: useMyRankings (all categories)
//   - Badges (vitrin): useMyBadges (first 3 pinned, then most recent)
//   - Display name / profile extras: useAuthStore.profile

import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { LevelRing } from '../../components/ui/LevelRing';
import { LevelIcon } from '../../components/ui/LevelIcon';
import { useAuthStore } from '../../stores/auth-store';
import { levelForElo, levelProgress } from '../../lib/levels';
import { colors } from '../../theme/colors';
import { useMyRankings, type RankingRow } from '../../hooks/use-my-rankings';
import { useEloHistory } from '../../hooks/use-elo-history';
import { useMyBadges, type MyBadgeRow } from '../../hooks/use-my-badges';

// ---------------------------------------------------------------------------
// Category label map
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick the "primary" ranking row to show in the hero.
 *  Priority: erkek_tek > kadin_tek > open_tek > first row returned. */
function pickPrimaryCategory(rows: RankingRow[]): RankingRow | null {
  const ORDER = ['erkek_tek', 'kadin_tek', 'open_tek'];
  for (const cat of ORDER) {
    const row = rows.find((r) => r.category === cat);
    if (row) return row;
  }
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Badge vitrin: prefer pinned badges (pinned_at not null), then most recent
// ---------------------------------------------------------------------------

function pickVitrinBadges(badges: MyBadgeRow[]): MyBadgeRow[] {
  const pinned = badges.filter((b) => b.pinned_at !== null).slice(0, 3);
  if (pinned.length >= 3) return pinned;
  const pinnedKeys = new Set(pinned.map((b) => b.user_badge_id));
  const rest = badges.filter((b) => !pinnedKeys.has(b.user_badge_id));
  return [...pinned, ...rest].slice(0, 3);
}

// ---------------------------------------------------------------------------
// ProfileTab
// ---------------------------------------------------------------------------

export default function ProfileTab() {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user?.id);

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

  // --- Rankings ---
  const rankingsQ = useMyRankings();
  const rankings = rankingsQ.data ?? [];
  const primaryRanking = pickPrimaryCategory(rankings);
  const primaryCat = primaryRanking?.category ?? 'erkek_tek';
  const ME_ELO = primaryRanking?.rating ?? 1200;

  // --- ELO history for delta ---
  const eloHistoryQ = useEloHistory(userId);
  const catPoints = (eloHistoryQ.data?.byCategory ?? {})[primaryCat] ?? [];
  const latestPoint = catPoints.length > 0 ? catPoints[catPoints.length - 1] : null;
  const ELO_DELTA = latestPoint ? latestPoint.elo - latestPoint.eloBefore : 0;

  // --- Badges ---
  const badgesQ = useMyBadges();
  const allBadges = badgesQ.data ?? [];
  const vitrinBadges = pickVitrinBadges(allBadges);

  const lv = levelForElo(ME_ELO);
  const lp = levelProgress(ME_ELO);

  const isLoading = rankingsQ.isLoading;

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader
          large
          title="Profil"
          actionIcon="settings"
          onAction={() => router.push('/settings' as never)}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

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
              {dept} · {year ? `${year}. sınıf · ` : ''}{hand} el
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
          {badgesQ.isLoading ? (
            <View style={{ height: 72, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={colors.clay} />
            </View>
          ) : vitrinBadges.length === 0 ? (
            <Text
              className="font-sans text-text-3"
              style={{ fontSize: 12.5, paddingVertical: 8 }}
            >
              Henüz rozet yok.
            </Text>
          ) : (
            <View className="flex-row" style={{ gap: 10 }}>
              {vitrinBadges.map((b) => (
                <View
                  key={b.user_badge_id}
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
                  <Text style={{ fontSize: 22 }}>{b.icon}</Text>
                  <Text
                    className="font-sans font-bold text-text-2"
                    style={{
                      fontSize: 10.5,
                      marginTop: 6,
                      textAlign: 'center',
                      lineHeight: 13,
                    }}
                  >
                    {b.name_tr}
                  </Text>
                </View>
              ))}
            </View>
          )}
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
          {rankings.length === 0 ? (
            <Text
              className="font-sans text-text-3"
              style={{ fontSize: 13, paddingHorizontal: 4 }}
            >
              Henüz sıralama verin yok.
            </Text>
          ) : (
            rankings.map((r, i) => {
              const theme = THEMES[i % 3] ?? THEMES[0]!;
              const rl = levelForElo(r.rating);
              const catLabel = CATEGORY_LABELS[r.category] ?? r.category;
              // ELO delta is only available for the primary category via eloHistoryQ
              const delta = r.category === primaryCat ? ELO_DELTA : 0;
              return (
                <Pressable
                  key={r.category}
                  onPress={() =>
                    router.push(`/leaderboard?cat=${r.category}` as never)
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
                        {catLabel.toUpperCase()}
                      </Text>
                    </View>
                    {r.category === primaryCat && (
                      <Text
                        className="font-num font-extrabold"
                        style={{
                          fontSize: 12.5,
                          color: theme.fg,
                          opacity: 0.9,
                        }}
                      >
                        {delta > 0 ? '▲ ' : delta < 0 ? '▼ ' : '– '}
                        {Math.abs(delta)}
                      </Text>
                    )}
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
                        {r.rating}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
