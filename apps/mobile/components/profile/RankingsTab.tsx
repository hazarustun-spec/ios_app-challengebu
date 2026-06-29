import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { getCurrentSeasonWindow } from '@tennis/shared';
import { useUserRankings } from '../../hooks/use-my-rankings';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

interface Props {
  userId: string;
}

export function RankingsTab({ userId }: Props) {
  const { data, isLoading } = useUserRankings(userId);
  const currentYear = getCurrentSeasonWindow().year;

  if (isLoading) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }
  const list = data ?? [];
  return (
    <View className="mt-4 gap-2">
      {list.length === 0 ? (
        <Text className="text-sm text-gray-500">Henüz hiçbir kategoride sıralaman yok.</Text>
      ) : (
        list.map((r) => (
          <View
            key={r.category}
            className="flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
          >
            <Text className="text-base text-gray-900">
              {CATEGORY_LABELS[r.category] ?? r.category}
            </Text>
            <View className="flex-row items-baseline">
              <Text className="text-base font-semibold text-gray-900">{r.rating}</Text>
              <Text className="ml-2 text-sm text-gray-500">#{r.rank}</Text>
            </View>
          </View>
        ))
      )}
      <Pressable
        onPress={() => router.push('/season/annual-champion' as never)}
        className="mt-3 flex-row items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-3"
      >
        <Text className="text-sm font-medium text-amber-900">🏆 Yıllık Şampiyonluk {currentYear}</Text>
        <Text className="text-sm text-amber-700">›</Text>
      </Pressable>
    </View>
  );
}
