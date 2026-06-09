import { Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAdminHealth } from '../../hooks/use-admin-health';
import { useAuditLog } from '../../hooks/use-audit-log';

export default function AdminHealthScreen() {
  const { data, isLoading, refetch, isRefetching } = useAdminHealth();
  const audit = useAuditLog(20);

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
        {isRefetching ? 'Yenileniyor...' : 'İstatistikleri yenile'}
      </Text>

      <Text className="mt-6 mb-2 text-base font-semibold text-gray-900">Son işlemler</Text>
      {(audit.data ?? []).length === 0 ? (
        <Text className="text-xs text-gray-500">Audit kaydı yok.</Text>
      ) : (
        (audit.data ?? []).map((row) => (
          <View key={row.id} className="mb-2 rounded-lg border border-gray-200 bg-white p-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-gray-900">{row.action}</Text>
              <Text className="text-[10px] text-gray-500">
                {new Date(row.created_at).toLocaleString('tr-TR')}
              </Text>
            </View>
            <Text className="mt-1 text-[10px] text-gray-600">
              {row.actor_name ?? row.actor_id ?? 'sistem'} · {row.entity_type}
              {row.entity_id ? ` #${row.entity_id.slice(0, 8)}` : ''}
            </Text>
          </View>
        ))
      )}
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
