import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { NotificationRow } from '../components/notifications/NotificationRow';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useMarkAllRead } from '../hooks/use-mark-all-read';
import { useMarkNotificationRead } from '../hooks/use-mark-notification-read';
import { useNotifications, type NotificationRow as Row } from '../hooks/use-notifications';
import { useUnreadCount } from '../hooks/use-unread-count';
import { useAuthStore } from '../stores/auth-store';

export default function NotificationsScreen() {
  const list = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const { data: unread } = useUnreadCount();
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');

  const handlePress = (n: Row) => {
    if (n.read_at === null) markOne.mutate(n.id);
    const data = n.data ?? {};
    if (typeof data.matchRequestId === 'string') {
      // TODO(plan-7-faz-b): drop the `as never` cast once Expo Router regenerates typed routes for /match-request/[id].
      router.push(`/match-request/${data.matchRequestId}` as never);
      return;
    }
    if (typeof data.matchId === 'string') {
      router.push(`/match/${data.matchId}`);
      return;
    }
    if (typeof data.tournamentId === 'string') {
      router.push(`/tournament/${data.tournamentId}`);
      return;
    }
    if (isAdmin && typeof data.disputeId === 'string') {
      router.push({ pathname: '/(admin)/disputes/[id]', params: { id: data.disputeId } });
      return;
    }
    if (data.action === 'open_admin_seasons' && isAdmin) {
      router.push({ pathname: '/(admin)/seasons' });
      return;
    }
    // Category-based fallback: payload-less notifications still navigate
    // somewhere sensible instead of just turning read.
    switch (n.category) {
      case 'badges':
      case 'elo_and_ranking':
      case 'season_and_tournament':
        router.push('/(app)/profile');
        return;
      case 'match_proposals':
      case 'match_reminders':
      case 'score_confirmations':
      case 'inactivity_warning':
        router.push('/(app)/matches');
        return;
      case 'community_announcements':
      default:
        // Stay on the notification center — there's no community feed yet.
        return;
    }
  };

  return (
    <ScreenContainer>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900">Bildirimler</Text>
        <Pressable onPress={() => markAll.mutate()} disabled={(unread ?? 0) === 0}>
          <Text className={`text-xs ${(unread ?? 0) === 0 ? 'text-gray-400' : 'text-primary'}`}>
            Tümünü okundu işaretle
          </Text>
        </Pressable>
      </View>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow row={item} onPress={() => handlePress(item)} />}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />}
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-500">Bildirim yok.</Text>
        }
        ListFooterComponent={
          <Text className="mt-4 text-center text-[10px] text-gray-400">
            30 günden eski bildirimler otomatik silinir.
          </Text>
        }
      />
    </ScreenContainer>
  );
}
