import { Text, View } from 'react-native';
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
  if (isLoading) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }
  const list = data ?? [];
  if (list.length === 0) {
    return (
      <Text className="mt-4 text-sm text-gray-500">
        Henüz hiçbir kategoride sıralaman yok.
      </Text>
    );
  }
  return (
    <View className="mt-4 gap-2">
      {list.map((r) => (
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
      ))}
    </View>
  );
}
