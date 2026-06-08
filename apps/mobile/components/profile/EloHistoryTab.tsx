import { router } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { useEloHistory, type EloPoint } from '../../hooks/use-elo-history';
import { EloHistoryChart } from './EloHistoryChart';

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

export function EloHistoryTab({ userId }: Props) {
  const { data, isLoading } = useEloHistory(userId);
  const byCategory = data?.byCategory ?? {};
  const seasonBoundaries = data?.seasonBoundaries ?? [];
  const categories = Object.keys(byCategory);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const selected = activeCat ?? categories[0] ?? null;

  if (isLoading) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }
  if (categories.length === 0 || !selected) {
    return <Text className="mt-4 text-sm text-gray-500">Henüz ELO geçmişi yok.</Text>;
  }

  const points = byCategory[selected] ?? [];
  const peak = points.length > 0 ? Math.max(...points.map((p) => p.elo)) : 0;
  const current = points.length > 0 ? points[points.length - 1].elo : 0;
  const baseline = points.length > 0 ? points[0].eloBefore : 0;
  const trend = current - baseline;
  const screenWidth = Dimensions.get('window').width - 48;

  return (
    <View className="mt-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {categories.map((cat) => {
          const isActive = cat === selected;
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCat(cat)}
              className={`mr-2 rounded-full px-3 py-1 ${
                isActive ? 'bg-primary' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isActive ? 'text-white' : 'text-gray-700'
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mb-3 flex-row gap-2">
        <SummaryCard label="Tepe" value={String(peak)} />
        <SummaryCard label="Şu an" value={String(current)} />
        <SummaryCard
          label="Trend"
          value={`${trend > 0 ? '+' : ''}${trend}`}
          tone={trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat'}
        />
      </View>

      <EloHistoryChart
        points={points as EloPoint[]}
        seasonBoundaries={seasonBoundaries}
        width={screenWidth}
        height={200}
        onPointPress={(matchId) => router.push(`/match/${matchId}`)}
      />
    </View>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'flat',
}: {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'flat';
}) {
  const color =
    tone === 'up' ? 'text-green-700' : tone === 'down' ? 'text-red-700' : 'text-gray-900';
  return (
    <View className="flex-1 rounded-lg border border-gray-200 bg-white p-2">
      <Text className="text-[10px] text-gray-500">{label}</Text>
      <Text className={`mt-1 text-base font-semibold ${color}`}>{value}</Text>
    </View>
  );
}
