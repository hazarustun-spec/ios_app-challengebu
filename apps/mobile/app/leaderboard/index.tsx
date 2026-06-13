// apps/mobile/app/leaderboard/index.tsx — Plan 8 Phase F (F13).
//
// Main ladder view at `/leaderboard`. Ports the design bundle's
// `function Leaderboard(...)` (see
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-leaderboard.jsx)
// to React Native + NativeWind.
//
// Sections (top → bottom):
//   - Large NavHeader (title + subtitle + filter action)
//   - Category chip strip (Erkek Tek / Open Tek / Erkek Çift / ...)
//   - Finale countdown hero (court blue, 41 gün)
//   - Sticky "Sen" bar (appears once we scroll past 210px)
//   - My standing card (outlined, with avatar + ELO chip + Δ chip)
//   - Top-3 podium strip (2nd left, 1st center elevated, 3rd right)
//   - Rank rows for the rest of the ladder
//
// Data: hard-coded mock today. TODO(plan-8-F-polish): wire a `useLadder(cat)`
// query against the materialized ladder view so this screen reflects real
// season state.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { LevelIcon } from '../../components/ui/LevelIcon';
import { Sparkline } from '../../components/ui/Sparkline';
import { FormDots } from '../../components/ui/FormDots';
import { Icon } from '../../components/ui/Icon';
import { levelForElo } from '../../lib/levels';
import { colors } from '../../theme/colors';

type Cat =
  | 'erkek_tek'
  | 'kadin_tek'
  | 'open_tek'
  | 'erkek_cift'
  | 'kadin_cift'
  | 'karma_cift'
  | 'open_cift';

interface Player {
  id: string;
  name: string;
  elo: number;
  rank: number;
  wl: [number, number];
  trend: number[];
  form: ('W' | 'L')[];
  status?: 'frozen_30' | 'hibernating_60' | 'active';
}

const CAT_CHIPS: Array<{ key: Cat; label: string }> = [
  { key: 'erkek_tek', label: 'Erkek Tek' },
  { key: 'kadin_tek', label: 'Kadın Tek' },
  { key: 'open_tek', label: 'Open Tek' },
  { key: 'erkek_cift', label: 'Erkek Çift' },
  { key: 'kadin_cift', label: 'Kadın Çift' },
  { key: 'karma_cift', label: 'Karma Çift' },
  { key: 'open_cift', label: 'Open Çift' },
];

const MY_CAT_RANKS: Partial<Record<Cat, number>> = {
  erkek_tek: 4,
  open_tek: 9,
  erkek_cift: 2,
};

// TODO(plan-8-F-polish): useLadder(category) hook
const MOCK_LIST: Player[] = [
  {
    id: 'p1',
    name: 'Kaan Demir',
    elo: 1924,
    rank: 1,
    wl: [22, 3],
    trend: [1850, 1880, 1900, 1924],
    form: ['W', 'W', 'W', 'L', 'W'],
  },
  {
    id: 'p2',
    name: 'Emre Yıldız',
    elo: 1788,
    rank: 2,
    wl: [18, 6],
    trend: [1750, 1770, 1780, 1788],
    form: ['W', 'W', 'L', 'W', 'W'],
  },
  {
    id: 'p3',
    name: 'Berk Aydın',
    elo: 1748,
    rank: 3,
    wl: [16, 7],
    trend: [1700, 1720, 1740, 1748],
    form: ['W', 'L', 'W', 'W', 'W'],
  },
  {
    id: 'me',
    name: 'Mert Şahin',
    elo: 1612,
    rank: 4,
    wl: [12, 9],
    trend: [1550, 1580, 1600, 1612],
    form: ['W', 'L', 'W', 'W', 'L'],
  },
  {
    id: 'p5',
    name: 'Can Öztürk',
    elo: 1598,
    rank: 5,
    wl: [11, 8],
    trend: [1580, 1590, 1600, 1598],
    form: ['L', 'W', 'W', 'L', 'W'],
  },
  {
    id: 'p6',
    name: 'Ada Çelik',
    elo: 1498,
    rank: 6,
    wl: [10, 10],
    trend: [1500, 1495, 1490, 1498],
    form: ['L', 'L', 'W', 'W', 'L'],
  },
  {
    id: 'p7',
    name: 'Ali Koç',
    elo: 1487,
    rank: 7,
    wl: [9, 11],
    trend: [1500, 1490, 1485, 1487],
    form: ['W', 'L', 'L', 'W', 'L'],
  },
  {
    id: 'p8',
    name: 'Onur Çelik',
    elo: 1432,
    rank: 8,
    wl: [7, 12],
    trend: [1450, 1440, 1430, 1432],
    form: ['L', 'W', 'L', 'W', 'L'],
  },
  {
    id: 'p9',
    name: 'Selim Aksoy',
    elo: 1390,
    rank: 9,
    wl: [6, 13],
    trend: [1400, 1395, 1390, 1390],
    form: ['L', 'L', 'W', 'L', 'L'],
    status: 'frozen_30',
  },
];

const ME = MOCK_LIST.find((p) => p.id === 'me')!;

// Podium medal colors: 1st = gold, 2nd = silver, 3rd = bronze. Indexed by
// 0-based rank so MOCK_LIST[0] (Kaan) gets PODIUM_COLORS[0].
const PODIUM_COLORS = ['#C9982E', '#9AA0A6', '#B0743A'];

export default function Leaderboard() {
  const [cat, setCat] = useState<Cat>('erkek_tek');
  const [stuck, setStuck] = useState(false);

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        large
        title="Sıralama"
        subtitle="Güz Sezonu · 41 gün kaldı"
        onBack={() => router.back()}
        actionIcon="filter"
        onAction={() => router.push('/leaderboard/filter' as never)}
      />

      {/* Category chip strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 6,
          paddingBottom: 14,
          gap: 8,
        }}
      >
        {CAT_CHIPS.map((c) => {
          const on = c.key === cat;
          const myr = MY_CAT_RANKS[c.key];
          return (
            <Pressable
              key={c.key}
              onPress={() => setCat(c.key)}
              className="flex-row items-center rounded-pill"
              style={{
                paddingHorizontal: 15,
                minHeight: 38,
                gap: 7,
                borderWidth: 1.5,
                borderColor: on ? 'transparent' : colors.borderStrong,
                backgroundColor: on ? colors.text : colors.surface,
              }}
            >
              <Text
                className="font-sans font-bold"
                style={{
                  fontSize: 13.5,
                  lineHeight: 18,
                  color: on ? colors.bg : colors.text2,
                }}
              >
                {c.label}
              </Text>
              {myr !== undefined && (
                <View
                  className="rounded-pill"
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    backgroundColor: on ? '#FFFFFF' : colors.surface2,
                  }}
                >
                  <Text
                    className="font-num font-extrabold"
                    style={{
                      fontSize: 10.5,
                      color: on ? colors.court : colors.text3,
                    }}
                  >
                    #{myr}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Finale countdown banner */}
      <Pressable
        onPress={() => router.push('/season' as never)}
        className="bg-court rounded-lg overflow-hidden"
        style={{
          marginHorizontal: 14,
          marginTop: 8,
          padding: 14,
          borderWidth: 1.5,
          borderColor: colors.borderStrong,
        }}
      >
        <View
          style={{
            position: 'absolute',
            right: -28,
            bottom: -36,
            opacity: 0.12,
          }}
          pointerEvents="none"
        >
          <Icon name="trophy" size={150} color="#FFFFFF" stroke={1.6} />
        </View>
        <View
          className="flex-row items-center justify-between"
          style={{ marginBottom: 9 }}
        >
          <View className="flex-row items-center" style={{ gap: 7 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#FFFFFF',
              }}
            />
            <Text
              className="font-extrabold"
              style={{
                fontSize: 10.5,
                letterSpacing: 1.26,
                color: 'rgba(255,255,255,0.72)',
              }}
            >
              FİNALE GERİ SAYIM
            </Text>
          </View>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.55)',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 9999,
            }}
          >
            <Text
              className="text-white font-extrabold"
              style={{ fontSize: 10, letterSpacing: 0.6 }}
            >
              İLK 8&apos;DESİN
            </Text>
          </View>
        </View>
        <View
          className="flex-row items-baseline"
          style={{ gap: 7, marginBottom: 12 }}
        >
          <Text
            className="font-num font-extrabold text-white"
            style={{ fontSize: 46, lineHeight: 54, letterSpacing: -1.38 }}
          >
            41
          </Text>
          <Text className="text-white font-extrabold" style={{ fontSize: 17 }}>
            gün
          </Text>
          <Text
            className="font-bold"
            style={{
              fontSize: 12.5,
              marginLeft: 4,
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            · final 16-25 Oca
          </Text>
        </View>
        <View
          style={{
            height: 7,
            backgroundColor: 'rgba(255,255,255,0.22)',
            borderRadius: 9999,
            overflow: 'hidden',
          }}
        >
          <View
            style={{ width: '70%', height: '100%', backgroundColor: '#FFFFFF' }}
          />
        </View>
        <View
          className="flex-row justify-between"
          style={{ marginTop: 7 }}
        >
          <Text
            className="font-bold"
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)' }}
          >
            Güz Sezonu · ladder
          </Text>
          <View className="flex-row items-center" style={{ gap: 3 }}>
            <Text className="text-white font-bold" style={{ fontSize: 11 }}>
              Sezona git
            </Text>
            <Icon name="chevR" size={13} color="#FFFFFF" />
          </View>
        </View>
      </Pressable>

      {stuck && (
        <Pressable
          onPress={() => router.push('/(tabs)/profile' as never)}
          className="flex-row items-center bg-clay-softer rounded-pill"
          style={{
            position: 'absolute',
            top: 200,
            left: 14,
            right: 14,
            zIndex: 6,
            paddingHorizontal: 13,
            paddingVertical: 8,
            gap: 10,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
          }}
        >
          <Text
            className="font-num font-extrabold"
            style={{
              fontSize: 15,
              color: colors.court,
              minWidth: 22,
              textAlign: 'center',
            }}
          >
            #{ME.rank}
          </Text>
          <Avatar name={ME.name} size={28} />
          <Text
            className="font-sans font-bold text-text"
            style={{ flex: 1, fontSize: 13 }}
          >
            Sen · sıralamadaki yerin
          </Text>
          <Text
            className="font-num font-extrabold text-text"
            style={{ fontSize: 14 }}
          >
            {ME.elo}
          </Text>
        </Pressable>
      )}

      <ScrollView
        onScroll={(e) => setStuck(e.nativeEvent.contentOffset.y > 210)}
        scrollEventThrottle={16}
        contentContainerStyle={{ padding: 14, paddingTop: 14, gap: 14 }}
      >
        {/* My standing */}
        <View
          className="flex-row items-center bg-surface rounded-lg"
          style={{
            padding: 15,
            gap: 13,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
          }}
        >
          <View style={{ alignItems: 'center', minWidth: 30 }}>
            <Text
              className="font-sans font-extrabold"
              style={{
                fontSize: 9.5,
                letterSpacing: 1.14,
                color: colors.court,
              }}
            >
              SEN
            </Text>
            <Text
              className="font-num font-extrabold text-text"
              style={{ fontSize: 28, lineHeight: 28 }}
            >
              {ME.rank}
            </Text>
          </View>
          <Avatar name={ME.name} size={46} ring={colors.court} />
          <View style={{ flex: 1 }}>
            <Text
              className="font-display font-bold text-text"
              style={{ fontSize: 16 }}
            >
              {ME.name}
            </Text>
            <View className="flex-row" style={{ gap: 6, marginTop: 5 }}>
              <View
                className="bg-court rounded-pill"
                style={{ paddingHorizontal: 9, paddingVertical: 3 }}
              >
                <Text
                  className="font-num font-extrabold text-white"
                  style={{ fontSize: 11.5 }}
                >
                  {ME.elo} ELO
                </Text>
              </View>
              <View
                className="rounded-pill"
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  backgroundColor: colors.claySoft,
                }}
              >
                <Text
                  className="font-num font-bold"
                  style={{ fontSize: 11.5, color: colors.win }}
                >
                  ▲ 22
                </Text>
              </View>
            </View>
          </View>
          <Icon name="chevR" size={18} color={colors.text3} />
        </View>

        {/* Top-3 podium — 2nd left, 1st center (elevated), 3rd right */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          {[1, 0, 2].map((order) => {
            const p = MOCK_LIST[order]!;
            const lv = levelForElo(p.elo);
            const podiumIdx = order;
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/user/${p.id}` as never)}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 18,
                  padding: 12,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  marginTop: order === 0 ? 0 : 10,
                  position: 'relative',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: -8,
                    left: '50%',
                    marginLeft: -11,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: PODIUM_COLORS[podiumIdx],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    className="font-num font-extrabold text-white"
                    style={{ fontSize: 11 }}
                  >
                    {podiumIdx + 1}
                  </Text>
                </View>
                <View style={{ marginTop: 6, marginBottom: 6 }}>
                  <Avatar
                    name={p.name}
                    size={order === 0 ? 52 : 44}
                    ring={order === 0 ? PODIUM_COLORS[0] : undefined}
                  />
                </View>
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 12.5 }}
                  numberOfLines={1}
                >
                  {p.name.split(' ')[0]}
                </Text>
                <Text
                  className="font-num font-bold"
                  style={{ fontSize: 15, color: lv.color, marginTop: 2 }}
                >
                  {p.elo}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Rest of ranks (4+) */}
        <View style={{ gap: 8 }}>
          {MOCK_LIST.slice(3).map((p) => {
            const lv = levelForElo(p.elo);
            const frozen = p.status === 'frozen_30';
            const isMe = p.id === 'me';
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/user/${p.id}` as never)}
                className="flex-row items-center rounded-md"
                style={{
                  padding: 11,
                  paddingHorizontal: 12,
                  gap: 10,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  backgroundColor: isMe ? colors.claySofter : colors.surface,
                  opacity: frozen ? 0.72 : 1,
                }}
              >
                <Text
                  className="font-num"
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    width: 22,
                    textAlign: 'center',
                    color: colors.text3,
                  }}
                >
                  {p.rank}
                </Text>
                <Avatar name={p.name} size={42} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 14.5 }}
                  >
                    {p.name}
                  </Text>
                  <View
                    className="flex-row items-center"
                    style={{ gap: 5, marginTop: 3 }}
                  >
                    {frozen ? (
                      <View
                        className="flex-row items-center rounded-pill"
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          gap: 3,
                          backgroundColor: colors.frozenSoft,
                        }}
                      >
                        <Icon
                          name="snow"
                          size={10}
                          color={colors.frozen}
                          stroke={2.4}
                        />
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '800',
                            color: colors.frozen,
                          }}
                        >
                          Donmuş
                        </Text>
                      </View>
                    ) : (
                      <>
                        <LevelIcon level={lv} size={13} />
                        <Text
                          className="font-sans font-semibold"
                          style={{ fontSize: 12, color: colors.text3 }}
                        >
                          {lv.name}
                        </Text>
                      </>
                    )}
                    <Text
                      className="font-sans"
                      style={{ fontSize: 11.5, color: colors.text3 }}
                    >
                      · {p.wl[0]}G {p.wl[1]}M
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    alignItems: 'flex-end',
                    gap: 4,
                    opacity: frozen ? 0.5 : 1,
                  }}
                >
                  <Sparkline data={p.trend} color="auto" w={46} h={15} />
                  <FormDots form={p.form} size={9} />
                </View>
                <Text
                  className="font-num font-extrabold"
                  style={{
                    fontSize: 19,
                    color: frozen ? colors.text3 : colors.text,
                    minWidth: 44,
                    textAlign: 'right',
                  }}
                >
                  {p.elo}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
