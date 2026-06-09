import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { UserRow } from '../../components/admin/UserRow';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { useAdminUsers } from '../../hooks/use-admin-users';

export default function AdminUsersScreen() {
  const [search, setSearch] = useState('');
  const list = useAdminUsers(search.trim().length > 0 ? search.trim() : null);

  return (
    <ScreenContainer>
      <View className="mb-3">
        <TextField
          label="Ara"
          placeholder="Ad, soyad, email ile ara"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => (
          <UserRow user={item} onPress={() => router.push(`/(admin)/users/${item.user_id}`)} />
        )}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />
        }
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-500">Kullanıcı bulunamadı.</Text>
        }
      />
    </ScreenContainer>
  );
}
