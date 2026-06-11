// Admin · Bekleyen İtirazlar — Plan 8 Phase G (screen 50 in screens-admin.jsx).
//
// Tap a card → /(admin)/disputes/[id] for full resolution flow. The list
// data + realtime subscription are preserved from Plan 7 verbatim.

import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { NavHeader } from '../../components/ui/NavHeader';
import { Icon } from '../../components/ui/Icon';
import { EmptyState } from '../../components/ui/EmptyState';
import { usePendingDisputes, type PendingDispute } from '../../hooks/use-pending-disputes';
import { useRealtimeChannel } from '../../hooks/use-realtime-channel';
import { queryKeys } from '../../lib/query-keys';
import { colors } from '../../theme/colors';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export default function AdminDisputesScreen() {
  const list = usePendingDisputes();
  useRealtimeChannel({
    channelName: 'admin:disputes',
    enabled: true,
    configs: [
      { event: 'INSERT', table: 'disputes' },
      { event: 'UPDATE', table: 'disputes' },
    ],
    invalidateKeys: [queryKeys.admin.pendingDisputes()],
  });

  const data = list.data ?? [];

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Bekleyen İtirazlar"
        subtitle={data.length > 0 ? `${data.length} itiraz karar bekliyor` : undefined}
        onBack={() => router.back()}
      />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => <DisputeCard item={item} />}
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
              icon="check"
              title="Açık itiraz yok"
              body="Tüm uyuşmazlıklar çözüldü."
            />
          )
        }
      />
    </View>
  );
}

function DisputeCard({ item }: { item: PendingDispute }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      {/* Warn-soft header strip */}
      <View
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: colors.warnSoft,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Icon name="flag" size={14} color={colors.warn} />
          <Text
            className="font-sans font-bold"
            style={{ fontSize: 12.5, color: colors.warn }}
            numberOfLines={1}
          >
            {item.reason}
          </Text>
        </View>
        <Text
          className="font-sans font-semibold"
          style={{ fontSize: 11.5, color: colors.text3, marginLeft: 8 }}
        >
          {timeAgo(item.created_at)}
        </Text>
      </View>

      {/* Body */}
      <View style={{ padding: 16 }}>
        <Text
          className="font-sans font-semibold"
          style={{ fontSize: 12, color: colors.text3, marginBottom: 8 }}
        >
          {CATEGORY_LABELS[item.match_category] ?? (item.match_category || 'Maç')}
        </Text>
        <Text
          className="font-sans font-bold"
          style={{ fontSize: 14, color: colors.text }}
        >
          {item.raised_by_name} itiraz açtı
        </Text>
      </View>

      {/* CTA strip */}
      <Pressable
        onPress={() => router.push(`/(admin)/disputes/${item.id}`)}
        style={{
          paddingVertical: 12,
          backgroundColor: colors.surface2,
          borderTopWidth: 1,
          borderTopColor: colors.borderStrong,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Text
          className="font-sans font-bold"
          style={{ fontSize: 13, color: colors.text }}
        >
          İncele ve karar ver
        </Text>
        <Icon name="chevR" size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
}
