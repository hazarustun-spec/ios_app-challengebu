// Geçmiş Maçlar (Match History) — Plan 8 Phase E16.
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-matches.jsx
//   (`MatchHistory`)
//
// Screen layout:
//
//   1. NavHeader with back + "filter" trailing action (filter sheet TBD)
//   2. Stat strip — 3 surface-2 chips: Galibiyet / Mağlubiyet / Oran
//   3. History list — one row per finalized match with:
//        · left color strip (win=green, loss=red, void=warn)
//        · avatar + opponent + format/date subtitle
//        · trailing score + Δelo (or "voided")
//      Tapping a row navigates to /match/[id].
//
// Data wiring is intentionally STUBBED in this batch — Plan 8 Phase E16
// is a visual port. The polish pass will swap `MOCK_HISTORY` for the
// real `useMatchHistory()` query result.

import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { FORMATS, type FormatKey } from '../../lib/formats';
import { colors } from '../../theme/colors';

// TODO(plan-8-E-polish): replace with `useMatchHistory()` query result.
const MOCK_HISTORY: Array<{
  id: string;
  opp: string;
  win: boolean;
  score: string;
  format: FormatKey;
  date: string;
  delta: number;
  cat: string;
  void?: boolean;
}> = [
  {
    id: 'h1',
    opp: 'Tolga Aksoy',
    win: true,
    score: '4-1',
    format: 'klasik',
    date: '2 Haz',
    delta: 18,
    cat: 'Erkek Tek',
  },
  {
    id: 'h2',
    opp: 'Sinan Polat',
    win: true,
    score: '4-0',
    format: 'klasik',
    date: '29 May',
    delta: 24,
    cat: 'Erkek Tek',
  },
  {
    id: 'h3',
    opp: 'Berk Aydın',
    win: false,
    score: '6-8',
    format: 'proset',
    date: '24 May',
    delta: -15,
    cat: 'Erkek Tek',
  },
  {
    id: 'h4',
    opp: 'Emre Yıldız',
    win: false,
    score: '3-3',
    format: 'klasik',
    date: '19 May',
    delta: 0,
    cat: 'Erkek Tek',
    void: true,
  },
  {
    id: 'h5',
    opp: 'Deniz Arslan',
    win: true,
    score: '10-6',
    format: 'tiebreak',
    date: '14 May',
    delta: 12,
    cat: 'Open Tek',
  },
];

export default function MatchHistory() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Geçmiş Maçlar"
        onBack={() => router.back()}
        actionIcon="filter"
        onAction={() => {}}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Stat strip */}
        <View className="flex-row" style={{ gap: 8 }}>
          {(
            [
              ['18', 'Galibiyet', colors.win],
              ['9', 'Mağlubiyet', colors.loss],
              ['67%', 'Oran', colors.text],
            ] as const
          ).map(([v, l, c]) => (
            <View
              key={l}
              style={{
                flex: 1,
                backgroundColor: colors.surface2,
                borderRadius: 18,
                padding: 12,
                paddingHorizontal: 4,
                alignItems: 'center',
              }}
            >
              <Text
                className="font-num font-extrabold"
                style={{ fontSize: 21, color: c }}
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

        {/* History rows */}
        <View style={{ gap: 8 }}>
          {MOCK_HISTORY.map((m) => {
            const fmt = FORMATS.find((f) => f.key === m.format)!;
            const stripColor = m.void
              ? colors.warn
              : m.win
                ? colors.win
                : colors.loss;
            return (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/match/${m.id}` as never)}
                className="flex-row items-center bg-surface rounded-md border-base border-border-strong"
                style={{ padding: 12, paddingHorizontal: 14, gap: 12 }}
              >
                <View
                  style={{
                    width: 6,
                    alignSelf: 'stretch',
                    borderRadius: 3,
                    backgroundColor: stripColor,
                  }}
                />
                <Avatar name={m.opp} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 14.5 }}
                  >
                    {m.opp}
                  </Text>
                  <Text
                    className="font-sans text-text-3"
                    style={{ fontSize: 12, marginTop: 2 }}
                  >
                    {fmt.name} · {m.date}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    className="font-num font-bold text-text"
                    style={{ fontSize: 17 }}
                  >
                    {m.score}
                  </Text>
                  <Text
                    className="font-num font-bold"
                    style={{
                      fontSize: 12,
                      marginTop: 1,
                      color: m.void
                        ? colors.warn
                        : m.delta > 0
                          ? colors.win
                          : m.delta < 0
                            ? colors.loss
                            : colors.text3,
                    }}
                  >
                    {m.void ? 'voided' : `${m.delta > 0 ? '+' : ''}${m.delta}`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
