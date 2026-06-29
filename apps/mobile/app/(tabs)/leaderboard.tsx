// apps/mobile/app/(tabs)/leaderboard.tsx — Plan 8 Phase F (F13), live-wired.
//
// Sıralama TAB screen. Lives directly in the tab bar so it switches instantly
// like the other tabs (previously it was a placeholder that pushed a stack
// route, which made it slide in as a separate page — inconsistent UX).
//
// Wired to live Supabase data via useLadder(category), useCurrentSeason,
// useMyRankings, useAuthStore. Reads an optional `cat` param so deep-links
// from the profile screen open the right category.
//
// Sections (top → bottom):
//   - Large NavHeader (title + subtitle + filter action) — no back (it's a tab)
//   - Category chip strip (Erkek Tek / Open Tek / Erkek Çift / ...)
//   - Finale countdown hero (court blue, days remaining)
//   - Sticky "Sen" bar (appears once we scroll past 210px)
//   - My standing card (outlined, with avatar + ELO chip)
//   - Top-3 podium strip (2nd left, 1st center elevated, 3rd right)
//   - Rank rows for the rest of the ladder

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ScreenEnter } from '../../components/ui/ScreenEnter';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { LevelIcon } from '../../components/ui/LevelIcon';
import { Icon } from '../../components/ui/Icon';
import { levelForElo } from '../../lib/levels';
import { colors } from '../../theme/colors';
import { useLadder, type LadderRow } from '../../hooks/use-ladder';
import { useMyRankings } from '../../hooks/use-my-rankings';
import { useCurrentSeason } from '../../hooks/use-current-season';
import { useAuthStore } from '../../stores/auth-store';
import {
  useLeaderboardFilterStore,
  applyLadderFilter,
  isFilterActive,
  type LadderFilter,
} from '../../stores/leaderboard-filter-store';

type Cat =
  | 'erkek_tek'
  | 'kadin_tek'
  | 'open_tek'
  | 'erkek_cift'
  | 'kadin_cift'
  | 'karma_cift'
  | 'open_cift';

const CAT_CHIPS: Array<{ key: Cat; label: string }> = [
  { key: 'erkek_tek', label: 'Erkek Tek' },
  { key: 'kadin_tek', label: 'Kadın Tek' },
  { key: 'open_tek', label: 'Open Tek' },
  { key: 'erkek_cift', label: 'Erkek Çift' },
  { key: 'kadin_cift', label: 'Kadın Çift' },
  { key: 'karma_cift', label: 'Karma Çift' },
  { key: 'open_cift', label: 'Open Çift' },
];

const CAT_KEYS = new Set<string>(CAT_CHIPS.map((c) => c.key));

// Podium medal colors: 1st = gold, 2nd = silver, 3rd = bronze. Indexed by
// 0-based rank so rows[0] (rank 1) gets PODIUM_COLORS[0].
const PODIUM_COLORS = ['#C9982E', '#9AA0A6', '#B0743A'];

const SEASON_NAME_MAP: Record<string, string> = {
  guz: 'Güz',
  bahar: 'Bahar',
  yaz: 'Yaz',
};

/** Days until a future ISO date string (0 if in the past). */
function daysUntil(isoTarget: string): number {
  const now = new Date();
  const target = new Date(isoTarget);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

/** Build a season label like "Güz Sezonu". */
function seasonLabel(name: string, year: number): string {
  const label = SEASON_NAME_MAP[name] ?? name;
  return `${label} ${year} Sezonu`;
}

export default function Leaderboard() {
  const params = useLocalSearchParams<{ cat?: string }>();
  const [cat, setCat] = useState<Cat>(
    params.cat && CAT_KEYS.has(params.cat) ? (params.cat as Cat) : 'erkek_tek',
  );
  const [stuck, setStuck] = useState(false);

  // Honour a `cat` deep-link (e.g. from the profile screen) even when the tab
  // is already mounted.
  useEffect(() => {
    if (params.cat && CAT_KEYS.has(params.cat)) setCat(params.cat as Cat);
  }, [params.cat]);

  const userId = useAuthStore((s) => s.user?.id);
  const profile = useAuthStore((s) => s.profile);

  const { rows, isLoading, isError, isRefetching, refetch } = useLadder(cat);
  const myRankingsQ = useMyRankings();
  const seasonQ = useCurrentSeason();

  // Filter store — read all filter fields as a stable object for useMemo.
  const eloMin = useLeaderboardFilterStore((s) => s.eloMin);
  const eloMax = useLeaderboardFilterStore((s) => s.eloMax);
  const availability = useLeaderboardFilterStore((s) => s.availability);
  const showFrozen = useLeaderboardFilterStore((s) => s.showFrozen);
  const showHibernating = useLeaderboardFilterStore((s) => s.showHibernating);

  const filter: LadderFilter = useMemo(
    () => ({ eloMin, eloMax, availability, showFrozen, showHibernating }),
    [eloMin, eloMax, availability, showFrozen, showHibernating],
  );

  const filtered = useMemo(() => applyLadderFilter(rows, filter), [rows, filter]);
  const filterOn = isFilterActive(filter);

  const season = seasonQ.data ?? null;
  const daysLeft = season?.finale_starts_at ? daysUntil(season.finale_starts_at) : null;
  const sezonLabel = season ? seasonLabel(season.name, season.year) : 'Sezon';

  // Compute my rank per category from useMyRankings for the chip strip badges.
  const myRankingMap: Partial<Record<Cat, number>> = {};
  for (const r of myRankingsQ.data ?? []) {
    if (CAT_KEYS.has(r.category)) {
      myRankingMap[r.category as Cat] = r.rank;
    }
  }

  // Find the current user's row in the FULL (unfiltered) ladder so the "Sen"
  // standing card always shows the user's real standing regardless of filters.
  const meRow: LadderRow | undefined = userId
    ? rows.find((r) => r.profileId === userId)
    : undefined;

  const meName =
    profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : meRow
      ? `${meRow.firstName} ${meRow.lastName}`.trim()
      : 'Sen';

  // Podium: top 3 of the filtered set; rest: 4th onward of the filtered set.
  const podiumRows = filtered.slice(0, 3);
  const restRows = filtered.slice(3);

  // Progress bar: fraction of season elapsed (starts_at → finale_starts_at).
  let progressPct = 0.7; // fallback
  if (season) {
    const start = Date.parse(season.starts_at);
    const end = Date.parse(season.finale_starts_at);
    const now = Date.now();
    if (end > start) {
      progressPct = Math.min(1, Math.max(0, (now - start) / (end - start)));
    }
  }

  const header = (
    <View style={{ position: 'relative' }}>
      <NavHeader
        large
        title="Sıralama"
        subtitle={
          daysLeft !== null
            ? `${sezonLabel} · ${daysLeft} gün kaldı`
            : sezonLabel
        }
        actionIcon="filter"
        onAction={() =>
          router.push((`/leaderboard/filter?cat=${cat}`) as never)
        }
      />
      {/* Filter-active indicator dot — shown when a non-default filter is set */}
      {filterOn && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 14,
            right: 18,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.court,
          }}
        />
      )}
    </View>
  );

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
        <View className="flex-1 items-center justify-center" style={{ gap: 12 }}>
          <Text className="font-sans text-text-3" style={{ fontSize: 14 }}>
            Sıralama yüklenemedi.
          </Text>
          <Pressable onPress={() => refetch()}>
            <Text className="font-sans font-bold" style={{ fontSize: 14, color: colors.court }}>
              Tekrar dene
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScreenEnter className="flex-1 bg-bg">
      {header}

      {/* Category chip strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 6,
          paddingBottom: 14,
          gap: 8,
        }}
      >
        {CAT_CHIPS.map((c) => {
          const on = c.key === cat;
          const myr = myRankingMap[c.key];
          return (
            <Pressable
              key={c.key}
              onPress={() => setCat(c.key)}
              className="flex-row items-center rounded-pill"
              style={{
                paddingHorizontal: 15,
                minHeight: 38,
                gap: 7,
                borderWidth: 1.5,
                borderColor: on ? 'transparent' : colors.borderStrong,
                backgroundColor: on ? colors.text : colors.surface,
              }}
            >
              <Text
                className="font-sans font-bold"
                style={{
                  fontSize: 13.5,
                  lineHeight: 18,
                  color: on ? colors.bg : colors.text2,
                }}
              >
                {c.label}
              </Text>
              {myr !== undefined && (
                <View
                  className="rounded-pill"
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    backgroundColor: on ? '#FFFFFF' : colors.surface2,
                  }}
                >
                  <Text
                    className="font-num font-extrabold"
                    style={{
                      fontSize: 10.5,
                      color: on ? colors.court : colors.text3,
                    }}
                  >
                    #{myr}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Finale countdown banner */}
      <Pressable
        onPress={() => router.push('/season' as never)}
        className="bg-court rounded-lg overflow-hidden"
        style={{
          marginHorizontal: 14,
          marginTop: 8,
          padding: 14,
          borderWidth: 1.5,
          borderColor: colors.borderStrong,
        }}
      >
        <View
          style={{
            position: 'absolute',
            right: -28,
            bottom: -36,
            opacity: 0.12,
          }}
          pointerEvents="none"
        >
          <Icon name="trophy" size={150} color="#FFFFFF" stroke={1.6} />
        </View>
        <View
          className="flex-row items-center justify-between"
          style={{ marginBottom: 9 }}
        >
          <View className="flex-row items-center" style={{ gap: 7 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#FFFFFF',
              }}
            />
            <Text
              className="font-extrabold"
              style={{
                fontSize: 10.5,
                letterSpacing: 1.26,
                color: 'rgba(255,255,255,0.72)',
              }}
            >
              FİNALE GERİ SAYIM
            </Text>
          </View>
          {meRow && meRow.rank <= 8 && (
            <View
              style={{
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.55)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 9999,
              }}
            >
              <Text
                className="text-white font-extrabold"
                style={{ fontSize: 10, letterSpacing: 0.6 }}
              >
                İLK 8&apos;DESİN
              </Text>
            </View>
          )}
        </View>
        <View
          className="flex-row items-baseline"
          style={{ gap: 7, marginBottom: 12 }}
        >
          {daysLeft !== null ? (
            <>
              <Text
                className="font-num font-extrabold text-white"
                style={{ fontSize: 46, lineHeight: 54, letterSpacing: -1.38 }}
              >
                {daysLeft}
              </Text>
              <Text className="text-white font-extrabold" style={{ fontSize: 17 }}>
                gün
              </Text>
              {season?.finale_starts_at && (
                <Text
                  className="font-bold"
                  style={{
                    fontSize: 12.5,
                    marginLeft: 4,
                    color: 'rgba(255,255,255,0.72)',
                  }}
                >
                  · final {new Date(season.finale_starts_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
              )}
            </>
          ) : (
            <Text
              className="font-num font-extrabold text-white"
              style={{ fontSize: 28, lineHeight: 36 }}
            >
              —
            </Text>
          )}
        </View>
        <View
          style={{
            height: 7,
            backgroundColor: 'rgba(255,255,255,0.22)',
            borderRadius: 9999,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.round(progressPct * 100)}%`,
              height: '100%',
              backgroundColor: '#FFFFFF',
            }}
          />
        </View>
        <View
          className="flex-row justify-between"
          style={{ marginTop: 7 }}
        >
          <Text
            className="font-bold"
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)' }}
          >
            {sezonLabel} · ladder
          </Text>
          <View className="flex-row items-center" style={{ gap: 3 }}>
            <Text className="text-white font-bold" style={{ fontSize: 11 }}>
              Sezona git
            </Text>
            <Icon name="chevR" size={13} color="#FFFFFF" />
          </View>
        </View>
      </Pressable>

      {/* Sticky "Sen" bar — shown when scrolled past 210px */}
      {stuck && meRow && (
        <Pressable
          onPress={() => router.push('/(tabs)/profile' as never)}
          className="flex-row items-center bg-clay-softer rounded-pill"
          style={{
            position: 'absolute',
            top: 200,
            left: 14,
            right: 14,
            zIndex: 6,
            paddingHorizontal: 13,
            paddingVertical: 8,
            gap: 10,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
          }}
        >
          <Text
            className="font-num font-extrabold"
            style={{
              fontSize: 15,
              color: colors.court,
              minWidth: 22,
              textAlign: 'center',
            }}
          >
            #{meRow.rank}
          </Text>
          <Avatar name={meName} size={28} />
          <Text
            className="font-sans font-bold text-text"
            style={{ flex: 1, fontSize: 13 }}
          >
            Sen · sıralamadaki yerin
          </Text>
          <Text
            className="font-num font-extrabold text-text"
            style={{ fontSize: 14 }}
          >
            {meRow.rating}
          </Text>
        </Pressable>
      )}

      <ScrollView
        onScroll={(e) => setStuck(e.nativeEvent.contentOffset.y > 210)}
        scrollEventThrottle={16}
        contentContainerStyle={{ padding: 14, paddingTop: 14, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.clay}
          />
        }
      >
        {/* My standing card — only rendered if current user is in the ladder */}
        {meRow ? (
          <Pressable
            onPress={() => router.push('/(tabs)/profile' as never)}
            className="flex-row items-center bg-surface rounded-lg"
            style={{
              padding: 15,
              gap: 13,
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
            }}
          >
            <View style={{ alignItems: 'center', minWidth: 30 }}>
              <Text
                className="font-sans font-extrabold"
                style={{
                  fontSize: 9.5,
                  letterSpacing: 1.14,
                  color: colors.court,
                }}
              >
                SEN
              </Text>
              <Text
                className="font-num font-extrabold text-text"
                style={{ fontSize: 28, lineHeight: 28 }}
              >
                {meRow.rank}
              </Text>
            </View>
            <Avatar name={meName} size={46} ring={colors.court} />
            <View style={{ flex: 1 }}>
              <Text
                className="font-display font-bold text-text"
                style={{ fontSize: 16 }}
              >
                {meName}
              </Text>
              <View className="flex-row" style={{ gap: 6, marginTop: 5 }}>
                <View
                  className="bg-court rounded-pill"
                  style={{ paddingHorizontal: 9, paddingVertical: 3 }}
                >
                  <Text
                    className="font-num font-extrabold text-white"
                    style={{ fontSize: 11.5 }}
                  >
                    {meRow.rating} ELO
                  </Text>
                </View>
              </View>
            </View>
            <Icon name="chevR" size={18} color={colors.text3} />
          </Pressable>
        ) : (
          // User not ranked in this category — show a muted placeholder
          <View
            className="flex-row items-center bg-surface rounded-lg"
            style={{
              padding: 15,
              gap: 13,
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
            }}
          >
            <View style={{ alignItems: 'center', minWidth: 30 }}>
              <Text
                className="font-sans font-extrabold"
                style={{
                  fontSize: 9.5,
                  letterSpacing: 1.14,
                  color: colors.text3,
                }}
              >
                SEN
              </Text>
              <Text
                className="font-num font-extrabold"
                style={{ fontSize: 28, lineHeight: 28, color: colors.text3 }}
              >
                —
              </Text>
            </View>
            <Avatar name={meName} size={46} />
            <View style={{ flex: 1 }}>
              <Text
                className="font-display font-bold text-text"
                style={{ fontSize: 16 }}
              >
                {meName}
              </Text>
              <Text
                className="font-sans text-text-3"
                style={{ fontSize: 12, marginTop: 4 }}
              >
                Bu kategoride sıralaman yok.
              </Text>
            </View>
          </View>
        )}

        {/* Empty state for the list (based on filtered count) */}
        {filtered.length === 0 ? (
          <Text
            className="font-sans text-text-3"
            style={{ fontSize: 13, textAlign: 'center', paddingVertical: 24 }}
          >
            Bu kategoride henüz sıralama yok.
          </Text>
        ) : (
          <>
            {/* Top-3 podium — 2nd left, 1st center (elevated), 3rd right */}
            {podiumRows.length >= 1 && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                {([1, 0, 2] as const).map((order) => {
                  const p = podiumRows[order];
                  if (!p) return null;
                  const lv = levelForElo(p.rating);
                  const podiumIdx = order;
                  const name = `${p.firstName} ${p.lastName}`.trim();
                  return (
                    <Pressable
                      key={p.profileId}
                      onPress={() => router.push(`/user/${p.profileId}` as never)}
                      style={{
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderRadius: 18,
                        padding: 12,
                        paddingHorizontal: 8,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: colors.borderStrong,
                        marginTop: order === 0 ? 0 : 10,
                        position: 'relative',
                      }}
                    >
                      <View
                        style={{
                          position: 'absolute',
                          top: -8,
                          left: '50%',
                          marginLeft: -11,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: PODIUM_COLORS[podiumIdx],
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          className="font-num font-extrabold text-white"
                          style={{ fontSize: 11 }}
                        >
                          {podiumIdx + 1}
                        </Text>
                      </View>
                      <View style={{ marginTop: 6, marginBottom: 6 }}>
                        <Avatar
                          name={name}
                          size={order === 0 ? 52 : 44}
                          ring={order === 0 ? PODIUM_COLORS[0] : undefined}
                        />
                      </View>
                      <Text
                        className="font-sans font-bold text-text"
                        style={{ fontSize: 12.5 }}
                        numberOfLines={1}
                      >
                        {p.firstName}
                      </Text>
                      <Text
                        className="font-num font-bold"
                        style={{ fontSize: 15, color: lv.color, marginTop: 2 }}
                      >
                        {p.rating}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Rest of ranks (4+) */}
            {restRows.length > 0 && (
              <View style={{ gap: 8 }}>
                {restRows.map((p) => {
                  const lv = levelForElo(p.rating);
                  const isMe = p.profileId === userId;
                  const name = `${p.firstName} ${p.lastName}`.trim();
                  return (
                    <Pressable
                      key={p.profileId}
                      onPress={() => router.push(`/user/${p.profileId}` as never)}
                      className="flex-row items-center rounded-md"
                      style={{
                        padding: 11,
                        paddingHorizontal: 12,
                        gap: 10,
                        borderWidth: 1,
                        borderColor: colors.borderStrong,
                        backgroundColor: isMe ? colors.claySofter : colors.surface,
                      }}
                    >
                      <Text
                        className="font-num"
                        style={{
                          fontSize: 16,
                          fontWeight: '700',
                          width: 22,
                          textAlign: 'center',
                          color: colors.text3,
                        }}
                      >
                        {p.rank}
                      </Text>
                      <Avatar name={name} size={42} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          className="font-sans font-bold text-text"
                          style={{ fontSize: 14.5 }}
                        >
                          {name}
                        </Text>
                        <View
                          className="flex-row items-center"
                          style={{ gap: 5, marginTop: 3 }}
                        >
                          <LevelIcon level={lv} size={13} />
                          <Text
                            className="font-sans font-semibold"
                            style={{ fontSize: 12, color: colors.text3 }}
                          >
                            {lv.name}
                          </Text>
                          <Text
                            className="font-sans"
                            style={{ fontSize: 11.5, color: colors.text3 }}
                          >
                            · {p.matchesPlayed} maç
                          </Text>
                        </View>
                      </View>
                      <Text
                        className="font-num font-extrabold"
                        style={{
                          fontSize: 19,
                          color: colors.text,
                          minWidth: 44,
                          textAlign: 'right',
                        }}
                      >
                        {p.rating}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenEnter>
  );
}
