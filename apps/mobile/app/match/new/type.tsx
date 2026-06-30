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
  motifColor: string;   // darker-tinted watermark color
  accentColor: string;  // icon tile icon, pill text, arrow circle bg, "Seç" text
}

const CARDS: KindCardConfig[] = [
  {
    kind: 'ranking',
    iconName: 'trophy',
    title: 'Sıralama Maçı',
    tag: 'ELO ETKİLER',
    desc: "ELO'nu etkiler, sıralamada yükselirsin. Format kuralları zorunlu.",
    bg: colors.court,        // #2270BC
    motifColor: '#1B5EA0',
    accentColor: colors.court,  // court blue (arrow circle, icon, pill text)
  },
  {
    kind: 'friendly',
    iconName: 'people',
    title: 'Dostluk Maçı',
    tag: 'EĞLENCE',
    desc: "ELO'ya etki etmez — eğlence ve antrenman için. İstatistiklere sayılmaz.",
    bg: '#C81C82',
    motifColor: '#A8156C',
    accentColor: '#C81C82',  // pink
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
              borderRadius: 30,
              padding: 24,
              minHeight: 300,
              overflow: 'hidden',
              justifyContent: 'space-between',
            }}
          >
            {/* Watermark glyph — faded, anchored bottom-right, darker-tinted. */}
            <View
              style={{
                position: 'absolute',
                right: -32,
                bottom: -34,
                opacity: 0.13,
              }}
              pointerEvents="none"
            >
              <Icon name={c.iconName} size={170} color={c.motifColor} stroke={1.6} />
            </View>

            {/* Top row: white icon tile + white pill badge. */}
            <View className="flex-row items-start justify-between">
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={c.iconName} size={28} color={c.accentColor} />
              </View>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 9999,
                }}
              >
                <Text
                  className="font-sans font-extrabold"
                  style={{ fontSize: 11, letterSpacing: 0.5, color: c.accentColor }}
                >
                  {c.tag}
                </Text>
              </View>
            </View>

            {/* Bottom block: title + desc + white pill "Seç" CTA. */}
            <View>
              <Text
                className="font-display font-bold text-white"
                style={{ fontSize: 32, letterSpacing: -0.64 }}
              >
                {c.title}
              </Text>
              <Text
                className="font-sans font-medium"
                style={{
                  fontSize: 15,
                  lineHeight: 22.5,
                  marginTop: 8,
                  maxWidth: '82%',
                  color: 'rgba(255,255,255,0.82)',
                }}
              >
                {c.desc}
              </Text>

              {/* White pill: accent circle with white arrow + "Seç" label. */}
              <View
                style={{
                  marginTop: 22,
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 9999,
                  paddingLeft: 6,
                  paddingRight: 24,
                  paddingVertical: 6,
                  gap: 13,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: c.accentColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="arrowRight" size={19} color="#FFFFFF" stroke={2.5} />
                </View>
                <Text
                  className="font-sans font-extrabold"
                  style={{ fontSize: 16, color: c.accentColor }}
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
