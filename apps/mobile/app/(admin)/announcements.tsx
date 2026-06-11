// Admin · Duyurular — Plan 8 Phase G (screen 54 in screens-admin.jsx, "Live"
// half).
//
// The "Yeni duyuru" composer keeps its own route at
// `/(admin)/announcements/new` (see ./announcements/new.tsx) — this list
// screen focuses on the live-feed surface. Tap a card to open the composer
// (creates a brand-new announcement; we don't expose an edit flow because
// `useAdminAnnouncements` returns historical records that have already
// shipped push notifications to the community).

import { router } from 'expo-router';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { NavHeader } from '../../components/ui/NavHeader';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  useAdminAnnouncements,
  type PublishedAnnouncement,
} from '../../hooks/use-admin-announcements';
import { colors } from '../../theme/colors';

export default function AdminAnnouncementsScreen() {
  const list = useAdminAnnouncements();
  const data = list.data ?? [];

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Duyurular"
        subtitle={data.length > 0 ? `${data.length} yayında` : undefined}
        onBack={() => router.back()}
        actionIcon="plus"
        onAction={() => router.push('/(admin)/announcements/new')}
      />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <Button
              variant="primary"
              full
              icon={<Icon name="megaphone" size={18} color={colors.text} />}
              onPress={() => router.push('/(admin)/announcements/new')}
            >
              Yeni duyuru
            </Button>
          </View>
        }
        renderItem={({ item }) => <AnnouncementRow item={item} />}
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
              icon="megaphone"
              title="Henüz duyuru yok"
              body="Topluluğa ilk mesajı sen at."
              action="Yeni duyuru"
              onAction={() => router.push('/(admin)/announcements/new')}
            />
          )
        }
      />
    </View>
  );
}

function AnnouncementRow({ item }: { item: PublishedAnnouncement }) {
  const when = item.published_at
    ? new Date(item.published_at).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      })
    : 'Taslak';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        borderRadius: 14,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: colors.acPurple + '21',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="megaphone" size={17} color={colors.acPurple} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          className="font-sans font-bold text-text"
          style={{ fontSize: 14, lineHeight: 19 }}
        >
          {item.title}
        </Text>
        {item.body ? (
          <Text
            className="font-sans text-text-2"
            style={{ fontSize: 12.5, lineHeight: 17, marginTop: 4 }}
            numberOfLines={3}
          >
            {item.body}
          </Text>
        ) : null}
        <Text
          className="font-sans text-text-3"
          style={{ fontSize: 11.5, marginTop: 6 }}
        >
          {when}
        </Text>
      </View>
    </View>
  );
}
