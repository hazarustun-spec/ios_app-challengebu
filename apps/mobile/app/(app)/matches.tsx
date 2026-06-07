import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { EmptyState } from '../../components/matches/EmptyState';
import { RequestCard } from '../../components/matches/RequestCard';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import {
  useIncomingMatchRequests,
  useOutgoingMatchRequests,
  type MatchRequestRow,
} from '../../hooks/use-match-requests';
import { useAuthStore } from '../../stores/auth-store';

type Tab = 'incoming' | 'outgoing';

export default function MatchesScreen() {
  const myUserId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<Tab>('incoming');

  const incoming = useIncomingMatchRequests();
  const outgoing = useOutgoingMatchRequests();
  const active = tab === 'incoming' ? incoming : outgoing;

  const data: MatchRequestRow[] = active.data ?? [];

  return (
    <ScreenContainer>
      <View className="mb-3 flex-row border-b border-gray-200">
        <Pressable
          onPress={() => setTab('incoming')}
          className={`flex-1 items-center py-3 ${tab === 'incoming' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={tab === 'incoming' ? 'font-semibold text-primary' : 'text-gray-600'}>
            Gelen ({incoming.data?.filter((r) => r.status === 'pending').length ?? 0})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('outgoing')}
          className={`flex-1 items-center py-3 ${tab === 'outgoing' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={tab === 'outgoing' ? 'font-semibold text-primary' : 'text-gray-600'}>
            Atılan ({outgoing.data?.filter((r) => r.status === 'pending').length ?? 0})
          </Text>
        </Pressable>
      </View>

      {myUserId ? (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              myUserId={myUserId}
              onPress={() => router.push(`/match/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={active.isRefetching}
              onRefresh={() => active.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={tab === 'incoming' ? 'Gelen teklif yok' : 'Atılan teklif yok'}
              message={
                tab === 'incoming'
                  ? 'Birisi sana meydan okuduğunda burada görünecek.'
                  : 'Maç oluşturmak için sağ alttaki + butonuna bas.'
              }
            />
          }
        />
      ) : null}

      <Pressable
        onPress={() => router.push('/create-match')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
      >
        <Text className="text-3xl text-white">+</Text>
      </Pressable>
    </ScreenContainer>
  );
}
