// Active season — Plan 8 Phase F8, live-wired.
//
// Ports the design bundle's `Season` screen to React Native + NativeWind.
// Live data comes from useCurrentSeason (season metadata + countdown) and
// useUpcomingFinaleStatus (phase badge). My standing row uses useMyRankings.
//
// Countdown hero + my standing + finale timeline + bracket CTA + annual
// championship link.

import { useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useCurrentSeason } from '../../hooks/use-current-season';
import { useUpcomingFinaleStatus } from '../../hooks/use-upcoming-finale-status';
import { useMyRankings } from '../../hooks/use-my-rankings';
import { colors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function PulsingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }, animStyle]}
    />
  );
}

const SEASON_NAME_MAP: Record<string, string> = {
  guz: 'Güz',
  bahar: 'Bahar',
  yaz: 'Yaz',
};

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

function buildSeasonLabel(name: string, year: number): string {
  const label = SEASON_NAME_MAP[name] ?? name;
  return `${label} ${year} Sezonu`;
}

function formatDateRange(isoA: string, isoB: string): string {
  const a = new Date(isoA);
  const b = new Date(isoB);
  const fmtShort = (d: Date) =>
    d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return `${fmtShort(a)} – ${fmtShort(b)}`;
}

/** Days until a future ISO date string (0 if in the past). */
function daysUntil(isoTarget: string): number {
  const now = new Date();
  const target = new Date(isoTarget);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

/** Fraction of season elapsed (starts_at → finale_starts_at). Clamped [0, 1]. */
function seasonProgress(startsAt: string, finaleStartsAt: string): number {
  const start = Date.parse(startsAt);
  const end = Date.parse(finaleStartsAt);
  const now = Date.now();
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/** Pick the "primary" ranking row (erkek_tek > kadin_tek > open_tek > first). */
function pickPrimaryRanking(rows: Array<{ category: string; rating: number; rank: number }>) {
  const ORDER = ['erkek_tek', 'kadin_tek', 'open_tek'];
  for (const cat of ORDER) {
    const row = rows.find((r) => r.category === cat);
    if (row) return row;
  }
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Finale timeline — static bracket phase structure
// The specific round dates derive from the live season's finale_starts_at /
// finale_ends_at; no hook provides per-round dates. We surface the overall
// window and label the phases so the list remains consistent with the design.
// ---------------------------------------------------------------------------

const FINALE_PHASES: Array<[string, IconName]> = [
  ['Çeyrek Final', 'flame'],
  ['Yarı Final', 'bolt'],
  ['Final', 'trophy'],
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function Season() {
  const seasonQ = useCurrentSeason();
  const finaleStatusQ = useUpcomingFinaleStatus();
  const rankingsQ = useMyRankings();

  const season = seasonQ.data ?? null;
  const isLoading = seasonQ.isLoading;
  const isError = seasonQ.isError;

  // Derived season values
  const sezonLabel = season ? buildSeasonLabel(season.name, season.year) : 'Sezon';
  const datesRange = season ? formatDateRange(season.starts_at, season.ends_at) : '';
  const finaleDatesRange = season
    ? formatDateRange(season.finale_starts_at, season.finale_ends_at)
    : '';
  const daysLeft = season ? daysUntil(season.finale_starts_at) : null;
  const finalePct = season
    ? seasonProgress(season.starts_at, season.finale_starts_at)
    : 0;

  // My standing
  const myRankings = rankingsQ.data ?? [];
  const primaryRanking = pickPrimaryRanking(myRankings);
  const myRank = primaryRanking?.rank ?? null;
  const myCategoryLabel = primaryRanking
    ? (CATEGORY_LABELS[primaryRanking.category] ?? primaryRanking.category)
    : null;
  const inTop8 = myRank !== null && myRank <= 8;

  const header = (
    <NavHeader
      large
      title={sezonLabel}
      subtitle={season ? `${datesRange} · Aktif ladder` : 'Yükleniyor…'}
      actionIcon="clock"
      onAction={() => router.push('/season/archive' as never)}
    />
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
            Sezon bilgisi yüklenemedi.
          </Text>
          <Pressable onPress={() => seasonQ.refetch()}>
            <Text className="font-sans font-bold" style={{ fontSize: 14, color: colors.court }}>
              Tekrar dene
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!season) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader
          large
          title="Sezon"
          subtitle="Aktif sezon yok"
          actionIcon="clock"
          onAction={() => router.push('/season/archive' as never)}
        />
        <EmptyState
          icon="trophy"
          title="Aktif sezon yok"
          body="Yeni bir sezon açıldığında burada görünecek. Arşive göz atabilirsin."
          action="Arşivi gör"
          onAction={() => router.push('/season/archive' as never)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={seasonQ.isRefetching || rankingsQ.isRefetching}
            onRefresh={() => {
              seasonQ.refetch();
              rankingsQ.refetch();
              finaleStatusQ.refetch();
            }}
            tintColor={colors.clay}
          />
        }
      >
        {/* Countdown hero */}
        <View
          style={{
            borderRadius: 24,
            paddingVertical: 22,
            paddingHorizontal: 24,
            backgroundColor: '#2270BC',
          }}
        >
          {/* Top row: pulsing dot + label | days badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <PulsingDot />
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 12, letterSpacing: 1.92, color: '#FFFFFF' }}
              >
                FİNALE GERİ SAYIM
              </Text>
            </View>
            {daysLeft !== null && (
              <Text
                className="font-num font-bold"
                style={{ fontSize: 13, color: '#FFFFFF' }}
              >
                {daysLeft} gün
              </Text>
            )}
          </View>

          {/* Progress bar: track #13497F, white fill */}
          <View
            style={{
              marginTop: 16,
              height: 9,
              borderRadius: 5,
              backgroundColor: '#13497F',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.round(finalePct * 100)}%`,
                height: '100%',
                backgroundColor: '#FFFFFF',
              }}
            />
          </View>

          {/* Bottom row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }}>
            <Text
              className="font-sans font-semibold"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}
            >
              {sezonLabel} · ladder
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/leaderboard' as never)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <Text className="font-sans font-bold" style={{ fontSize: 13, color: '#FFFFFF' }}>
                Sezona git
              </Text>
              <Icon name="chevR" size={13} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* My standing */}
        {primaryRanking && myRank !== null && myCategoryLabel !== null ? (
          <Pressable
            onPress={() => router.push('/(tabs)/leaderboard' as never)}
            className="flex-row items-center bg-clay-softer rounded-md"
            style={{ padding: 14, gap: 14, borderWidth: 1, borderColor: colors.claySoft }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text className="font-num font-extrabold" style={{ fontSize: 9, color: colors.text3 }}>
                SEN
              </Text>
              <Text className="font-num font-extrabold" style={{ fontSize: 18, color: colors.clay }}>
                {myRank}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="font-sans font-bold text-text" style={{ fontSize: 14.5 }}>
                {myCategoryLabel} · {myRank}. sırada
              </Text>
              <Text className="font-sans text-text-2" style={{ fontSize: 12.5, marginTop: 2 }}>
                {inTop8 ? "Finale için ilk 8'desin 🎯" : "Finale için ilk 8'i zorla"}
              </Text>
            </View>
            <Icon name="chevR" size={18} color={colors.text3} />
          </Pressable>
        ) : null}

        {/* Finale calendar */}
        <Text
          className="font-sans font-extrabold text-text-3"
          style={{ fontSize: 12, letterSpacing: 0.6 }}
        >
          FİNALE TAKVİMİ
        </Text>
        <View
          className="rounded-lg overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          {FINALE_PHASES.map(([phaseName, ic], i) => (
            <View
              key={phaseName}
              className="flex-row items-center"
              style={{
                padding: 14,
                paddingHorizontal: 16,
                gap: 13,
                borderTopWidth: i ? 1 : 0,
                borderColor: colors.surface3,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 14,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={ic} size={18} color={colors.clay} />
              </View>
              <View style={{ flex: 1 }}>
                <Text className="font-sans font-bold text-text" style={{ fontSize: 14.5 }}>
                  {phaseName}
                </Text>
                <Text className="font-sans text-text-3" style={{ fontSize: 12, marginTop: 1 }}>
                  {finaleDatesRange}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Button
          full
          size="lg"
          variant="secondary"
          icon={<Icon name="trophy" size={17} color={colors.text} />}
          onPress={() => router.push('/season/bracket' as never)}
        >
          Finale bracket'ını gör
        </Button>
        <Pressable
          onPress={() => router.push('/season/annual-champion' as never)}
          style={{ paddingVertical: 6, alignItems: 'center' }}
        >
          <Text className="font-sans font-bold" style={{ fontSize: 13.5, color: colors.clay }}>
            Yıllık şampiyonluk yarışı →
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
