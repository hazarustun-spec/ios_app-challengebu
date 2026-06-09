import { Pressable, Text, View } from 'react-native';
import type { AdminUserRow } from '../../hooks/use-admin-users';

interface Props {
  user: AdminUserRow;
  onPress: () => void;
}

export function UserRow({ user, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900">
          {user.first_name} {user.last_name}
        </Text>
        <Text className="text-[10px] text-gray-500">{user.email ?? '—'}</Text>
      </View>
      <View>
        {user.role === 'admin' ? (
          <Text className="text-[10px] font-bold text-amber-700">ADMIN</Text>
        ) : null}
        {user.status && user.status !== 'active' ? (
          <Text className="text-[10px] text-gray-500">{user.status}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
