// apps/mobile/app/match/new/path.tsx — Plan 8 Phase E11.
//
// Step 2 of "Yeni Maç" — picks Direkt Meydan Okuma vs Açık İlan. Ports
// `NewMatchPath` from
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-match-flow.jsx
// as two simple icon+label list rows that route forward to detail.

import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { useNewMatchStore, type MatchPath } from '../../../stores/new-match-store';
import { colors } from '../../../theme/colors';

interface OptCardProps {
  path: MatchPath;
  icon: IconName;
  title: string;
  desc: string;
}

const OPTS: OptCardProps[] = [
  {
    path: 'direct',
    icon: 'bolt',
    title: 'Direkt Meydan Okuma',
    desc: 'Belirli bir oyuncuya doğrudan teklif gönder.',
  },
  {
    path: 'open',
    icon: 'megaphone',
    title: 'Açık İlan',
    desc: 'İlan oluştur, uygun olan başvursun. Sen seç.',
  },
];

export default function NewMatchPath() {
  const setField = useNewMatchStore((s) => s.setField);

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Nasıl rakip bulalım?" onBack={() => router.back()} />
      <View style={{ padding: 18, gap: 12, flex: 1 }}>
        {OPTS.map((o) => (
          <Pressable
            key={o.path}
            onPress={() => {
              setField('path', o.path);
              router.push('/match/new/detail' as never);
            }}
            className="flex-row items-center bg-surface rounded-xl"
            style={{
              padding: 20,
              gap: 16,
              borderWidth: 1,
              borderColor: colors.borderStrong,
            }}
          >
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 18,
                backgroundColor: colors.surface2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={o.icon} size={24} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                className="font-sans font-extrabold text-text"
                style={{ fontSize: 17 }}
              >
                {o.title}
              </Text>
              <Text
                className="font-sans text-text-2"
                style={{ fontSize: 13.5, lineHeight: 19, marginTop: 4 }}
              >
                {o.desc}
              </Text>
            </View>
            <Icon name="chevR" size={20} color={colors.text3} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
