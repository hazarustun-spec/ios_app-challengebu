import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { ActiveMatchCard } from '../../components/matches/ActiveMatchCard';
import { EmptyState } from '../../components/matches/EmptyState';
import { RequestCard } from '../../components/matches/RequestCard';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { SeasonBanner } from '../../components/seasons/SeasonBanner';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useActiveMatches } from '../../hooks/use-active-matches';
import {
  useIncomingMatchRequests,
  useOutgoingMatchRequests,
  type MatchRequestRow,
} from '../../hooks/use-match-requests';
import { useAuthStore } from '../../stores/auth-store';

type Tab = 'active' | 'incoming' | 'outgoing';

export default function MatchesScreen() {
  const myUserId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<Tab>('active');

  const active = useActiveMatches();
  const incoming = useIncomingMatchRequests();
  const outgoing = useOutgoingMatchRequests();

  const activeData = active.data ?? [];
  const incomingData: MatchRequestRow[] = incoming.data ?? [];
  const outgoingData: MatchRequestRow[] = outgoing.data ?? [];

  const renderActive = () => (
    <FlatList
      data={activeData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ActiveMatchCard
          match={item}
          myUserId={myUserId ?? ''}
          onPress={() => router.push(`/match/${item.id}`)}
        />
      )}
      refreshControl={<RefreshControl refreshing={active.isRefetching} onRefresh={() => active.refetch()} />}
      ListEmptyComponent={
        <EmptyState title="Aktif maçın yok" message="Bir maç teklifi kabul edildiğinde burada görünür." icon="🎾" />
      }
    />
  );

  const renderIncoming = () => (
    <FlatList
      data={incomingData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RequestCard
          request={item}
          myUserId={myUserId ?? ''}
          onPress={() => router.push(`/match/${item.id}`)}
        />
      )}
      refreshControl={<RefreshControl refreshing={incoming.isRefetching} onRefresh={() => incoming.refetch()} />}
      ListEmptyComponent={
        <EmptyState title="Gelen teklif yok" message="Birisi sana meydan okuduğunda burada görünecek." />
      }
    />
  );

  const renderOutgoing = () => (
    <FlatList
      data={outgoingData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RequestCard
          request={item}
          myUserId={myUserId ?? ''}
          onPress={() => router.push(`/match/${item.id}`)}
        />
      )}
      refreshControl={<RefreshControl refreshing={outgoing.isRefetching} onRefresh={() => outgoing.refetch()} />}
      ListEmptyComponent={
        <EmptyState title="Atılan teklif yok" message="Maç oluşturmak için sağ alttaki + butonuna bas." />
      }
    />
  );

  return (
    <ScreenContainer>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">Maçlar</Text>
        <NotificationBell />
      </View>
      <SeasonBanner />
      <View className="mb-3 flex-row border-b border-gray-200">
        <Pressable
          onPress={() => setTab('active')}
          className={`flex-1 items-center py-3 ${tab === 'active' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={tab === 'active' ? 'font-semibold text-primary' : 'text-gray-600'}>
            Aktif ({activeData.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('incoming')}
          className={`flex-1 items-center py-3 ${tab === 'incoming' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={tab === 'incoming' ? 'font-semibold text-primary' : 'text-gray-600'}>
            Gelen ({incomingData.filter((r) => r.status === 'pending').length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('outgoing')}
          className={`flex-1 items-center py-3 ${tab === 'outgoing' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={tab === 'outgoing' ? 'font-semibold text-primary' : 'text-gray-600'}>
            Atılan ({outgoingData.filter((r) => r.status === 'pending').length})
          </Text>
        </Pressable>
      </View>

      {myUserId ? (
        tab === 'active' ? renderActive() : tab === 'incoming' ? renderIncoming() : renderOutgoing()
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
