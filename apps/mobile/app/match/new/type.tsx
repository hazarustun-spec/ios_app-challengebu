// apps/mobile/app/match/new/type.tsx — Plan 8 Phase E10.
//
// Step 1 of the "Yeni Maç" wizard — picks between Sıralama Maçı (ranking,
// affects ELO) and Dostluk Maçı (friendly, ELO-neutral). Ports the design
// bundle's `NewMatchType` (see
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-match-flow.jsx
// `function NewMatchType(...)`) — two full-bleed color cards (court mavi
// vs pink-deep), each with a faded watermark glyph + tag pill + arrow
// CTA.

import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GradientBg, glowStyle } from '../../../components/ui/GradientCard';
import { router } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Icon, type IconName } from '../../../components/ui/Icon';
import { useNewMatchStore, type MatchKind, type CategoryKey } from '../../../stores/new-match-store';
import { useMyProfile } from '../../../hooks/use-profile';
import { defaultCategoryForGender } from '../../../lib/primary-category';
import { colors } from '../../../theme/colors';

interface KindCardConfig {
  kind: MatchKind;
  iconName: IconName;
  title: string;
  tag: string;
  desc: string;
  bg: string;
  arrowFg: string;
}

const CARDS: KindCardConfig[] = [
  {
    kind: 'ranking',
    iconName: 'trophy',
    title: 'Sıralama Maçı',
    tag: 'ELO ETKİLER',
    desc: "ELO'nu etkiler, sıralamada yükselirsin. Format kuralları zorunlu.",
    bg: colors.court,
    arrowFg: colors.court,
  },
  {
    kind: 'friendly',
    iconName: 'handshake',
    title: 'Dostluk Maçı',
    tag: 'EĞLENCE',
    desc: "ELO'ya etki etmez — eğlence ve antrenman için. İstatistiklere sayılmaz.",
    bg: colors.pinkDeep,
    arrowFg: colors.pinkDeep,
  },
];

export default function NewMatchType() {
  const setField = useNewMatchStore((s) => s.setField);

  // Pre-seed the wizard's category with a gender-appropriate default so that
  // female (kadin) and open_only users don't see "Erkek Tek" pre-selected.
  const myProfileQ = useMyProfile();
  useEffect(() => {
    if (myProfileQ.data?.gender_category) {
      setField('category', defaultCategoryForGender(myProfileQ.data.gender_category) as CategoryKey);
    }
  }, [myProfileQ.data?.gender_category]);

  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        large
        close
        title="Yeni Maç"
        subtitle="Ne tür bir maç oynamak istersin?"
        onBack={() => router.back()}
      />
      <View style={{ padding: 18, paddingTop: 14, gap: 16, flex: 1 }}>
        {CARDS.map((c) => (
          <Pressable
            key={c.kind}
            onPress={() => {
              setField('kind', c.kind);
              router.push('/match/new/path' as never);
            }}
            style={{
              flex: 1,
              backgroundColor: c.bg,
              borderRadius: 34,
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
              padding: 22,
              minHeight: 214,
              overflow: 'hidden',
              justifyContent: 'space-between',
              ...glowStyle(c.bg),
            }}
          >
            {/* Signature gradient + sheen (behind everything). */}
            <GradientBg color={c.bg} />

            {/* Watermark glyph — faded, anchored bottom-right. */}
            <View
              style={{
                position: 'absolute',
                right: -32,
                bottom: -34,
                opacity: 0.13,
              }}
              pointerEvents="none"
            >
              <Icon name={c.iconName} size={170} color="#FFFFFF" stroke={1.6} />
            </View>

            {/* Top row: icon tile + tag pill. */}
            <View className="flex-row items-center justify-between">
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  borderWidth: 1.5,
                  borderColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={c.iconName} size={28} color="#FFFFFF" />
              </View>
              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: '#FFFFFF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 9999,
                }}
              >
                <Text
                  className="font-sans font-extrabold text-white"
                  style={{ fontSize: 10.5, letterSpacing: 1.05 }}
                >
                  {c.tag}
                </Text>
              </View>
            </View>

            {/* Bottom block: title + desc + arrow CTA. */}
            <View>
              <Text
                className="font-display font-extrabold text-white"
                style={{ fontSize: 27, letterSpacing: -0.54 }}
              >
                {c.title}
              </Text>
              <Text
                className="font-sans text-white/80"
                style={{
                  fontSize: 13.5,
                  lineHeight: 19,
                  marginTop: 6,
                  maxWidth: '78%',
                }}
              >
                {c.desc}
              </Text>
              <View
                className="flex-row items-center"
                style={{ marginTop: 16, gap: 10 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    name="arrowRight"
                    size={19}
                    color={c.arrowFg}
                    stroke={2.5}
                  />
                </View>
                <Text
                  className="font-sans font-extrabold text-white"
                  style={{ fontSize: 14.5 }}
                >
                  Seç
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
