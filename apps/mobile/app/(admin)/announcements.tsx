import { router } from 'expo-router';
import { FlatList, RefreshControl, Text } from 'react-native';
import { AnnouncementCard } from '../../components/admin/AnnouncementCard';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAdminAnnouncements } from '../../hooks/use-admin-announcements';

export default function AdminAnnouncementsScreen() {
  const list = useAdminAnnouncements();
  return (
    <ScreenContainer>
      <Button onPress={() => router.push('/(admin)/announcements/new')}>Yeni duyuru</Button>
      <FlatList
        className="mt-3"
        data={list.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AnnouncementCard announcement={item} />}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />
        }
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-500">Duyuru yok.</Text>
        }
      />
    </ScreenContainer>
  );
}
