// apps/mobile/app/match/new/preview.tsx — Plan 8 Phase E14.
//
// Step 5 of "Yeni Maç" — final confirmation. Ports `MatchPreview` from
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-match-flow.jsx
// `function MatchPreview(...)`. Composition:
//
//   1. VS hero — me avatar + name/ELO  ·  VS  ·  opponent avatar
//      + name/ELO.
//   2. (ranking only) ELO prediction card — split into "Kazanırsan +X" /
//      "Kaybedersen -Y" tiles using the standard ELO expectation formula
//      with K=32. Friendly matches skip this card.
//   3. Summary table — tip / format / tarih·saat / kort rows.
//   4. (ranking only) "Format kurallarını oku (zorunlu)" link → E15.
//   5. Sticky "Teklifi gönder" CTA.

import { ScrollView, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { FORMATS } from '../../../lib/formats';
import { useNewMatchStore } from '../../../stores/new-match-store';
import { useAuthStore } from '../../../stores/auth-store';
import { colors } from '../../../theme/colors';

// Placeholder until we surface the player's real season_elo into the
// auth store. The current `profile` summary doesn't carry ELO yet.
const ME_ELO = 1487;
const K_FACTOR = 32;

/** Standard ELO expectation for player A vs player B. */
function expected(myElo: number, oppElo: number): number {
  return 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
}

export default function MatchPreview() {
  const nm = useNewMatchStore();
  const profile = useAuthStore((s) => s.profile);
  const meName = profile?.firstName ?? 'Sen';
  const fmt = FORMATS.find((f) => f.key === nm.format)!;

  // Fallback opponent only kicks in if someone deep-links directly to
  // /match/new/preview without going through the wizard.
  const opp =
    nm.opponent ?? { name: 'Berk Aydın', elo: 1748, userId: 'fallback' };
  const e = expected(ME_ELO, opp.elo);
  const winDelta = Math.round(K_FACTOR * (1 - e));
  const lossDelta = -Math.round(K_FACTOR * e);

  const rows: Array<[string, string]> = [
    ['Tip', nm.kind === 'ranking' ? '🏆 Sıralama Maçı' : '🤝 Dostluk Maçı'],
    ['Format', `${fmt.name} · ${fmt.tag}`],
    ['Tarih', `${nm.date} · ${nm.time}`],
    ['Kort', nm.court],
  ];

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Teklif önizleme" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        {/* VS hero. */}
        <View
          className="flex-row items-center justify-center"
          style={{ gap: 18, paddingVertical: 14 }}
        >
          <View style={{ alignItems: 'center' }}>
            <Avatar name={meName} size={64} />
            <Text
              className="font-sans font-bold text-text"
              style={{ fontSize: 13.5, marginTop: 8 }}
            >
              Sen
            </Text>
            <Text
              className="font-num font-bold text-text-3"
              style={{ fontSize: 12 }}
            >
              {ME_ELO}
            </Text>
          </View>
          <Text
            className="font-num font-extrabold text-text-3"
            style={{ fontSize: 16 }}
          >
            VS
          </Text>
          <View style={{ alignItems: 'center' }}>
            <Avatar name={opp.name} size={64} />
            <Text
              className="font-sans font-bold text-text"
              style={{ fontSize: 13.5, marginTop: 8 }}
            >
              {opp.name.split(' ')[0]}
            </Text>
            <Text
              className="font-num font-bold text-text-3"
              style={{ fontSize: 12 }}
            >
              {opp.elo}
            </Text>
          </View>
        </View>

        {/* ELO prediction (ranking only). */}
        {nm.kind === 'ranking' && (
          <View
            className="rounded-lg overflow-hidden"
            style={{
              borderWidth: 1.5,
              borderColor: colors.borderStrong,
              backgroundColor: colors.surface,
            }}
          >
            <View className="flex-row">
              <View
                style={{
                  flex: 1,
                  padding: 13,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  borderRightWidth: 1.5,
                  borderColor: colors.borderStrong,
                }}
              >
                <Text
                  className="font-sans font-bold text-text-3"
                  style={{ fontSize: 11 }}
                >
                  Kazanırsan
                </Text>
                <Text
                  className="font-num font-extrabold"
                  style={{ fontSize: 26, color: colors.win, marginTop: 3 }}
                >
                  +{winDelta}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  padding: 13,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                }}
              >
                <Text
                  className="font-sans font-bold text-text-3"
                  style={{ fontSize: 11 }}
                >
                  Kaybedersen
                </Text>
                <Text
                  className="font-num font-extrabold"
                  style={{ fontSize: 26, color: colors.loss, marginTop: 3 }}
                >
                  {lossDelta}
                </Text>
              </View>
            </View>
            <View
              className="flex-row items-center bg-surface-2"
              style={{
                padding: 9,
                paddingHorizontal: 14,
                gap: 7,
                borderTopWidth: 1.5,
                borderColor: colors.borderStrong,
              }}
            >
              <Icon name="info" size={14} color={colors.text3} />
              <Text
                className="font-sans font-semibold text-text-2"
                style={{ fontSize: 11.5 }}
              >
                Tahmini · K-faktör {K_FACTOR}
              </Text>
            </View>
          </View>
        )}

        {/* Summary table. */}
        <View
          className="rounded-lg overflow-hidden"
          style={{
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
          }}
        >
          {rows.map(([l, v], i) => (
            <View
              key={l}
              className="flex-row items-center justify-between"
              style={{
                padding: 14,
                paddingHorizontal: 16,
                borderTopWidth: i ? 1 : 0,
                borderColor: colors.surface3,
              }}
            >
              <Text
                className="font-sans font-semibold text-text-3"
                style={{ fontSize: 14 }}
              >
                {l}
              </Text>
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 14 }}
              >
                {v}
              </Text>
            </View>
          ))}
        </View>

        {/* Format rules link — ranking only. */}
        {nm.kind === 'ranking' && (
          <Pressable
            onPress={() =>
              router.push(
                `/match/new/format-rules?format=${nm.format}` as never,
              )
            }
            className="flex-row items-center bg-clay-softer rounded-md"
            style={{
              padding: 14,
              gap: 10,
              borderWidth: 1,
              borderColor: colors.claySoft,
            }}
          >
            <Icon name="info" size={18} color={colors.clay} />
            <Text
              className="font-sans font-bold"
              style={{ flex: 1, fontSize: 13.5, color: colors.clayText }}
            >
              Format kurallarını oku (zorunlu)
            </Text>
            <Icon name="chevR" size={18} color={colors.clay} />
          </Pressable>
        )}
      </ScrollView>
      <View style={{ padding: 18 }}>
        <Button
          full
          size="lg"
          icon={<Icon name="share" size={17} color={colors.onLime} />}
          onPress={() => {
            // TODO(plan-8-E-polish): real createMatchRequest mutation +
            // success toast. For now we exit the wizard back to the
            // matches tab as a stand-in.
            router.dismissAll();
            router.replace('/(tabs)/matches' as never);
          }}
        >
          Teklifi gönder
        </Button>
      </View>
    </View>
  );
}
