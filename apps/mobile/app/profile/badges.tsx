// Badges — Plan 8 Phase F4.
//
// Ports the design bundle's `Badges` (see
// docs/superpowers/specs/plan-8-design-bundle/project/app/screens-profile.jsx
// `function Badges()`) to React Native + NativeWind.
//
// Grid of all badges (earned + locked) with a 3-pin selection for the
// profile vitrin. Picking the same badge a second time un-pins it; new
// pins past 3 are silently ignored (matches the source).
//
// TODO(plan-8-F-polish): swap `BADGES` / `EARNED` / `INITIAL_PIN` for the
// real badge catalogue + user_badges + user_badge_pins data.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Button } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/Icon';
import { colors } from '../../theme/colors';

interface BadgeDef {
  key: string;
  name: string;
  desc: string;
  icon: IconName;
  color: string;
}

// TODO(plan-8-F-polish): real catalog from /lib/badges + user data
const BADGES: BadgeDef[] = [
  { key: 'first_win', name: 'İlk Galibiyet', desc: 'İlk sıralama maçını kazan.', icon: 'medal', color: colors.acGold },
  { key: 'streak5', name: '5 Maç Serisi', desc: 'Üst üste 5 galibiyet.', icon: 'flame', color: colors.acGreen },
  { key: 'giant', name: 'Dev Avcısı', desc: '150+ ELO üstü rakibi yen.', icon: 'bolt', color: colors.acNavy },
  { key: 'iron', name: 'Demir İrade', desc: "3-3'ten dönüp kazan.", icon: 'shield', color: colors.acBlue },
  { key: 'season_top', name: 'Sezon Şampiyonu', desc: 'Sezon finalini kazan.', icon: 'crown', color: colors.acGold },
  { key: 'marathon', name: 'Maraton', desc: '20+ oyunluk maç tamamla.', icon: 'clock', color: colors.acDgreen },
  { key: 'social', name: 'Sosyal Kelebek', desc: '10 farklı rakiple oyna.', icon: 'handshake', color: colors.acBlue },
  { key: 'perfect', name: 'Kusursuz', desc: '4-0 / 10-0 / 8-0 kazan.', icon: 'star', color: colors.acGold },
];

const EARNED = ['first_win', 'streak5', 'giant', 'social', 'marathon'];
const INITIAL_PIN = ['first_win', 'streak5', 'giant'];

export default function Badges() {
  const [pinned, setPinned] = useState<string[]>(INITIAL_PIN);

  const togglePin = (k: string) => {
    setPinned((p) =>
      p.includes(k) ? p.filter((x) => x !== k) : p.length < 3 ? [...p, k] : p,
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Rozetler"
        subtitle={`${EARNED.length}/${BADGES.length} kazanıldı`}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <View
          className="flex-row bg-clay-softer rounded-md"
          style={{
            padding: 13,
            gap: 10,
            borderWidth: 1,
            borderColor: colors.claySoft,
          }}
        >
          <Icon name="star" size={18} color={colors.clay} />
          <Text
            className="font-sans text-text-2"
            style={{ flex: 1, fontSize: 12.5, lineHeight: 18 }}
          >
            Profilinde gösterilecek{' '}
            <Text className="font-bold text-text">3 rozet</Text> seç. (
            {pinned.length}/3)
          </Text>
        </View>

        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
        >
          {BADGES.map((b) => {
            const has = EARNED.includes(b.key);
            const isPin = pinned.includes(b.key);
            return (
              <Pressable
                key={b.key}
                onPress={() => has && togglePin(b.key)}
                style={{
                  width: '48%',
                  padding: 16,
                  paddingHorizontal: 12,
                  alignItems: 'center',
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: isPin ? colors.clay : colors.borderStrong,
                  backgroundColor: colors.surface,
                  opacity: has ? 1 : 0.55,
                  position: 'relative',
                }}
              >
                {isPin && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: colors.clay,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="check" size={11} color="#FFFFFF" stroke={3} />
                  </View>
                )}
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: has
                      ? `${b.color}24`
                      : colors.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Icon
                    name={has ? b.icon : 'lock'}
                    size={22}
                    color={has ? b.color : colors.text3}
                  />
                </View>
                <Text
                  className="font-sans font-extrabold text-text"
                  style={{ fontSize: 13.5, textAlign: 'center' }}
                >
                  {b.name}
                </Text>
                <Text
                  className="font-sans text-text-3"
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    lineHeight: 15,
                    textAlign: 'center',
                  }}
                >
                  {b.desc}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ padding: 18 }}>
        <Button full size="lg" onPress={() => router.back()}>
          Vitrini kaydet
        </Button>
      </View>
    </View>
  );
}
