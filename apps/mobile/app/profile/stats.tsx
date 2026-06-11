// Stats — Plan 8 Phase F5.
//
// Ports the design bundle's `Stats` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-profile.jsx
// `function Stats()`) to React Native + NativeWind.
//
// Layout: 2x2 big-stat grid → Win/Loss bar → "Öne çıkanlar" facts list.
//
// TODO(plan-8-F-polish): useStats hook surfacing win% / total / streak /
// elo delta + featured facts (most-played court, format, opponent).

import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Icon, type IconName } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';

const BIG: ReadonlyArray<readonly [string, string]> = [
  ['67%', 'Kazanma oranı'],
  ['26', 'Toplam maç'],
  ['5', 'En uzun seri'],
  ['+412', 'ELO kazanımı'],
];

type Fact = readonly [IconName, string, string, string];

const FACTS: ReadonlyArray<Fact> = [
  ['pin', 'En sık kort', 'Kort 1', '14 maç'],
  ['spark', 'En sık format', 'BÜ Klasik', '18 maç'],
  ['user', 'En sık rakip', 'Berk Aydın', '5 maç'],
  ['flame', 'Mevcut seri', '3 galibiyet', 'devam ediyor'],
];

const WL: readonly [number, number] = [18, 9];

export default function Stats() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="İstatistikler" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        {/* Big 2x2 */}
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
        >
          {BIG.map(([v, l]) => (
            <View
              key={l}
              style={{
                width: '48%',
                backgroundColor: colors.surface,
                borderRadius: 26,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                padding: 16,
                paddingHorizontal: 14,
              }}
            >
              <Text
                className="font-num font-extrabold text-text"
                style={{ fontSize: 26, letterSpacing: -0.52 }}
              >
                {v}
              </Text>
              <Text
                className="font-sans font-semibold text-text-3"
                style={{ fontSize: 12.5, marginTop: 2 }}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>

        {/* W/L bar */}
        <View
          className="bg-surface rounded-lg"
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          <View
            className="flex-row justify-between"
            style={{ marginBottom: 10 }}
          >
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 13, color: colors.win }}
            >
              {WL[0]} Galibiyet
            </Text>
            <Text
              className="font-sans font-bold"
              style={{ fontSize: 13, color: colors.loss }}
            >
              {WL[1]} Mağlubiyet
            </Text>
          </View>
          <View
            className="flex-row"
            style={{ height: 12, borderRadius: 9999, overflow: 'hidden', gap: 2 }}
          >
            <View style={{ flex: WL[0], backgroundColor: colors.win }} />
            <View style={{ flex: WL[1], backgroundColor: colors.loss }} />
          </View>
        </View>

        {/* Section label */}
        <Text
          className="font-sans font-extrabold text-text-3"
          style={{ fontSize: 11, letterSpacing: 0.66 }}
        >
          ÖNE ÇIKANLAR
        </Text>

        <View
          className="rounded-lg overflow-hidden"
          style={{
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
          }}
        >
          {FACTS.map(([icon, l, v, sub], i) => (
            <View
              key={l}
              className="flex-row items-center"
              style={{
                padding: 13,
                paddingHorizontal: 16,
                gap: 13,
                borderTopWidth: i ? 1 : 0,
                borderColor: colors.surface3,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 14,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={icon} size={18} color={colors.clay} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  className="font-sans font-semibold text-text-3"
                  style={{ fontSize: 12.5 }}
                >
                  {l}
                </Text>
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 15 }}
                >
                  {v}
                </Text>
              </View>
              <Text
                className="font-sans font-semibold text-text-3"
                style={{ fontSize: 12 }}
              >
                {sub}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
