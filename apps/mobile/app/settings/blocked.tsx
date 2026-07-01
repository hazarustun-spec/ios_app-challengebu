// Blocked users — list + unblock.
//
// Lets a user see who they've blocked and undo it. Required alongside the
// in-thread Block action for App Store Guideline 1.2 (user-to-user messaging
// must offer block AND a way to reverse it).

import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useBlockedUsers, useUnblockUser } from '../../hooks/use-moderation';
import { colors } from '../../theme/colors';

export default function BlockedUsers() {
  const { data, isLoading, isError, refetch } = useBlockedUsers();
  const unblock = useUnblockUser();

  const header = (
    <NavHeader
      large
      title="Engellenen kullanıcılar"
      subtitle="Engeli buradan kaldırabilirsin"
      onBack={() => router.back()}
    />
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="ban"
          title="Yüklenemedi"
          body="Engellenen kullanıcılar getirilemedi."
          action="Tekrar dene"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="ban"
          title="Engellenen kullanıcı yok"
          body="Bir kullanıcıyı engellersen burada görünür ve dilediğinde engeli kaldırabilirsin."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
        {data.map((u) => (
          <View
            key={u.blockedId}
            className="flex-row items-center bg-surface rounded-lg"
            style={{ padding: 14, gap: 12, borderWidth: 1.5, borderColor: colors.borderStrong }}
          >
            <Avatar name={u.name} uri={u.avatarUrl ?? undefined} size={44} />
            <Text
              className="font-display font-bold text-text"
              style={{ flex: 1, fontSize: 15 }}
              numberOfLines={1}
            >
              {u.name}
            </Text>
            <Button
              variant="secondary"
              size="sm"
              loading={unblock.isPending && unblock.variables?.blockedId === u.blockedId}
              onPress={() => unblock.mutate({ blockedId: u.blockedId })}
            >
              Engeli kaldır
            </Button>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
