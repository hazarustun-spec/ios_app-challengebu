// Past seasons archive — Plan 8 Phase F12.
//
// Ports the design bundle's `SeasonArchive` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-season.jsx
// `function SeasonArchive()`) to React Native + NativeWind.
//
// Vertical list of completed seasons with title + date range, champion
// strip, and Yıllık chip when the season's champion also won the annual
// title.
//
// TODO(plan-8-F-polish): replace SEASONS static with usePastSeasons hook.

import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';

// TODO(plan-8-F-polish): usePastSeasons
const SEASONS: Array<[string, string, string, boolean]> = [
  ['Yaz 2025', 'Kaan Demir', '1 Tem – 20 Ağu', true],
  ['Bahar 2025', 'Emre Yıldız', '26 Oca – 20 Haz', false],
  ['Güz 2024', 'Kaan Demir', '1 Eyl – 15 Oca', true],
  ['Yaz 2024', 'Berk Aydın', '1 Tem – 20 Ağu', false],
];

const GOLD = '#C9982E';

export default function SeasonArchive() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Geçmiş Sezonlar" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 10 }}>
        {SEASONS.map(([s, champ, dates, isAnnual]) => (
          <Pressable
            key={s}
            onPress={() => router.push('/season/bracket' as never)}
            className="bg-surface rounded-lg"
            style={{ padding: 16, borderWidth: 1, borderColor: colors.borderStrong }}
          >
            <View
              className="flex-row items-center justify-between"
              style={{ marginBottom: 12 }}
            >
              <Text className="font-sans font-extrabold text-text" style={{ fontSize: 16 }}>
                {s}
              </Text>
              <Text className="font-num font-semibold text-text-3" style={{ fontSize: 12 }}>
                {dates}
              </Text>
            </View>
            <View
              className="flex-row items-center bg-surface-2 rounded-md"
              style={{ padding: 10, paddingHorizontal: 12, gap: 11 }}
            >
              <Icon name="crown" size={20} color={GOLD} />
              <View style={{ flex: 1 }}>
                <Text className="font-sans font-semibold text-text-3" style={{ fontSize: 11 }}>
                  Şampiyon
                </Text>
                <Text className="font-sans font-bold text-text" style={{ fontSize: 14 }}>
                  {champ}
                </Text>
              </View>
              {isAnnual && (
                <View
                  className="flex-row items-center rounded-pill"
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    gap: 4,
                    backgroundColor: `${GOLD}1F`,
                  }}
                >
                  <Icon name="trophy" size={12} color={GOLD} />
                  <Text
                    className="font-sans font-bold"
                    style={{ fontSize: 11, color: GOLD }}
                  >
                    Yıllık
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
