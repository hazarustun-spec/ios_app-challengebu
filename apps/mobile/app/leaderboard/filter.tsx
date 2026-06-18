// apps/mobile/app/leaderboard/filter.tsx — Plan 8 Phase F (F7), store-wired.
//
// Ladder filter panel at `/leaderboard/filter?cat=<category>`.
// All state is now held in useLeaderboardFilterStore (Zustand) so both this
// panel and the leaderboard tab stay in sync without prop-drilling.
//
// Controls:
//   - ELO range (two @react-native-community/slider thumbs, 50pt gap floor)
//   - Müsaitlik grid (3×2 — hafta içi/sonu × sabah/öğlen/akşam, 6 total)
//   - Donmuş + Hibernasyon toggles
//
// "Sıfırla" calls store.reset(), primary CTA shows the live filtered count
// for the current category and navigates back on press.

import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Button } from '../../components/ui/Button';
import { CheckBox } from '../../components/ui/CheckBox';
import { Toggle } from '../../components/ui/Toggle';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';
import { useLadder } from '../../hooks/use-ladder';
import {
  useLeaderboardFilterStore,
  applyLadderFilter,
  type LadderFilter,
} from '../../stores/leaderboard-filter-store';

// 6 availability slots in natural order: weekday am/noon/eve then weekend am/noon/eve
const SLOTS: Array<{ key: string; label: string }> = [
  { key: 'wd_am', label: 'Hafta içi sabah' },
  { key: 'wd_noon', label: 'Hafta içi öğlen' },
  { key: 'wd_eve', label: 'Hafta içi akşam' },
  { key: 'we_am', label: 'Hafta sonu sabah' },
  { key: 'we_noon', label: 'Hafta sonu öğlen' },
  { key: 'we_eve', label: 'Hafta sonu akşam' },
];

const ELO_MIN = 900;
const ELO_MAX = 2000;
const ELO_GAP = 50;

export default function FilterPanel() {
  const params = useLocalSearchParams<{ cat?: string }>();
  const cat = params.cat ?? 'erkek_tek';

  // Store reads
  const eloMin = useLeaderboardFilterStore((s) => s.eloMin);
  const eloMax = useLeaderboardFilterStore((s) => s.eloMax);
  const availability = useLeaderboardFilterStore((s) => s.availability);
  const showFrozen = useLeaderboardFilterStore((s) => s.showFrozen);
  const showHibernating = useLeaderboardFilterStore((s) => s.showHibernating);

  // Store actions
  const setElo = useLeaderboardFilterStore((s) => s.setElo);
  const toggleAvailability = useLeaderboardFilterStore((s) => s.toggleAvailability);
  const setShowFrozen = useLeaderboardFilterStore((s) => s.setShowFrozen);
  const setShowHibernating = useLeaderboardFilterStore((s) => s.setShowHibernating);
  const reset = useLeaderboardFilterStore((s) => s.reset);

  // Live count: fetch the same ladder that the leaderboard tab shows for `cat`,
  // then apply the current filter values to get the matching player count.
  const { rows } = useLadder(cat);

  const currentFilter: LadderFilter = useMemo(
    () => ({ eloMin, eloMax, availability, showFrozen, showHibernating }),
    [eloMin, eloMax, availability, showFrozen, showHibernating],
  );

  const count = useMemo(
    () => applyLadderFilter(rows, currentFilter).length,
    [rows, currentFilter],
  );

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
              {eloMin} – {eloMax}
            </Text>
          </View>
          <Slider
            minimumValue={ELO_MIN}
            maximumValue={ELO_MAX}
            step={10}
            value={eloMin}
            onValueChange={(v) => setElo(Math.min(v, eloMax - ELO_GAP), eloMax)}
            minimumTrackTintColor={colors.clay}
            maximumTrackTintColor={colors.surface3}
            thumbTintColor={colors.clay}
          />
          <Slider
            minimumValue={ELO_MIN}
            maximumValue={ELO_MAX}
            step={10}
            value={eloMax}
            onValueChange={(v) => setElo(eloMin, Math.max(v, eloMin + ELO_GAP))}
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
              const on = availability.includes(s.key);
              return (
                <Pressable
                  key={s.key}
                  onPress={() => toggleAvailability(s.key)}
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
                  <CheckBox checked={on} onChange={() => toggleAvailability(s.key)} />
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
            onPress={() => setShowFrozen(!showFrozen)}
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
            <Toggle value={showFrozen} onChange={setShowFrozen} />
          </Pressable>
          <Pressable
            onPress={() => setShowHibernating(!showHibernating)}
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
            <Toggle value={showHibernating} onChange={setShowHibernating} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ padding: 20 }}>
        <Button full size="lg" onPress={() => router.back()}>
          {`${count} oyuncu göster`}
        </Button>
      </View>
    </View>
  );
}
