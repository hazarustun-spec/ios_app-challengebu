// Active season — Plan 8 Phase F8.
//
// Ports the design bundle's `Season` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-season.jsx
// `function Season()`) to React Native + NativeWind.
//
// Countdown hero + my standing + finale timeline + bracket CTA + annual
// championship link.
//
// TODO(plan-8-F-polish): swap SEASON/FINALE_TIMELINE statics for
// useCurrentSeason / useFinaleSchedule hooks.

import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Button } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';

// TODO(plan-8-F-polish): useCurrentSeason
const SEASON = {
  name: 'Güz Sezonu',
  dates: '1 Eyl – 15 Oca',
  finaleDates: '16-25 Ocak',
  daysLeft: 41,
  finalePct: 0.72,
  myRank: 4,
  myCategory: 'Erkek Tek',
  inTop8: true,
};

const FINALE_TIMELINE: Array<[string, string, string, IconName]> = [
  ['Çeyrek Final', '16-19 Oca', 'BÜ Klasik', 'flame'],
  ['Yarı Final', '20-22 Oca', 'BÜ Klasik', 'bolt'],
  ['Final', '24-25 Oca', '3 Set Klasik', 'trophy'],
];

export default function Season() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        large
        title={SEASON.name}
        subtitle={`${SEASON.dates} · Aktif ladder`}
        actionIcon="clock"
        onAction={() => router.push('/season/archive' as never)}
      />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        {/* Countdown hero */}
        <View
          className="bg-court rounded-xl overflow-hidden"
          style={{ padding: 20, borderWidth: 1.5, borderColor: colors.borderStrong }}
        >
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-white/85 font-bold" style={{ fontSize: 12.5 }}>Finale window'a</Text>
              <Text
                className="font-num font-extrabold text-white"
                style={{ fontSize: 40, lineHeight: 40, letterSpacing: -1.2 }}
              >
                {SEASON.daysLeft} gün
              </Text>
              <Text className="text-white/85" style={{ fontSize: 12.5, marginTop: 4 }}>
                {SEASON.finaleDates} · son 10 gün
              </Text>
            </View>
            <Icon name="trophy" size={32} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={{ marginTop: 16 }}>
            <View
              style={{
                height: 7,
                backgroundColor: 'rgba(255,255,255,0.25)',
                borderRadius: 9999,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${SEASON.finalePct * 100}%`,
                  height: '100%',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 9999,
                }}
              />
            </View>
            <View className="flex-row justify-between" style={{ marginTop: 7 }}>
              <Text className="text-white/85 font-semibold" style={{ fontSize: 11 }}>
                Sezon %{Math.round(SEASON.finalePct * 100)}
              </Text>
              <Text className="text-white/85 font-semibold" style={{ fontSize: 11 }}>
                Top 8 finale gider
              </Text>
            </View>
          </View>
        </View>

        {/* My standing */}
        <Pressable
          onPress={() => router.push('/leaderboard' as never)}
          className="flex-row items-center bg-clay-softer rounded-md"
          style={{ padding: 14, gap: 14, borderWidth: 1, borderColor: colors.claySoft }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text className="font-num font-extrabold" style={{ fontSize: 9, color: colors.text3 }}>
              SEN
            </Text>
            <Text className="font-num font-extrabold" style={{ fontSize: 18, color: colors.clay }}>
              {SEASON.myRank}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="font-sans font-bold text-text" style={{ fontSize: 14.5 }}>
              {SEASON.myCategory} · {SEASON.myRank}. sırada
            </Text>
            <Text className="font-sans text-text-2" style={{ fontSize: 12.5, marginTop: 2 }}>
              {SEASON.inTop8 ? "Finale için ilk 8'desin 🎯" : "Finale için ilk 8'i zorla"}
            </Text>
          </View>
          <Icon name="chevR" size={18} color={colors.text3} />
        </Pressable>

        {/* Finale calendar */}
        <Text
          className="font-sans font-extrabold text-text-3"
          style={{ fontSize: 12, letterSpacing: 0.6 }}
        >
          FİNALE TAKVİMİ
        </Text>
        <View
          className="rounded-lg overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          {FINALE_TIMELINE.map(([t, d, f, ic], i) => (
            <View
              key={t}
              className="flex-row items-center"
              style={{
                padding: 14,
                paddingHorizontal: 16,
                gap: 13,
                borderTopWidth: i ? 1 : 0,
                borderColor: colors.surface3,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 14,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={ic} size={18} color={colors.clay} />
              </View>
              <View style={{ flex: 1 }}>
                <Text className="font-sans font-bold text-text" style={{ fontSize: 14.5 }}>
                  {t}
                </Text>
                <Text className="font-sans text-text-3" style={{ fontSize: 12, marginTop: 1 }}>
                  {f}
                </Text>
              </View>
              <Text className="font-num font-bold text-text-2" style={{ fontSize: 12.5 }}>
                {d}
              </Text>
            </View>
          ))}
        </View>

        <Button
          full
          size="lg"
          variant="secondary"
          icon={<Icon name="trophy" size={17} color={colors.text} />}
          onPress={() => router.push('/season/bracket' as never)}
        >
          Finale bracket'ını gör
        </Button>
        <Pressable
          onPress={() => router.push('/season/annual-champion' as never)}
          style={{ paddingVertical: 6, alignItems: 'center' }}
        >
          <Text className="font-sans font-bold" style={{ fontSize: 13.5, color: colors.clay }}>
            Yıllık şampiyonluk yarışı →
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
