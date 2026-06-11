// Doubles finale bracket — Plan 8 Phase F10.
//
// Ports the design bundle's `DoublesBracket` (with `TeamSlot` + `TeamMatch`
// helpers, see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-season.jsx
// `function DoublesBracket()`) to React Native + NativeWind.
//
// Horizontal scroll with Yarı Final + Final + champion card. Each slot
// renders two stacked player avatars (the "team" view).
//
// TODO(plan-8-F-polish): replace SF/F statics with the doubles bracket
// hook output.

import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';

type Team = { team?: [string, string]; win?: boolean };

const SF: Team[][] = [
  [
    { team: ['Kaan Demir', 'Mert Şahin'], win: true },
    { team: ['Ali Koç', 'Onur Çelik'] },
  ],
  [
    { team: ['Berk Aydın', 'Eren Doğan'] },
    { team: ['Emre Yıldız', 'Can Öztürk'], win: true },
  ],
];

const F: Team[] = [
  { team: ['Kaan Demir', 'Mert Şahin'], win: true },
  { team: ['Emre Yıldız', 'Can Öztürk'] },
];

function TeamSlot({
  team,
  win,
  top,
}: {
  team?: [string, string];
  win?: boolean;
  top?: boolean;
}) {
  return (
    <View
      style={{
        padding: 7,
        paddingHorizontal: 9,
        backgroundColor: win ? colors.claySofter : colors.surface,
        borderTopWidth: top ? 0 : 1,
        borderColor: colors.surface3,
      }}
    >
      <View className="flex-row items-center justify-between">
        {team ? (
          <View className="flex-row items-center">
            <Avatar name={team[0]} size={20} />
            <View style={{ marginLeft: -6 }}>
              <Avatar name={team[1]} size={20} />
            </View>
          </View>
        ) : (
          <View
            style={{ width: 20, height: 20, borderRadius: 8, backgroundColor: colors.surface3 }}
          />
        )}
        {win && <Icon name="check" size={12} color={colors.clay} stroke={3} />}
      </View>
      <Text
        className="font-sans"
        style={{
          fontSize: 10.5,
          fontWeight: win ? '800' : '600',
          color: team ? colors.text : colors.text3,
          marginTop: 4,
        }}
        numberOfLines={1}
      >
        {team ? `${team[0].split(' ')[0]} & ${team[1].split(' ')[0]}` : '—'}
      </Text>
    </View>
  );
}

function TeamMatch({ a, b }: { a: Team; b: Team }) {
  return (
    <View
      style={{
        width: 138,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: colors.borderStrong,
      }}
    >
      <TeamSlot team={a.team} win={a.win} top />
      <TeamSlot team={b.team} win={b.win} />
    </View>
  );
}

export default function DoublesBracket() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Sezon Finali"
        subtitle="Erkek Çift · Top 4 · tek eleme"
        onBack={() => router.back()}
      />
      <ScrollView horizontal contentContainerStyle={{ padding: 16, alignItems: 'center', gap: 22 }}>
        <View style={{ gap: 16, justifyContent: 'center' }}>
          <Text
            className="font-sans font-extrabold text-text-3"
            style={{ fontSize: 10.5, letterSpacing: 0.6 }}
          >
            YARI FİNAL
          </Text>
          {SF.map((m, i) => (
            <TeamMatch key={i} a={m[0]} b={m[1]} />
          ))}
        </View>
        <View style={{ gap: 10, justifyContent: 'center' }}>
          <Text
            className="font-sans font-extrabold"
            style={{ fontSize: 10.5, letterSpacing: 0.6, color: colors.clay }}
          >
            FİNAL · 3 SET
          </Text>
          <TeamMatch a={F[0]} b={F[1]} />
          <View
            style={{
              marginTop: 14,
              width: 138,
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
              style={{ fontSize: 12.5, marginTop: 4 }}
            >
              Kaan & Mert
            </Text>
            <Text className="text-white/85 font-semibold" style={{ fontSize: 10.5 }}>
              Çift Şampiyon
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
