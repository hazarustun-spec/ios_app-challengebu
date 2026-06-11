// Singles finale bracket — Plan 8 Phase F9.
//
// Ports the design bundle's `Bracket` (with `Slot` + `Match` helpers, see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-season.jsx
// `function Bracket()`) to React Native + NativeWind.
//
// Horizontal scroll with three column groups: QF / SF / Final + champion
// card.
//
// TODO(plan-8-F-polish): replace QF/SF/F statics with
// useFinaleBracket(season_id, category) hook output.

import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';

type SlotData = { name?: string; win?: boolean };

const QF: SlotData[][] = [
  [{ name: 'Kaan Demir', win: true }, { name: 'Eren Doğan' }],
  [{ name: 'Mert Şahin', win: true }, { name: 'Ali Koç' }],
  [{ name: 'Berk Aydın', win: true }, { name: 'Onur Çelik' }],
  [{ name: 'Emre Yıldız', win: true }, { name: 'Can Öztürk' }],
];

const SF: SlotData[][] = [
  [{ name: 'Kaan Demir', win: true }, { name: 'Mert Şahin' }],
  [{ name: 'Berk Aydın' }, { name: 'Emre Yıldız', win: true }],
];

const F: SlotData[] = [
  { name: 'Kaan Demir', win: true },
  { name: 'Emre Yıldız' },
];

function Slot({ name, win, top }: { name?: string; win?: boolean; top?: boolean }) {
  return (
    <View
      className="flex-row items-center"
      style={{
        padding: 7,
        paddingHorizontal: 9,
        gap: 7,
        backgroundColor: win ? colors.claySofter : colors.surface,
        borderTopWidth: top ? 0 : 1,
        borderColor: colors.surface3,
      }}
    >
      {name ? (
        <Avatar name={name} size={22} />
      ) : (
        <View
          style={{ width: 22, height: 22, borderRadius: 8, backgroundColor: colors.surface3 }}
        />
      )}
      <Text
        className="font-sans"
        style={{
          flex: 1,
          fontSize: 11.5,
          fontWeight: win ? '800' : '600',
          color: name ? colors.text : colors.text3,
        }}
        numberOfLines={1}
      >
        {name ? name.split(' ')[0] : '—'}
      </Text>
      {win && <Icon name="check" size={12} color={colors.clay} stroke={3} />}
    </View>
  );
}

function Match({ a, b }: { a: SlotData; b: SlotData }) {
  return (
    <View
      style={{
        width: 124,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.borderStrong,
      }}
    >
      <Slot name={a.name} win={a.win} top />
      <Slot name={b.name} win={b.win} />
    </View>
  );
}

export default function Bracket() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Sezon Finali"
        subtitle="Erkek Tek · Top 8 · tek eleme"
        onBack={() => router.back()}
      />
      <ScrollView horizontal contentContainerStyle={{ padding: 16, alignItems: 'center', gap: 18 }}>
        {/* Çeyrek */}
        <View style={{ gap: 14 }}>
          <Text
            className="font-sans font-extrabold text-text-3"
            style={{ fontSize: 10.5, letterSpacing: 0.6 }}
          >
            ÇEYREK
          </Text>
          {QF.map((m, i) => (
            <Match key={i} a={m[0]} b={m[1]} />
          ))}
        </View>
        {/* Yarı */}
        <View style={{ gap: 14, justifyContent: 'center' }}>
          <Text
            className="font-sans font-extrabold text-text-3"
            style={{ fontSize: 10.5, letterSpacing: 0.6 }}
          >
            YARI
          </Text>
          {SF.map((m, i) => (
            <View key={i} style={{ marginVertical: 34 }}>
              <Match a={m[0]} b={m[1]} />
            </View>
          ))}
        </View>
        {/* Final */}
        <View style={{ gap: 10, justifyContent: 'center' }}>
          <Text
            className="font-sans font-extrabold"
            style={{ fontSize: 10.5, letterSpacing: 0.6, color: colors.clay }}
          >
            FİNAL · 3 SET
          </Text>
          <Match a={F[0]} b={F[1]} />
          <View
            style={{
              marginTop: 14,
              width: 124,
              backgroundColor: colors.court,
              borderRadius: 18,
              padding: 14,
              paddingHorizontal: 12,
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
            }}
          >
            <Icon name="crown" size={24} color="#FFFFFF" />
            <Text
              className="font-sans font-extrabold text-white"
              style={{ fontSize: 13, marginTop: 4 }}
            >
              Kaan Demir
            </Text>
            <Text className="text-white/85 font-semibold" style={{ fontSize: 10.5 }}>
              Şampiyon
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
