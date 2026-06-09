import { router, Stack } from 'expo-router';
import { FlatList, RefreshControl, Text } from 'react-native';
import { DisputeRow } from '../../components/admin/DisputeRow';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { usePendingDisputes } from '../../hooks/use-pending-disputes';
import { useRealtimeChannel } from '../../hooks/use-realtime-channel';
import { queryKeys } from '../../lib/query-keys';

export default function AdminDisputesScreen() {
  const list = usePendingDisputes();
  useRealtimeChannel({
    channelName: 'admin:disputes',
    enabled: true,
    configs: [
      { event: 'INSERT', table: 'disputes' },
      { event: 'UPDATE', table: 'disputes' },
    ],
    invalidateKeys: [queryKeys.admin.pendingDisputes()],
  });

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Bekleyen İtirazlar', headerShown: true }} />
      <FlatList
        data={list.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DisputeRow dispute={item} onPress={() => router.push(`/(admin)/disputes/${item.id}`)} />
        )}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />
        }
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-500">
            Açık itiraz yok.
          </Text>
        }
      />
    </ScreenContainer>
  );
}
