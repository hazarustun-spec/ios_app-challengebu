import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useYearlyStandings } from '../../hooks/use-yearly-standings';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export default function YearlyChampionshipScreen() {
  const { year } = useLocalSearchParams<{ year: string }>();
  const yearNum = Number(year);
  const validYear = Number.isFinite(yearNum) && yearNum > 1900;
  const { data, isLoading } = useYearlyStandings(validYear ? yearNum : undefined);

  if (!validYear) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Geçersiz yıl.</Text>
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1e3a8a" />
        </View>
      </ScreenContainer>
    );
  }

  const categories = Object.keys(data ?? {});
  if (categories.length === 0) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">{yearNum} için henüz veri yok.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <Text className="mb-3 text-2xl font-bold text-gray-900">🏆 {yearNum}</Text>
      {categories.map((cat) => {
        const standings = data?.[cat] ?? [];
        return (
          <View key={cat} className="mb-5">
            <Text className="mb-2 text-base font-semibold text-gray-900">
              {CATEGORY_LABELS[cat] ?? cat}
            </Text>
            {standings.slice(0, 10).map((s) => (
              <Pressable
                key={`${cat}-${s.profile_id}`}
                onPress={() => router.push(`/user/${s.profile_id}`)}
                className="mb-1 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
              >
                <View className="flex-row items-center">
                  <Text className="w-8 text-sm font-semibold text-gray-500">#{s.rank}</Text>
                  <Text className="text-sm text-gray-900">
                    {s.first_name} {s.last_name}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-gray-700">
                  {s.total_finale_points} puan
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
    </ScreenContainer>
  );
}
