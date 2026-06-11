// Admin · Kullanıcılar — Plan 8 Phase G (screen 53 in screens-admin.jsx).
//
// Searchable user list. Each row is `[Avatar | name + sub | dots]` and taps
// through to the user-detail screen, which is where the multi-duration
// suspend sheet now lives (the design source's bottom-sheet user actions
// were rolled into the detail page so the resolve flow shares a stable
// React tree with the auth store).

import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { NavHeader } from '../../components/ui/NavHeader';
import { SearchBar } from '../../components/ui/SearchBar';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAdminUsers, type AdminUserRow } from '../../hooks/use-admin-users';
import { colors } from '../../theme/colors';

const STATUS_LABEL: Record<string, string> = {
  active: 'aktif',
  suspended: 'askıda',
  banned: 'banlı',
};

export default function AdminUsersScreen() {
  const [search, setSearch] = useState('');
  const list = useAdminUsers(search.trim().length > 0 ? search.trim() : null);
  const data = list.data ?? [];

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Kullanıcılar"
        subtitle={data.length > 0 ? `${data.length} oyuncu` : undefined}
        onBack={() => router.back()}
      />
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Oyuncu ara…"
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        renderItem={({ item }) => <UserRow user={item} />}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => list.refetch()}
            tintColor={colors.text3}
          />
        }
        ListEmptyComponent={
          list.isLoading ? null : (
            <EmptyState
              icon="search"
              title="Kullanıcı bulunamadı"
              body={search ? 'Aramayı temizleyip tekrar dene.' : 'Henüz oyuncu yok.'}
            />
          )
        }
      />
    </View>
  );
}

function UserRow({ user }: { user: AdminUserRow }) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  const statusLabel =
    user.status && user.status !== 'active'
      ? STATUS_LABEL[user.status] ?? user.status
      : null;
  return (
    <Pressable
      onPress={() => router.push(`/(admin)/users/${user.user_id}`)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        borderRadius: 14,
      }}
    >
      <Avatar name={fullName} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <Text
            className="font-sans font-bold text-text"
            style={{ fontSize: 14 }}
            numberOfLines={1}
          >
            {fullName}
          </Text>
          {user.role === 'admin' && (
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: colors.text,
              }}
            >
              <Text
                className="font-sans font-extrabold"
                style={{ fontSize: 9, color: colors.bg, letterSpacing: 0.6 }}
              >
                ADMIN
              </Text>
            </View>
          )}
          {statusLabel && (
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: colors.warnSoft,
              }}
            >
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 9.5, color: colors.warn, letterSpacing: 0.4 }}
              >
                {statusLabel.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text
          className="font-sans text-text-3"
          style={{ fontSize: 12, marginTop: 1 }}
          numberOfLines={1}
        >
          {user.email ?? '—'}
        </Text>
      </View>
      <Icon name="dots" size={18} color={colors.text3} />
    </Pressable>
  );
}
