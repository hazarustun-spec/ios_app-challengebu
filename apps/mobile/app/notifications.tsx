// Notifications screen — Plan 8 Phase G1.
//
// Standalone (non-tab) route reached from the home header bell
// (`(tabs)/index.tsx` → router.push('/notifications')). Ports the design
// source's `Notifs` + `NotifsEmpty` screens (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-notifs.jsx)
// into a single screen with day-grouped sections, wired to live data.
//
// Visual contract:
//   - NavHeader large title + trailing "check" icon action ("tümünü oku"),
//     shown only while there are unread rows.
//   - Day sections labelled BUGÜN / DÜN / DAHA ÖNCE (caps, text-3, tracking).
//   - Each row: category-tinted icon chip + title/body + time + pink-deep dot
//     if unread.
//   - Unread rows get the clay-softer background and clay-soft border so
//     they pop against read rows.
//
// Live data comes from useNotifications(); tapping a row marks it read
// (useMarkNotificationRead) and navigates by payload, then by category. The
// design's avatar/"who" variant is dropped — notifications carry no actor
// name field, so every row uses the category icon chip.

import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon, type IconName } from '../components/ui/Icon';
import { NavHeader } from '../components/ui/NavHeader';
import { useMarkAllRead } from '../hooks/use-mark-all-read';
import { useMarkNotificationRead } from '../hooks/use-mark-notification-read';
import {
  useNotifications,
  type NotificationRow as Row,
} from '../hooks/use-notifications';
import type { NotificationCategory } from '../hooks/use-notification-preferences';
import { useUnreadCount } from '../hooks/use-unread-count';
import { useAuthStore } from '../stores/auth-store';
import { colors } from '../theme/colors';

const CATEGORY_META: Record<
  NotificationCategory,
  { icon: IconName; color: string }
> = {
  match_invitations: { icon: 'bolt', color: colors.clay },
  match_score_pending: { icon: 'check', color: colors.win },
  ladder_movement: { icon: 'ranking', color: colors.info },
  badges_earned: { icon: 'flame', color: colors.lvCaylak },
  season_lifecycle: { icon: 'trophy', color: colors.acGold },
  community_announcements: { icon: 'megaphone', color: colors.acPurple },
  open_listings: { icon: 'handshake', color: colors.win },
  match_reminders: { icon: 'clock', color: colors.warn },
  message_received: { icon: 'mail', color: colors.info },
};

type DayLabel = 'Bugün' | 'Dün' | 'Daha önce';
const DAY_ORDER: DayLabel[] = ['Bugün', 'Dün', 'Daha önce'];

function dayBucket(iso: string, now: Date): DayLabel {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d >= startOfToday) return 'Bugün';
  if (d >= startOfYesterday) return 'Dün';
  return 'Daha önce';
}

function formatTime(iso: string, bucket: DayLabel): string {
  const d = new Date(iso);
  const hhmm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (bucket === 'Bugün') return hhmm;
  if (bucket === 'Dün') return `Dün ${hhmm}`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function groupByDay(rows: Row[]): { label: DayLabel; rows: Row[] }[] {
  const now = new Date();
  const buckets: Record<DayLabel, Row[]> = {
    Bugün: [],
    Dün: [],
    'Daha önce': [],
  };
  // Rows arrive newest-first; preserve that order inside each bucket.
  for (const r of rows) buckets[dayBucket(r.created_at, now)].push(r);
  return DAY_ORDER.filter((label) => buckets[label].length > 0).map((label) => ({
    label,
    rows: buckets[label],
  }));
}

export default function NotificationsScreen() {
  const list = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const { data: unread = 0 } = useUnreadCount();
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');

  const handlePress = (n: Row) => {
    if (n.read_at === null) markOne.mutate(n.id);
    const data = n.data ?? {};

    // Payload-driven navigation takes priority over the category fallback.
    if (typeof data.matchId === 'string') {
      router.push(`/match/${data.matchId}`);
      return;
    }
    if (typeof data.tournamentId === 'string') {
      router.push(`/tournament/${data.tournamentId}`);
      return;
    }
    if (isAdmin && typeof data.disputeId === 'string') {
      router.push({ pathname: '/(admin)/disputes/[id]', params: { id: data.disputeId } });
      return;
    }
    if (data.action === 'open_admin_seasons' && isAdmin) {
      router.push({ pathname: '/(admin)/seasons' });
      return;
    }

    // Category fallback: payload-less notifications still land somewhere sensible.
    switch (n.category) {
      case 'badges_earned':
        router.push('/profile/badges');
        return;
      case 'ladder_movement':
        router.push('/(tabs)');
        return;
      case 'season_lifecycle':
        router.push('/season');
        return;
      case 'match_invitations':
      case 'match_reminders':
      case 'match_score_pending':
      case 'open_listings':
        router.push('/(tabs)/matches');
        return;
      case 'community_announcements':
      default:
        // No community feed yet — stay on the notification center.
        return;
    }
  };

  const rows = list.data ?? [];
  const sections = groupByDay(rows);

  const header = (
    <NavHeader
      large
      title="Bildirimler"
      actionIcon={unread > 0 ? 'check' : undefined}
      onAction={unread > 0 ? () => markAll.mutate() : undefined}
    />
  );

  if (list.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState
          icon="bell"
          title="Henüz bildirim yok"
          body="Maç teklifleri, skor onayları, rozetler ve sezon güncellemeleri burada görünecek."
          action="Maç oluştur"
          onAction={() => router.push('/match/new/type' as never)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 18 }}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => list.refetch()}
            tintColor={colors.clay}
          />
        }
      >
        {sections.map(({ label, rows: dayRows }) => (
          <View key={label} style={{ gap: 6 }}>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 12, letterSpacing: 0.6, paddingLeft: 4 }}
            >
              {label.toUpperCase()}
            </Text>
            {dayRows.map((n) => {
              const m = CATEGORY_META[n.category];
              const unreadRow = n.read_at === null;
              return (
                <Pressable
                  key={n.id}
                  onPress={() => handlePress(n)}
                  className="flex-row"
                  style={{
                    padding: 12,
                    paddingHorizontal: 13,
                    gap: 12,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: unreadRow ? colors.claySoft : colors.surface3,
                    backgroundColor: unreadRow ? colors.claySofter : colors.surface,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      backgroundColor: `${m.color}24`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={m.icon} size={20} color={m.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      className="font-sans font-semibold text-text"
                      style={{ fontSize: 13.5, lineHeight: 19 }}
                    >
                      {n.title}
                    </Text>
                    {!!n.body && (
                      <Text
                        className="font-sans text-text-2"
                        style={{ fontSize: 12.5, lineHeight: 17, marginTop: 1 }}
                      >
                        {n.body}
                      </Text>
                    )}
                    <Text
                      className="font-sans font-semibold text-text-3"
                      style={{ fontSize: 11.5, marginTop: 4 }}
                    >
                      {formatTime(n.created_at, label)}
                    </Text>
                  </View>
                  {unreadRow && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.pinkDeep,
                        marginTop: 5,
                      }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
