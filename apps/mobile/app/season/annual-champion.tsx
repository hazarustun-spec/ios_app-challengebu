// Yıllık Şampiyonluk — Plan 8 Phase F11.
//
// Ports the design bundle's `AnnualChamp` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-season.jsx
// `function AnnualChamp()`) to React Native + NativeWind.
//
// Info banner + leaderboard of finale points across all seasons in the
// current academic year. First row is gold-tinted (current leader).
//
// TODO(plan-8-F-polish): replace ROWS static with useAnnualChampionship hook.

import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';

// TODO(plan-8-F-polish): useAnnualChampionship hook
const ROWS: Array<[string, number, string[]]> = [
  ['Kaan Demir', 270, ['Güz Şampiyon', 'Bahar Finalist']],
  ['Emre Yıldız', 190, ['Güz Finalist', 'Yaz Şampiyon']],
  ['Berk Aydın', 145, ['Güz Yarı F.', 'Bahar Yarı F.']],
  ['Mert Şahin', 95, ['Güz Yarı F.']],
  ['Arda Yılmaz', 50, ['Bahar Çeyrek']],
];

const GOLD = '#C9982E';

export default function AnnualChamp() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Yıllık Şampiyonluk"
        subtitle="2025-26 · finale puanları"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <View className="flex-row bg-surface-2 rounded-md" style={{ padding: 14, gap: 10 }}>
          <Icon name="info" size={18} color={colors.info} />
          <Text
            className="font-sans text-text-2"
            style={{ flex: 1, fontSize: 12.5, lineHeight: 19 }}
          >
            Her sezon finalinden puan: Şampiyon 100 · Finalist 70 · Yarı F. 50 · Çeyrek F. 25.
            Yıl sonu en yüksek <Text className="font-bold">🏆 Yıllık Şampiyon</Text> olur (kalıcı
            rozet).
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          {ROWS.map(([n, pts, tags], i) => {
            const isFirst = i === 0;
            return (
              <View
                key={n}
                className="flex-row items-center rounded-md"
                style={{
                  padding: 13,
                  paddingHorizontal: 14,
                  gap: 12,
                  backgroundColor: isFirst ? `${GOLD}1F` : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                }}
              >
                <Text
                  className="font-num font-extrabold"
                  style={{
                    width: 22,
                    textAlign: 'center',
                    fontSize: 16,
                    color: isFirst ? GOLD : colors.text3,
                  }}
                >
                  {i + 1}
                </Text>
                <Avatar name={n} size={40} ring={isFirst ? GOLD : undefined} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View className="flex-row items-center" style={{ gap: 5 }}>
                    <Text className="font-sans font-bold text-text" style={{ fontSize: 14.5 }}>
                      {n}
                    </Text>
                    {isFirst && <Icon name="trophy" size={15} color={GOLD} />}
                  </View>
                  <Text
                    className="font-sans text-text-3"
                    style={{ fontSize: 11, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {tags.join(' · ')}
                  </Text>
                </View>
                <Text
                  className="font-num font-extrabold"
                  style={{ fontSize: 18, color: isFirst ? GOLD : colors.text }}
                >
                  {pts}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
