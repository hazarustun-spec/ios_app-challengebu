import { router } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';
import { EmptyState } from '../../components/matches/EmptyState';
import { RequestCard } from '../../components/matches/RequestCard';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useOpenCallsFeed } from '../../hooks/use-open-calls';
import { useAuthStore } from '../../stores/auth-store';

export default function OpenCallsScreen() {
  const myUserId = useAuthStore((s) => s.user?.id);
  const q = useOpenCallsFeed();

  return (
    <ScreenContainer>
      {myUserId ? (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              myUserId={myUserId}
              onPress={() => router.push(`/match/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} />
          }
          ListEmptyComponent={
            <EmptyState
              title="Açık ilan yok"
              message="Birisi açık ilan yayınladığında burada görünecek."
              icon="📢"
            />
          }
        />
      ) : null}
    </ScreenContainer>
  );
}
