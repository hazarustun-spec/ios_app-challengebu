// Admin home — Plan 8 Phase G (screen 49 in screens-admin.jsx).
//
// Six-tile dashboard with a top "ADMIN" pill, a 3-card stat strip, and a
// vertical column of category tiles (each tile = icon chip + title + sub +
// chevron). Counts are live from their respective admin hooks.

import { ScrollView, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Icon, type IconName } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';
import { usePendingDisputes } from '../../hooks/use-pending-disputes';
import { useAdminUsers } from '../../hooks/use-admin-users';
import { useCurrentSeason, type SeasonName } from '../../hooks/use-current-season';
import { useAdminAnnouncements } from '../../hooks/use-admin-announcements';
import { useAdminHealth } from '../../hooks/use-admin-health';
import { useAdminTournaments } from '../../hooks/use-admin-tournaments';

// Maps the DB season name slug to a display label.
const SEASON_LABEL: Record<SeasonName, string> = {
  guz: 'Güz',
  bahar: 'Bahar',
  yaz: 'Yaz',
};

interface TileConfig {
  go: string;
  icon: IconName;
  title: string;
  sub: string;
  color: string;
}

// 13% alpha tint of the icon color (matches the design bundle's
// `color-mix(in srgb, COLOR 13%, transparent)` background).
function tintFor(hex: string): string {
  return hex + '21'; // 0x21 ≈ 33/255 = 13%
}

/** Returns the number of calendar days from now until `isoDate` (0-clamped). */
function daysUntil(isoDate: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Date.parse(isoDate) - Date.now();
  return Math.max(0, Math.ceil(diff / msPerDay));
}

export default function AdminHome() {
  const disputesQ = usePendingDisputes();
  // useAdminUsers caps results at 50; use useAdminHealth.totalUsers for the
  // uncapped profile count in the stat strip and Kullanıcılar tile.
  const usersQ = useAdminUsers(null);
  const seasonQ = useCurrentSeason();
  const announcementsQ = useAdminAnnouncements();
  const healthQ = useAdminHealth();
  const tournamentsQ = useAdminTournaments();

  // ── Derived counts (all default to "—" while still loading) ──────────────

  const disputeCount: string =
    disputesQ.data != null ? String(disputesQ.data.length) : '—';

  // Prefer the uncapped totalUsers from the health hook; fall back to the
  // capped useAdminUsers result if health is still loading.
  const userCount: string =
    healthQ.data != null
      ? String(healthQ.data.totalUsers)
      : usersQ.data != null
      ? String(usersQ.data.length)
      : '—';

  // Days left in the current season (until ends_at).
  const daysLeft: string =
    seasonQ.data != null ? `${daysUntil(seasonQ.data.ends_at)}g` : '—';

  // Season tile sub: "Güz · aktif" / "Bahar · final" / "—"
  const seasonSub: string =
    seasonQ.data != null
      ? `${SEASON_LABEL[seasonQ.data.name] ?? seasonQ.data.name} · ${seasonQ.data.status}`
      : '—';

  // Only count announcements that have been published (published_at is set).
  const publishedCount: string =
    announcementsQ.data != null
      ? String(announcementsQ.data.filter((a) => a.published_at != null).length)
      : '—';

  // Health "warnings" = open disputes + pending match requests.
  const warningCount: string =
    healthQ.data != null
      ? String(healthQ.data.openDisputeCount + healthQ.data.pendingMatchRequestCount)
      : '—';

  // Bracket tile: summarise tournament states for the current season.
  // Shows "<N> turnuva" while loading; shows status if tournaments exist.
  const bracketSub: string = (() => {
    if (!tournamentsQ.data) return '—';
    const ts = tournamentsQ.data;
    if (ts.length === 0) return 'Turnuva yok';
    const inProgress = ts.filter((t) => t.status === 'in_progress').length;
    if (inProgress > 0) return `${inProgress} devam ediyor`;
    const seeded = ts.filter((t) => t.status === 'seeded').length;
    if (seeded > 0) return `${seeded} seed bekleniyor`;
    return `${ts.length} tamamlandı`;
  })();

  // ── Static tile definitions (sub strings computed from live data) ─────────

  const TILES: TileConfig[] = [
    {
      go: '/(admin)/disputes',
      icon: 'flag',
      title: 'Bekleyen İtirazlar',
      sub: `${disputeCount} bekliyor`,
      color: colors.loss,
    },
    {
      go: '/(admin)/seasons',
      icon: 'trophy',
      title: 'Sezon Yönetimi',
      sub: seasonSub,
      color: colors.clay,
    },
    {
      go: '/(admin)/tournaments',
      icon: 'ranking',
      title: 'Bracket Düzenle',
      sub: bracketSub,
      color: colors.info,
    },
    {
      go: '/(admin)/users',
      icon: 'user',
      title: 'Kullanıcılar',
      sub: `${userCount} oyuncu`,
      color: colors.win,
    },
    {
      go: '/(admin)/announcements',
      icon: 'megaphone',
      title: 'Duyurular',
      sub: `${publishedCount} yayında`,
      color: colors.acPurple,
    },
    {
      go: '/(admin)/health',
      icon: 'settings',
      title: 'Sistem Sağlığı',
      sub: `${warningCount} uyarı`,
      color: colors.warn,
    },
  ];

  const STATS: ReadonlyArray<readonly [string, string]> = [
    [userCount, 'Oyuncu'],
    [disputeCount, 'İtiraz'],
    [daysLeft, 'Sezon kaldı'],
  ];

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Admin Paneli" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        {/* ADMIN pill */}
        <View
          className="flex-row items-center rounded-pill self-start"
          style={{
            paddingHorizontal: 14,
            paddingVertical: 7,
            gap: 8,
            backgroundColor: colors.text,
          }}
        >
          <Icon name="shield" size={15} color={colors.bg} />
          <Text
            className="font-sans font-extrabold"
            style={{ fontSize: 12, color: colors.bg }}
          >
            ADMIN
          </Text>
        </View>

        {/* Stat strip */}
        <View className="flex-row" style={{ gap: 10 }}>
          {STATS.map(([v, l]) => (
            <View
              key={l}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                paddingVertical: 14,
                paddingHorizontal: 6,
                alignItems: 'center',
              }}
            >
              <Text
                className="font-num font-extrabold text-text"
                style={{ fontSize: 22 }}
              >
                {v}
              </Text>
              <Text
                className="font-sans font-semibold text-text-3"
                style={{ fontSize: 11 }}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>

        {/* Tiles */}
        <View style={{ gap: 10 }}>
          {TILES.map((t) => (
            <Pressable
              key={t.go}
              onPress={() => router.push(t.go as never)}
              className="flex-row items-center bg-surface rounded-lg"
              style={{
                padding: 15,
                paddingHorizontal: 16,
                gap: 14,
                borderWidth: 1,
                borderColor: colors.borderStrong,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: tintFor(t.color),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={t.icon} size={21} color={t.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 15.5 }}
                >
                  {t.title}
                </Text>
                <Text
                  className="font-sans text-text-3"
                  style={{ fontSize: 12.5, marginTop: 1 }}
                >
                  {t.sub}
                </Text>
              </View>
              <Icon name="chevR" size={18} color={colors.text3} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
