// Yıllık Şampiyonluk — Plan 8 Phase F11, live-wired.
//
// Ports the design bundle's `AnnualChamp` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-season.jsx
// `function AnnualChamp()`) to React Native + NativeWind.
//
// Info banner + per-category leaderboard of finale points for the current
// academic year. Rank-1 row in each category is gold-tinted (current leader).
// Graceful empty state if the yearly_championship table has no data yet.
//
// Live data: useYearlyStandings(year) for the standings table;
// useCurrentSeason() to derive the current academic year.

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors } from '../../theme/colors';
import { useCurrentSeason } from '../../hooks/use-current-season';
import { useYearlyStandings, type YearlyStanding } from '../../hooks/use-yearly-standings';

const GOLD = '#C9982E';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

function StandingRow({ item, rank }: { item: YearlyStanding; rank: number }) {
  const isFirst = rank === 1;
  const name = `${item.first_name} ${item.last_name}`.trim();
  return (
    <View
      className="flex-row items-center rounded-md"
      style={{
        padding: 13,
        paddingHorizontal: 14,
        gap: 12,
        backgroundColor: isFirst ? `${GOLD}1F` : colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
      }}
    >
      <Text
        className="font-num font-extrabold"
        style={{
          width: 22,
          textAlign: 'center',
          fontSize: 16,
          color: isFirst ? GOLD : colors.text3,
        }}
      >
        {rank}
      </Text>
      <Avatar name={name} size={40} ring={isFirst ? GOLD : undefined} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View className="flex-row items-center" style={{ gap: 5 }}>
          <Text className="font-sans font-bold text-text" style={{ fontSize: 14.5 }}>
            {name}
          </Text>
          {isFirst && <Icon name="trophy" size={15} color={GOLD} />}
        </View>
      </View>
      <Text
        className="font-num font-extrabold"
        style={{ fontSize: 18, color: isFirst ? GOLD : colors.text }}
      >
        {item.total_finale_points}
      </Text>
    </View>
  );
}

export default function AnnualChamp() {
  const seasonQ = useCurrentSeason();
  const year = seasonQ.data?.year;
  const standingsQ = useYearlyStandings(year);

  const isLoading = seasonQ.isLoading || standingsQ.isLoading;
  const isError = seasonQ.isError || standingsQ.isError;
  const isRefetching = seasonQ.isRefetching || standingsQ.isRefetching;

  const grouped = standingsQ.data ?? {};
  const categoryKeys = Object.keys(grouped).sort();
  const hasData = categoryKeys.length > 0;

  const academicYear = year ? `${year - 1}-${String(year).slice(-2)}` : '—';

  const header = (
    <NavHeader
      title="Yıllık Şampiyonluk"
      subtitle={`${academicYear} · finale puanları`}
      onBack={() => router.back()}
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
            Yıllık sıralama yüklenemedi.
          </Text>
          <Pressable
            onPress={() => {
              standingsQ.refetch();
              seasonQ.refetch();
            }}
          >
            <Text className="font-sans font-bold" style={{ fontSize: 14, color: colors.court }}>
              Tekrar dene
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!hasData) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="trophy"
          title="Henüz sonuç yok"
          body="Sezon finalleri tamamlandığında yıllık şampiyonluk tablosu burada görünecek."
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
            refreshing={isRefetching}
            onRefresh={() => {
              standingsQ.refetch();
              seasonQ.refetch();
            }}
            tintColor={colors.clay}
          />
        }
      >
        {/* Info banner */}
        <View className="flex-row bg-surface-2 rounded-md" style={{ padding: 14, gap: 10 }}>
          <Icon name="info" size={18} color={colors.info} />
          <Text
            className="font-sans text-text-2"
            style={{ flex: 1, fontSize: 12.5, lineHeight: 19 }}
          >
            Her sezon finalinden puan: Şampiyon 100 · Finalist 70 · Yarı F. 50 · Çeyrek F. 25.
            Yıl sonu en yüksek <Text className="font-bold">🏆 Yıllık Şampiyon</Text> olur (kalıcı
            rozet).
          </Text>
        </View>

        {/* Per-category sections */}
        {categoryKeys.map((cat) => {
          const rows = grouped[cat] ?? [];
          const catLabel = CATEGORY_LABELS[cat] ?? cat;
          return (
            <View key={cat} style={{ gap: 8 }}>
              <Text
                className="font-sans font-extrabold text-text-3"
                style={{ fontSize: 12, letterSpacing: 0.6, paddingLeft: 2 }}
              >
                {catLabel.toUpperCase()}
              </Text>
              {rows.map((item) => (
                <StandingRow key={item.profile_id} item={item} rank={item.rank} />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
