// apps/mobile/app/leaderboard/filter.tsx — Plan 8 Phase F (F7).
//
// Ladder filter panel at `/leaderboard/filter`. Ports the design bundle's
// `function FilterPanel(...)` (see
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-leaderboard.jsx)
// to React Native + NativeWind.
//
// Controls:
//   - ELO range (two `@react-native-community/slider` thumbs, 50pt gap floor)
//   - Müsaitlik grid (2×2 — hafta içi sabah/akşam, hafta sonu sabah/akşam)
//   - Donmuş + Hibernasyon toggles (Toggle primitive)
//
// "Sıfırla" resets to defaults, primary CTA shows match count (mocked).

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Button } from '../../components/ui/Button';
import { CheckBox } from '../../components/ui/CheckBox';
import { Toggle } from '../../components/ui/Toggle';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';

const SLOTS: Array<{ key: string; label: string }> = [
  { key: 'wd_am', label: 'Hafta içi sabah' },
  { key: 'wd_eve', label: 'Hafta içi akşam' },
  { key: 'we_am', label: 'Hafta sonu sabah' },
  { key: 'we_eve', label: 'Hafta sonu akşam' },
];

const ELO_MIN = 900;
const ELO_MAX = 2000;
const ELO_GAP = 50;

export default function FilterPanel() {
  const [lo, setLo] = useState(1100);
  const [hi, setHi] = useState(1950);
  const [avail, setAvail] = useState<string[]>(['wd_eve']);
  const [frozen, setFrozen] = useState(true);
  const [hib, setHib] = useState(false);

  const toggle = (k: string) =>
    setAvail((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  const reset = () => {
    setLo(1100);
    setHi(1950);
    setAvail([]);
    setFrozen(true);
    setHib(false);
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Filtrele"
        onBack={() => router.back()}
        action="Sıfırla"
        onAction={reset}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
        {/* ELO range */}
        <View>
          <View
            className="flex-row justify-between"
            style={{ marginBottom: 12 }}
          >
            <Text
              className="font-sans font-bold text-text"
              style={{ fontSize: 15 }}
            >
              ELO aralığı
            </Text>
            <Text
              className="font-num font-bold"
              style={{ fontSize: 14, color: colors.clay }}
            >
              {lo} – {hi}
            </Text>
          </View>
          <Slider
            minimumValue={ELO_MIN}
            maximumValue={ELO_MAX}
            step={10}
            value={lo}
            onValueChange={(v) => setLo(Math.min(v, hi - ELO_GAP))}
            minimumTrackTintColor={colors.clay}
            maximumTrackTintColor={colors.surface3}
            thumbTintColor={colors.clay}
          />
          <Slider
            minimumValue={ELO_MIN}
            maximumValue={ELO_MAX}
            step={10}
            value={hi}
            onValueChange={(v) => setHi(Math.max(v, lo + ELO_GAP))}
            minimumTrackTintColor={colors.clay}
            maximumTrackTintColor={colors.surface3}
            thumbTintColor={colors.clay}
          />
        </View>

        {/* Availability */}
        <View>
          <Text
            className="font-sans font-bold text-text"
            style={{ fontSize: 15, marginBottom: 12 }}
          >
            Müsaitlik
          </Text>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
          >
            {SLOTS.map((s) => {
              const on = avail.includes(s.key);
              return (
                <Pressable
                  key={s.key}
                  onPress={() => toggle(s.key)}
                  className="flex-row items-center"
                  style={{
                    width: '48%',
                    padding: 12,
                    gap: 9,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: on ? colors.win : colors.borderStrong,
                    backgroundColor: on ? colors.claySoft : colors.surface,
                  }}
                >
                  <CheckBox checked={on} onChange={() => toggle(s.key)} />
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 12.5 }}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Status toggles */}
        <View style={{ gap: 4 }}>
          <Pressable
            onPress={() => setFrozen(!frozen)}
            className="flex-row items-center"
            style={{ paddingVertical: 12, gap: 12 }}
          >
            <Icon name="snow" size={20} color={colors.frozen} />
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 14.5 }}
              >
                Donmuş oyuncular
              </Text>
              <Text
                className="font-sans"
                style={{ fontSize: 12.5, color: colors.text3 }}
              >
                30+ gündür inaktif
              </Text>
            </View>
            <Toggle value={frozen} onChange={setFrozen} />
          </Pressable>
          <Pressable
            onPress={() => setHib(!hib)}
            className="flex-row items-center"
            style={{ paddingVertical: 12, gap: 12 }}
          >
            <Icon name="moon" size={20} color={colors.text2} />
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 14.5 }}
              >
                Hibernasyondakiler
              </Text>
              <Text
                className="font-sans"
                style={{ fontSize: 12.5, color: colors.text3 }}
              >
                Sezon arası dinlenenler
              </Text>
            </View>
            <Toggle value={hib} onChange={setHib} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ padding: 20 }}>
        <Button full size="lg" onPress={() => router.back()}>
          42 oyuncu göster
        </Button>
      </View>
    </View>
  );
}
