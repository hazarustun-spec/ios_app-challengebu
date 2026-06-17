// Stats — Plan 8 Phase F5, wired to live data.
//
// Ports the design bundle's `Stats` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-profile.jsx
// `function Stats()`) to React Native + NativeWind.
//
// Layout: 2x2 big-stat grid → Win/Loss bar → "Öne çıkanlar" facts list.
//
// Live-data sources:
//   - Win%, total matches, streak, wins/losses: useUserStats (includePrivate=true)
//   - ELO delta tile: useEloHistory — cumulative delta across primary category
//   - Primary category for ELO history: useMyRankings (same logic as home screen)

import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useUserStats } from '../../hooks/use-my-stats';
import { useEloHistory } from '../../hooks/use-elo-history';
import { useMyRankings } from '../../hooks/use-my-rankings';
import { useAuthStore } from '../../stores/auth-store';
import { colors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick primary ranking category — mirrors the home screen logic. */
function pickPrimaryCategory(rows: { category: string; rating: number }[]): string {
  const ORDER = ['erkek_tek', 'kadin_tek', 'open_tek'];
  for (const cat of ORDER) {
    if (rows.find((r) => r.category === cat)) return cat;
  }
  return rows[0]?.category ?? 'erkek_tek';
}

/** Compute cumulative ELO delta for a category: last elo − first eloBefore. */
function computeEloDelta(
  byCategory: Record<string, { elo: number; eloBefore: number }[]>,
  category: string,
): number | null {
  const points = byCategory[category];
  if (!points || points.length === 0) return null;
  // points are sorted ascending by played_at (see use-elo-history.ts slice().reverse())
  const first = points[0];
  const last = points[points.length - 1];
  return last.elo - first.eloBefore;
}

// ---------------------------------------------------------------------------
// Stats screen
// ---------------------------------------------------------------------------

export default function Stats() {
  const userId = useAuthStore((s) => s.user?.id);

  const statsQ = useUserStats(userId, /* includePrivate */ true);
  const rankingsQ = useMyRankings();
  const eloHistoryQ = useEloHistory(userId);

  const isLoading = statsQ.isLoading || rankingsQ.isLoading || eloHistoryQ.isLoading;
  const isError = statsQ.isError || rankingsQ.isError || eloHistoryQ.isError;

  const stats = statsQ.data;
  const rankings = rankingsQ.data ?? [];
  const primaryCat = pickPrimaryCategory(rankings);
  const byCategory = eloHistoryQ.data?.byCategory ?? {};

  const wins = stats?.ratedWins ?? 0;
  const losses = stats?.ratedLosses ?? 0;
  const totalRated = wins + losses;

  const winPct = stats ? `${stats.winPct}%` : '—';
  const totalMatches = stats ? String(stats.totalMatches) : '—';
  const streak = stats ? String(stats.currentStreak) : '—';

  const eloDeltaRaw = computeEloDelta(byCategory, primaryCat);
  const eloDeltaLabel =
    eloDeltaRaw === null
      ? '—'
      : eloDeltaRaw >= 0
        ? `+${eloDeltaRaw}`
        : String(eloDeltaRaw);

  // "Öne çıkanlar" facts — only include rows where data is available.
  type Fact = readonly [IconName, string, string, string];
  const facts: Fact[] = [];

  if (stats?.mostPlayedCourt) {
    facts.push(['pin', 'En sık kort', stats.mostPlayedCourt, '']);
  }
  if (stats?.mostPlayedFormat) {
    facts.push(['spark', 'En sık format', stats.mostPlayedFormat, '']);
  }
  if (stats?.mostFacedOpponent) {
    facts.push([
      'user',
      'En sık rakip',
      stats.mostFacedOpponent.name,
      `${stats.mostFacedOpponent.matches} maç`,
    ]);
  }
  if (stats && stats.currentStreak > 0) {
    facts.push(['flame', 'Mevcut seri', `${stats.currentStreak} galibiyet`, 'devam ediyor']);
  }

  const handleRefetch = () => {
    statsQ.refetch();
    rankingsQ.refetch();
    eloHistoryQ.refetch();
  };

  const isRefetching = statsQ.isRefetching || rankingsQ.isRefetching || eloHistoryQ.isRefetching;

  const header = <NavHeader title="İstatistikler" onBack={() => router.back()} />;

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
          <Text
            className="font-sans font-semibold text-text-3"
            style={{ fontSize: 14, textAlign: 'center' }}
          >
            İstatistikler yüklenemedi. Lütfen tekrar deneyin.
          </Text>
        </View>
      </View>
    );
  }

  const BIG: ReadonlyArray<readonly [string, string]> = [
    [winPct, 'Kazanma oranı'],
    [totalMatches, 'Toplam maç'],
    [streak, 'Mevcut seri'],
    [eloDeltaLabel, 'ELO değişimi'],
  ];

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefetch}
            tintColor={colors.clay}
          />
        }
      >
        {/* Big 2x2 */}
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
        >
          {BIG.map(([v, l]) => (
            <View
              key={l}
              style={{
                width: '48%',
                backgroundColor: colors.surface,
                borderRadius: 26,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                padding: 16,
                paddingHorizontal: 14,
              }}
            >
              <Text
                className="font-num font-extrabold text-text"
                style={{ fontSize: 26, letterSpacing: -0.52 }}
              >
                {v}
              </Text>
              <Text
                className="font-sans font-semibold text-text-3"
                style={{ fontSize: 12.5, marginTop: 2 }}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>

        {/* W/L bar */}
        <View
          className="bg-surface rounded-lg"
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          <View
            className="flex-row justify-between"
            style={{ marginBottom: 10 }}
          >
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 13, color: colors.win }}
            >
              {wins} Galibiyet
            </Text>
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 13, color: colors.loss }}
            >
              {losses} Mağlubiyet
            </Text>
          </View>
          {totalRated === 0 ? (
            <View
              style={{
                height: 12,
                borderRadius: 9999,
                backgroundColor: colors.borderStrong,
              }}
            />
          ) : (
            <View
              className="flex-row"
              style={{ height: 12, borderRadius: 9999, overflow: 'hidden', gap: 2 }}
            >
              <View style={{ flex: wins, backgroundColor: colors.win }} />
              <View style={{ flex: losses, backgroundColor: colors.loss }} />
            </View>
          )}
        </View>

        {/* Section label */}
        <Text
          className="font-sans font-extrabold text-text-3"
          style={{ fontSize: 11, letterSpacing: 0.66 }}
        >
          ÖNE ÇIKANLAR
        </Text>

        {facts.length === 0 ? (
          <Text
            className="font-sans font-semibold text-text-3"
            style={{ fontSize: 13, paddingHorizontal: 4 }}
          >
            Henüz yeterli maç verisi yok.
          </Text>
        ) : (
          <View
            className="rounded-lg overflow-hidden"
            style={{
              borderWidth: 1,
              borderColor: colors.borderStrong,
              backgroundColor: colors.surface,
            }}
          >
            {facts.map(([icon, l, v, sub], i) => (
              <View
                key={l}
                className="flex-row items-center"
                style={{
                  padding: 13,
                  paddingHorizontal: 16,
                  gap: 13,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: colors.surface3,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 14,
                    backgroundColor: colors.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={icon} size={18} color={colors.clay} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    className="font-sans font-semibold text-text-3"
                    style={{ fontSize: 12.5 }}
                  >
                    {l}
                  </Text>
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 15 }}
                  >
                    {v}
                  </Text>
                </View>
                {!!sub && (
                  <Text
                    className="font-sans font-semibold text-text-3"
                    style={{ fontSize: 12 }}
                  >
                    {sub}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
