// Notifications tab — Plan 8 Phase G1.
//
// Ports the design source's `Notifs` + `NotifsEmpty` screens (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-notifs.jsx)
// to a single tab screen with day-grouped sections.
//
// Visual contract:
//   - NavHeader large title + trailing "check" icon action ("tümünü oku").
//   - Day sections labelled BUGÜN / DÜN / DAHA ÖNCE (caps, text-3, tracking).
//   - Each row: 40px avatar OR icon chip (category tinted) + body + time +
//     pink-deep dot if unread.
//   - Unread rows get the clay-softer background and clay-soft border so
//     they pop against read rows.
//
// TODO(plan-8-G-polish): replace the MOCK day map with the real
// useNotifications() hook + a day-grouping helper, and wire the trailing
// "check" header action to useMarkAllRead(). The legacy Plan 7
// /notifications screen (app/notifications.tsx) still consumes the live
// data — this tab uses mock content until the row schema settles on the
// new category set (Plan 8 A3 already aligned the DB enum, so the
// remaining work is mapping `notifications.data` to the design's
// per-type META icons + colors).

import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon, type IconName } from '../../components/ui/Icon';
import { NavHeader } from '../../components/ui/NavHeader';
import { colors } from '../../theme/colors';

type NotifType =
  | 'offer'
  | 'confirm'
  | 'rank'
  | 'badge'
  | 'season'
  | 'announce'
  | 'listing'
  | 'reminder';

const META: Record<NotifType, { icon: IconName; color: string }> = {
  offer: { icon: 'bolt', color: colors.clay },
  confirm: { icon: 'check', color: colors.win },
  rank: { icon: 'ranking', color: colors.info },
  badge: { icon: 'flame', color: colors.lvCaylak },
  season: { icon: 'trophy', color: colors.acGold },
  announce: { icon: 'megaphone', color: colors.acPurple },
  listing: { icon: 'handshake', color: colors.win },
  reminder: { icon: 'clock', color: colors.warn },
};

interface NotifItem {
  id: string;
  type: NotifType;
  who?: string;
  text: string;
  time: string;
  unread?: boolean;
  go?: string;
}

// TODO(plan-8-G-polish): swap with `useNotifications()` + a `groupByDay`
// helper that bins on local timezone (Europe/Istanbul).
const MOCK: Record<string, NotifItem[]> = {
  Bugün: [
    {
      id: 'n1',
      type: 'offer',
      who: 'Emre Yıldız',
      text: 'sana Sıralama Maçı için meydan okudu',
      time: '14:20',
      unread: true,
      go: '/(tabs)/matches',
    },
    {
      id: 'n2',
      type: 'confirm',
      who: 'Berk Aydın',
      text: 'maç skorunu onayladı · +18 ELO',
      time: '11:05',
      unread: true,
      go: '/(tabs)/matches',
    },
    {
      id: 'n3',
      type: 'badge',
      text: '🔥 "5 Maç Serisi" rozetini kazandın!',
      time: '11:05',
      unread: true,
      go: '/profile/badges',
    },
  ],
  Dün: [
    {
      id: 'n4',
      type: 'rank',
      text: "Erkek Tek'te 5. sıradan 4. sıraya yükseldin",
      time: 'Dün 19:30',
      go: '/(tabs)',
    },
    {
      id: 'n5',
      type: 'listing',
      who: 'Can Öztürk',
      text: 'senin müsaitliğine uygun bir ilan açtı',
      time: 'Dün 16:10',
      go: '/(tabs)/matches',
    },
    {
      id: 'n6',
      type: 'reminder',
      text: 'Yarın 18:30 · Berk Aydın ile maçın var (Kort 1)',
      time: 'Dün 09:00',
      go: '/(tabs)/matches',
    },
  ],
  'Daha önce': [
    {
      id: 'n7',
      type: 'season',
      text: "Finale window 41 gün sonra açılıyor. İlk 8'desin!",
      time: '4 Haz',
      go: '/season' as const,
    },
    {
      id: 'n8',
      type: 'announce',
      text: 'Topluluk: Bahar turnuvası kayıtları başladı 🎾',
      time: '2 Haz',
    },
  ],
};

export default function NotificationsTab() {
  const isEmpty = Object.values(MOCK).every((a) => a.length === 0);

  if (isEmpty) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader large title="Bildirimler" />
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
      <NavHeader
        large
        title="Bildirimler"
        actionIcon="check"
        onAction={() => {
          // TODO(plan-8-G-polish): wire to useMarkAllRead.
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
        {Object.entries(MOCK).map(([day, items]) => (
          <View key={day} style={{ gap: 6 }}>
            <Text
              className="font-sans font-extrabold text-text-3"
              style={{ fontSize: 12, letterSpacing: 0.6, paddingLeft: 4 }}
            >
              {day.toUpperCase()}
            </Text>
            {items.map((n) => {
              const m = META[n.type];
              return (
                <Pressable
                  key={n.id}
                  onPress={() => {
                    if (n.go) router.push(n.go as never);
                  }}
                  className="flex-row"
                  style={{
                    padding: 12,
                    paddingHorizontal: 13,
                    gap: 12,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: n.unread ? colors.claySoft : colors.surface3,
                    backgroundColor: n.unread
                      ? colors.claySofter
                      : colors.surface,
                  }}
                >
                  {n.who ? (
                    <Avatar name={n.who} size={40} />
                  ) : (
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
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      className="font-sans text-text"
                      style={{ fontSize: 13.5, lineHeight: 19 }}
                    >
                      {n.who && (
                        <Text style={{ fontWeight: '700' }}>{n.who} </Text>
                      )}
                      {n.text}
                    </Text>
                    <Text
                      className="font-sans font-semibold text-text-3"
                      style={{ fontSize: 11.5, marginTop: 4 }}
                    >
                      {n.time}
                    </Text>
                  </View>
                  {n.unread && (
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
