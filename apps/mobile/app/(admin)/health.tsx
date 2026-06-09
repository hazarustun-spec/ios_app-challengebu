import { Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAdminHealth } from '../../hooks/use-admin-health';

export default function AdminHealthScreen() {
  const { data, isLoading, refetch, isRefetching } = useAdminHealth();

  if (isLoading || !data) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <Text className="mb-3 text-base font-semibold text-gray-900">Genel</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        <Stat label="Toplam üye" value={data.totalUsers} />
        <Stat label="Aktif üye" value={data.activeUsers} />
        <Stat label="Bugünkü maç" value={data.matchesTodayCount} />
        <Stat label="Açık itiraz" value={data.openDisputeCount} />
        <Stat label="Bekleyen teklif" value={data.pendingMatchRequestCount} />
      </View>
      <Text className="text-xs text-primary" onPress={() => refetch()}>
        {isRefetching ? 'Yenileniyor...' : 'Yenile'}
      </Text>
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="w-[48%] rounded-lg border border-gray-200 bg-white p-3">
      <Text className="text-[10px] text-gray-500">{label}</Text>
      <Text className="mt-1 text-lg font-semibold text-gray-900">{value}</Text>
    </View>
  );
}
