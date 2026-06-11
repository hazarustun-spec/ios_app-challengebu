// Admin home — Plan 8 Phase G (screen 49 in screens-admin.jsx).
//
// Six-tile dashboard with a top "ADMIN" pill, a 3-card stat strip, and a
// vertical column of category tiles (each tile = icon chip + title + sub +
// chevron). Counts are placeholder strings today; the real `useAdminStats`
// hook will replace them in plan-8-G-polish.

import { ScrollView, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Icon, type IconName } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';

interface TileConfig {
  go: string;
  icon: IconName;
  title: string;
  sub: string;
  color: string;
}

const TILES: TileConfig[] = [
  { go: '/(admin)/disputes',      icon: 'flag',      title: 'Bekleyen İtirazlar', sub: '3 bekliyor',  color: colors.loss },
  { go: '/(admin)/seasons',       icon: 'trophy',    title: 'Sezon Yönetimi',     sub: 'Güz · aktif', color: colors.clay },
  { go: '/(admin)/tournaments',   icon: 'ranking',   title: 'Bracket Düzenle',    sub: 'Top 8 seed',  color: colors.info },
  { go: '/(admin)/users',         icon: 'user',      title: 'Kullanıcılar',       sub: '248 oyuncu',  color: colors.win },
  { go: '/(admin)/announcements', icon: 'megaphone', title: 'Duyurular',          sub: '2 yayında',   color: colors.acPurple },
  { go: '/(admin)/health',        icon: 'settings',  title: 'Sistem Sağlığı',     sub: '1 uyarı',     color: colors.warn },
];

// TODO(plan-8-G-polish): replace with real counts from a useAdminStats hook.
const STATS: ReadonlyArray<readonly [string, string]> = [
  ['248', 'Oyuncu'],
  ['3', 'İtiraz'],
  ['41g', 'Sezon kaldı'],
];

export default function AdminHome() {
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

// 13% alpha tint of the icon color (matches the design bundle's
// `color-mix(in srgb, COLOR 13%, transparent)` background).
function tintFor(hex: string): string {
  return hex + '21'; // 0x21 ≈ 33/255 = 13%
}
