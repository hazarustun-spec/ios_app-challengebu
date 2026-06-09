import { Text, View } from 'react-native';
import type { PublishedAnnouncement } from '../../hooks/use-admin-announcements';

interface Props {
  announcement: PublishedAnnouncement;
}

export function AnnouncementCard({ announcement }: Props) {
  return (
    <View className="mb-2 rounded-lg border border-gray-200 bg-white p-3">
      <Text className="text-sm font-semibold text-gray-900">{announcement.title}</Text>
      <Text className="mt-1 text-xs text-gray-700">{announcement.body}</Text>
      <Text className="mt-1 text-[10px] text-gray-500">
        {announcement.published_at
          ? new Date(announcement.published_at).toLocaleString('tr-TR')
          : 'Yayımlanmadı'}
      </Text>
    </View>
  );
}
