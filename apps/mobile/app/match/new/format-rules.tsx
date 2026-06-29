// apps/mobile/app/match/new/format-rules.tsx — Plan 8 Phase E15.
//
// Step 6 of "Yeni Maç" — mandatory rule sheet that the proposer must
// acknowledge before sending a ranking match offer. Ports `FormatRules`
// from
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-match-flow.jsx
// `function FormatRules(...)`.
//
// Layout:
//   1. Hero card — brand-tinted with the format glyph, name, tag.
//   2. KURALLAR — numbered list of 4 rules per format.
//   3. ELO ÇARPANI — multiplier ladder + K-factor footnote.
//   4. Sticky footer — "okudum" checkbox gates the CTA. Confirming
//      returns to the preview screen.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import {
  FORMATS,
  K_ESTABLISHED,
  K_NEW_PLAYER,
  NEW_PLAYER_THRESHOLD,
  type FormatKey,
} from '../../../lib/formats';
import { useNewMatchStore } from '../../../stores/new-match-store';
import { colors } from '../../../theme/colors';

// Rule copy kept verbatim from the design bundle. When the rule set
// changes server-side later, mirror updates here too.
const RULES: Record<FormatKey, string[]> = {
  klasik: [
    '4 el (game) oynanır, ilk 4 ele ulaşan kazanır.',
    'Her el 15 / 30 / 40 / avantaj puanlamasıyla oynanır.',
    "40-40'ta avantaj sistemi geçerlidir (deuce).",
    '3-3 olursa maç berabere sayılır ve geçersiz kılınır (voided) — ELO değişmez.',
  ],
  tiebreak: [
    'Tek bir tiebreak oynanır, 10 sayıya ulaşan kazanır.',
    '9-9 olursa 2 sayı fark gerekir.',
    'Her 2 sayıda bir servis değişir.',
    'Hızlı ve keskin — tek oturuşta biter.',
  ],
  proset: [
    '8 oyuna (game) ilk ulaşan kazanır.',
    'Standart oyun puanlaması (15/30/40/Ad) geçerlidir.',
    '8-8 olursa 7 sayılık tiebreak oynanır.',
    'Antrenman ve ciddi maç arası dengeli format.',
  ],
  set3: [
    'En iyi 2/3 set — 2 set alan kazanır.',
    "Her set 6 oyuna, 5-5'te 7'ye, 6-6'da tiebreak.",
    'Final maçlarında kullanılır (ATP standardı).',
    'En uzun ve en prestijli format.',
  ],
};

export default function FormatRules() {
  const { format } = useLocalSearchParams<{ format?: FormatKey }>();
  const fmtKey: FormatKey = (format as FormatKey) ?? 'klasik';
  const f = FORMATS.find((x) => x.key === fmtKey)!;
  const rules = RULES[fmtKey];
  const nm = useNewMatchStore();
  // Initialise checkbox from persisted store so returning to this screen
  // after a prior confirmation shows the box pre-checked.
  const [read, setRead] = useState(nm.rulesAcknowledgedFormat === fmtKey);

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Format Kuralları" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        {/* Hero — brand-tinted format card. */}
        <View
          className="rounded-lg"
          style={{
            padding: 18,
            backgroundColor: `${f.color}1A`,
            borderWidth: 1,
            borderColor: `${f.color}40`,
          }}
        >
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 18,
                backgroundColor: `${f.color}2E`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={f.mark} size={24} color={f.color} />
            </View>
            <View>
              <Text
                className="font-sans font-extrabold text-text"
                style={{ fontSize: 19 }}
              >
                {f.name}
              </Text>
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 13, color: f.color }}
              >
                {f.tag}
              </Text>
            </View>
          </View>
        </View>

        {/* Rules list. */}
        <Text
          className="font-sans font-extrabold text-text-3"
          style={{ fontSize: 12.5, letterSpacing: 0.6 }}
        >
          KURALLAR
        </Text>
        <View style={{ gap: 10 }}>
          {rules.map((r, i) => (
            <View key={i} className="flex-row" style={{ gap: 12 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                <Text
                  className="font-num font-extrabold"
                  style={{ fontSize: 12.5, color: f.color }}
                >
                  {i + 1}
                </Text>
              </View>
              <Text
                className="font-sans text-text"
                style={{ flex: 1, fontSize: 14, lineHeight: 21 }}
              >
                {r}
              </Text>
            </View>
          ))}
        </View>

        {/* ELO multiplier. */}
        <Text
          className="font-sans font-extrabold text-text-3"
          style={{ fontSize: 12.5, letterSpacing: 0.6, marginTop: 4 }}
        >
          ELO ÇARPANI
        </Text>
        <View
          className="bg-surface rounded-md"
          style={{
            padding: 14,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          <Text
            className="font-num font-semibold text-text-2"
            style={{ fontSize: 13.5, lineHeight: 23 }}
          >
            {f.mult}
          </Text>
          <Text
            className="font-sans text-text-3"
            style={{ fontSize: 12, marginTop: 10, lineHeight: 18 }}
          >
            {`Net galibiyetler daha çok puan kazandırır. K-faktör: ilk ${NEW_PLAYER_THRESHOLD} maç K=${K_NEW_PLAYER}, sonrası K=${K_ESTABLISHED}.`}
          </Text>
        </View>
      </ScrollView>
      <View
        style={{
          padding: 20,
          borderTopWidth: 1,
          borderColor: colors.borderStrong,
        }}
      >
        <Pressable
          onPress={() => setRead(!read)}
          className="flex-row items-center"
          style={{ gap: 10, marginBottom: 12 }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 10,
              backgroundColor: read ? colors.win : 'transparent',
              borderWidth: read ? 0 : 2,
              borderColor: colors.borderStrong,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {read && <Icon name="check" size={15} color="#FFFFFF" stroke={3} />}
          </View>
          <Text
            className="font-sans font-bold text-text"
            style={{ fontSize: 13.5 }}
          >
            Kuralları okudum ve anladım
          </Text>
        </Pressable>
        <Button
          full
          size="lg"
          disabled={!read}
          onPress={() => {
            nm.setField('rulesAcknowledgedFormat', fmtKey);
            router.back();
          }}
        >
          Onayla ve devam et
        </Button>
      </View>
    </View>
  );
}
