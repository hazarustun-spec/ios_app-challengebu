import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useUnreadCount } from '../../hooks/use-unread-count';

export function NotificationBell() {
  const { data } = useUnreadCount();
  const unread = data ?? 0;
  return (
    <Pressable
      // TODO(plan-7-faz-b): drop the `as never` cast once Expo Router regenerates typed routes for /notifications.
      onPress={() => router.push('/notifications' as never)}
      className="relative h-11 w-11 items-center justify-center"
      accessibilityLabel="Bildirimler"
    >
      <Text className="text-2xl">🔔</Text>
      {unread > 0 ? (
        <View className="absolute right-0 top-0 min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1">
          <Text className="text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : String(unread)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
