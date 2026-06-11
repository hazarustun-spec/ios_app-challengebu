// ELO history — Plan 8 Phase F3.
//
// Ports the design bundle's `EloHistory` + `EloChart` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-profile.jsx
// `function EloHistory()`, `function EloChart()`) to React Native +
// react-native-svg.
//
// The interactive scrubber sits inside the SVG itself — tapping a point
// updates `sel`; the "Maç N / 1612 ELO" footer reads from `sel`.
//
// TODO(plan-8-F-polish): useEloHistory(category) hook + real season
// markers from current_season.

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Polyline, Polygon, Line } from 'react-native-svg';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Segmented } from '../../components/ui/Segmented';
import { colors } from '../../theme/colors';

// TODO(plan-8-F-polish): swap for useEloHistory(category)
const DATA: number[] = [
  1200, 1218, 1205, 1240, 1262, 1255, 1288, 1310, 1295, 1340, 1380, 1365, 1410,
  1452, 1480, 1430, 1466, 1510, 1548, 1530, 1566, 1590, 1612,
];
const SEASON_MARKERS: number[] = [0, 11];

const W = 320;
const H = 150;
const PAD = 8;

function makePath(data: number[]) {
  const min = Math.min(...data) - 30;
  const max = Math.max(...data) + 30;
  const range = max - min || 1;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (data.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);
  const points = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return { x, y, points };
}

type Category = 'erkek_tek' | 'open_tek' | 'erkek_cift';

export default function EloHistory() {
  const [cat, setCat] = useState<Category>('erkek_tek');
  const [sel, setSel] = useState(DATA.length - 1);
  const { x, y, points } = makePath(DATA);
  const current = DATA[DATA.length - 1] ?? 0;
  const peak = Math.max(...DATA);
  const selValue = DATA[sel] ?? 0;
  // category state intentionally unused server-side until F-polish wires the
  // hook; consumed by the Segmented control above for design realism.
  void cat;

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="ELO Geçmişi" onBack={() => router.back()} />
      <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
        <Segmented
          size="sm"
          value={cat}
          onChange={setCat}
          options={[
            { value: 'erkek_tek', label: 'Erkek Tek' },
            { value: 'open_tek', label: 'Open Tek' },
            { value: 'erkek_cift', label: 'Erkek Çift' },
          ]}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <View
          className="bg-surface rounded-lg"
          style={{
            padding: 18,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          <View
            className="flex-row items-end justify-between"
            style={{ marginBottom: 16 }}
          >
            <View>
              <Text
                className="font-sans font-bold text-text-3"
                style={{ fontSize: 12.5 }}
              >
                Güncel
              </Text>
              <Text
                className="font-num font-extrabold text-text"
                style={{ fontSize: 28 }}
              >
                {current}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                className="font-sans font-bold text-text-3"
                style={{ fontSize: 12.5 }}
              >
                En yüksek
              </Text>
              <Text
                className="font-num font-bold"
                style={{ fontSize: 17, color: colors.win }}
              >
                {peak}
              </Text>
            </View>
          </View>

          <Svg width={W} height={H}>
            {SEASON_MARKERS.map((s, i) => (
              <Line
                key={i}
                x1={x(s)}
                y1={PAD}
                x2={x(s)}
                y2={H - PAD}
                stroke={colors.borderStrong}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ))}
            <Polygon
              points={`${points} ${x(DATA.length - 1)},${H - PAD} ${x(0)},${H - PAD}`}
              fill={colors.clay}
              opacity={0.07}
            />
            <Polyline
              points={points}
              fill="none"
              stroke={colors.clay}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {DATA.map((v, i) => (
              <Circle
                key={i}
                cx={x(i)}
                cy={y(v)}
                r={sel === i ? 5 : 3}
                fill={sel === i ? colors.clay : colors.surface}
                stroke={colors.clay}
                strokeWidth={2}
                onPress={() => setSel(i)}
              />
            ))}
          </Svg>

          <View
            className="flex-row justify-between"
            style={{ marginTop: 6 }}
          >
            <Text
              className="font-sans font-semibold text-text-3"
              style={{ fontSize: 11 }}
            >
              Maç {sel + 1}
            </Text>
            <Text
              className="font-num font-extrabold"
              style={{ fontSize: 13, color: colors.clay }}
            >
              {selValue} ELO
            </Text>
          </View>
        </View>

        <View className="flex-row" style={{ gap: 8 }}>
          {(
            [
              ['+412', 'Toplam kazanım', colors.win],
              ['23', 'Maç', colors.text],
              ['2', 'Sezon', colors.text],
            ] as const
          ).map(([v, l, c]) => (
            <View
              key={l}
              style={{
                flex: 1,
                backgroundColor: colors.surface2,
                borderRadius: 18,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text
                className="font-num font-extrabold"
                style={{ fontSize: 19, color: c }}
              >
                {v}
              </Text>
              <Text
                className="font-sans font-semibold text-text-3"
                style={{ fontSize: 10.5, marginTop: 2 }}
              >
                {l}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
