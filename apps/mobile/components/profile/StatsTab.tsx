import { Text, View } from 'react-native';
import { useUserStats } from '../../hooks/use-my-stats';

interface Props {
  userId: string;
  isSelf?: boolean;
}

export function StatsTab({ userId, isSelf = false }: Props) {
  const { data, isLoading } = useUserStats(userId, isSelf);
  if (isLoading || !data) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }

  return (
    <View className="mt-4 gap-2">
      <Row label="Toplam maç" value={String(data.totalMatches)} />
      <Row label="Sıralama maçı W-L" value={`${data.ratedWins} - ${data.ratedLosses}`} />
      <Row label="Galibiyet oranı" value={`%${data.winPct}`} />
      <Row label="Mevcut galibiyet serisi" value={String(data.currentStreak)} />
      <Row label="En sık format" value={data.mostPlayedFormat ?? '—'} />
      <Row label="En sık kort" value={data.mostPlayedCourt ?? '—'} />
      {isSelf && (
        <Row
          label="En sık rakip"
          value={
            data.mostFacedOpponent
              ? `${data.mostFacedOpponent.name} (${data.mostFacedOpponent.matches} maç)`
              : '—'
          }
        />
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
      <Text className="text-sm text-gray-600">{label}</Text>
      <Text className="text-base font-semibold text-gray-900">{value}</Text>
    </View>
  );
}
