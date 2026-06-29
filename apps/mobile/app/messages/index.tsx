// Messages inbox — Plan 8 UI Redesign.
//
// Standalone route: /messages/index
// Lists all conversations for the current user, sorted newest-first.
// Tapping a row navigates to the thread at /messages/[conversationId].
//
// Data: useConversations() → ConversationListItem[]
// House style mirrors app/notifications.tsx exactly.

import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { NavHeader } from '../../components/ui/NavHeader';
import {
  useConversations,
  type ConversationListItem,
} from '../../hooks/use-conversations';
import { colors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats an ISO timestamp as a short relative label in Turkish. */
function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'şimdi';
  if (diffMin < 60) return `${diffMin}dk`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}sa`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}g`;
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MessagesScreen() {
  const conv = useConversations();
  const items = conv.data ?? [];

  const header = (
    <NavHeader
      large
      title="Mesajlar"
      actionIcon="edit"
      onAction={() => router.push('/messages/new' as never)}
    />
  );

  if (conv.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="mail"
          title="Henüz mesajın yok"
          body="Maç tekliflerinden başlayan konuşmalar burada görünecek."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={conv.isRefetching}
            onRefresh={() => conv.refetch()}
            tintColor={colors.clay}
          />
        }
      >
        {items.map((item) => (
          <ConversationRow key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function ConversationRow({ item }: { item: ConversationListItem }) {
  const hasUnread = item.unreadCount > 0;

  const handlePress = () => {
    router.push({
      pathname: '/messages/[conversationId]',
      params: {
        conversationId: item.id,
        otherUserId: item.otherUserId,
        name: item.otherName,
      },
    } as never);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row"
      style={{
        padding: 12,
        paddingHorizontal: 13,
        gap: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: hasUnread ? colors.claySoft : colors.surface3,
        backgroundColor: hasUnread ? colors.claySofter : colors.surface,
        alignItems: 'center',
      }}
    >
      {/* Avatar */}
      <Avatar
        name={item.otherName}
        size={44}
        uri={item.otherAvatarUrl ?? undefined}
      />

      {/* Name + preview */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          className="font-sans font-semibold text-text"
          style={{ fontSize: 13.5, lineHeight: 19 }}
          numberOfLines={1}
        >
          {item.otherName}
        </Text>
        {!!item.lastPreview && (
          <Text
            className="font-sans text-text-2"
            style={{ fontSize: 12.5, lineHeight: 17, marginTop: 1 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.lastPreview}
          </Text>
        )}
      </View>

      {/* Right column: time + unread dot */}
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text
          className="font-sans font-semibold text-text-3"
          style={{ fontSize: 11.5 }}
        >
          {relativeTime(item.lastMessageAt)}
        </Text>
        {hasUnread && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.pinkDeep,
            }}
          />
        )}
      </View>
    </Pressable>
  );
}
