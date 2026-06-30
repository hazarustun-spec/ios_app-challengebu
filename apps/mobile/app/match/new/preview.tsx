// apps/mobile/app/match/new/preview.tsx — Plan 8 Phase E14 (live-wired).
//
// Step 5 of "Yeni Maç" — final confirmation, wired to live hooks.
// Reads draft from useNewMatchStore; on submit calls useCreateMatchRequest.
// Composition:
//
//   1. VS hero — me avatar + name/ELO  ·  VS  ·  opponent avatar
//      + name/ELO.
//   2. (ranking only) ELO prediction card — split into "Kazanırsan +X" /
//      "Kaybedersen -Y" tiles using the standard ELO expectation formula
//      with K=32. Friendly matches skip this card.
//   3. Summary table — tip / format / tarih·saat / kort rows.
//   4. (ranking only) "Format kurallarını oku (zorunlu)" link → E15.
//   5. Sticky "Teklifi gönder" CTA.
//
// Live data:
//   - useNewMatchStore → draft state (kind, path, category, format, date,
//     time, court, opponent)
//   - useMyRankings → real ELO for the VS hero and ELO prediction card
//   - useCourts → resolve nm.court (UUID) → court name for the summary row
//   - useCreateMatchRequest → mutation called on CTA press

import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { clientKFactor, FORMATS, UI_TO_DB_FORMAT } from '../../../lib/formats';
import { formatDateLabel } from '../../../lib/match-dates';
import { useNewMatchStore } from '../../../stores/new-match-store';
import { useAuthStore } from '../../../stores/auth-store';
import { useMyRankings } from '../../../hooks/use-my-rankings';
import { useCourts } from '../../../hooks/use-courts';
import { useCreateMatchRequest } from '../../../hooks/use-create-match-request';
import { colors } from '../../../theme/colors';

/** Standard ELO expectation for player A vs player B. */
function expected(myElo: number, oppElo: number): number {
  return 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
}

/** Pick the ranking row that best matches the chosen category.
 *  Falls back to the first row available, or null if none loaded yet. */
function pickRankingRow(
  rows: { category: string; rating: number; matches_played: number }[],
  category: string,
): { rating: number; matches_played: number } | null {
  const exact = rows.find((r) => r.category === category);
  if (exact) return exact;
  return rows[0] ?? null;
}

export default function MatchPreview() {
  const nm = useNewMatchStore();
  const profile = useAuthStore((s) => s.profile);
  const meName = profile?.firstName ?? 'Sen';
  const fmt = FORMATS.find((f) => f.key === nm.format)!;

  // --- Live ELO (my own) ---
  const rankingsQ = useMyRankings();
  const rankings = rankingsQ.data ?? [];
  const myRow = pickRankingRow(rankings, nm.category);
  const ME_ELO = myRow?.rating ?? null;
  // K-factor depends on how many ranked matches the user has played —
  // use the server's thresholds exported from lib/formats.ts.
  const K_FACTOR = clientKFactor(myRow?.matches_played ?? 0);

  // --- Courts (to resolve the stored court UUID → display name) ---
  const courtsQ = useCourts();
  const courts = courtsQ.data ?? [];
  const courtName = courts.find((c) => c.id === nm.court)?.name ?? '—';

  // --- Submit mutation ---
  const createRequest = useCreateMatchRequest();
  const [submitting, setSubmitting] = useState(false);

  // Open calls have no specific target — anyone applies later. Direct
  // challenges carry the chosen opponent.
  const isOpen = nm.path === 'open';
  const isDoubles = nm.category.endsWith('_cift');
  const opp = isOpen ? null : nm.opponent;

  // ELO prediction deltas (only when both ELOs are known and match is ranked)
  const eloReady = ME_ELO !== null && opp !== null;
  const winDelta = eloReady
    ? Math.round(K_FACTOR * (1 - expected(ME_ELO!, opp!.elo)))
    : null;
  const lossDelta = eloReady
    ? -Math.round(K_FACTOR * expected(ME_ELO!, opp!.elo))
    : null;

  const rows: Array<[string, string]> = [
    ['Tip', nm.kind === 'ranking' ? 'Sıralama Maçı' : 'Dostluk Maçı'],
    ['Format', `${fmt.name} · ${fmt.tag}`],
    ['Tarih', `${formatDateLabel(nm.date)} · ${nm.time}`],
    ['Kort', courtName],
  ];

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      await createRequest.mutateAsync({
        type: isOpen ? 'open_call' : 'direct_challenge',
        targetId: isOpen ? undefined : nm.opponent?.userId,
        category: nm.category,
        format: UI_TO_DB_FORMAT[nm.format],
        isRated: nm.kind === 'ranking',
        proposedDate: nm.date,
        proposedTime: nm.time,
        courtId: nm.court,
        creatorPartnerId: nm.partner?.userId,
        targetPartnerId: isDoubles && !isOpen ? nm.opponentPartner?.userId : undefined,
      });
      nm.reset();
      router.dismissAll();
      router.replace('/(tabs)/matches' as never);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.';
      Alert.alert('Teklif gönderilemedi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Teklif önizleme" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        {/* VS hero — 1v1 for singles, 2v2 for doubles. */}
        {isDoubles ? (
          <View
            className="flex-row items-center justify-center"
            style={{ gap: 16, paddingVertical: 14 }}
          >
            {/* Team A: creator + partner */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Avatar name={meName} size={44} />
                <Avatar name={nm.partner?.name ?? '?'} size={44} />
              </View>
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}
              >
                Sen
              </Text>
              <Text
                className="font-sans text-text-3"
                style={{ fontSize: 11.5, textAlign: 'center' }}
              >
                + {nm.partner?.name.split(' ')[0] ?? '—'}
              </Text>
            </View>
            <Text
              className="font-num font-extrabold text-text-3"
              style={{ fontSize: 16 }}
            >
              VS
            </Text>
            {/* Team B: opponent + opponent partner */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              {isOpen ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Avatar name="?" size={44} />
                    <Avatar name="?" size={44} />
                  </View>
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}
                  >
                    Açık İlan
                  </Text>
                  <Text
                    className="font-sans text-text-3"
                    style={{ fontSize: 11.5, textAlign: 'center' }}
                  >
                    rakip bekleniyor
                  </Text>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Avatar name={opp?.name ?? '?'} size={44} />
                    <Avatar name={nm.opponentPartner?.name ?? '?'} size={44} />
                  </View>
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}
                  >
                    {opp ? opp.name.split(' ')[0] : '—'}
                  </Text>
                  <Text
                    className="font-sans text-text-3"
                    style={{ fontSize: 11.5, textAlign: 'center' }}
                  >
                    + {nm.opponentPartner?.name.split(' ')[0] ?? '—'}
                  </Text>
                </>
              )}
            </View>
          </View>
        ) : (
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
                {rankingsQ.isLoading ? '—' : (ME_ELO ?? '—')}
              </Text>
            </View>
            <Text
              className="font-num font-extrabold text-text-3"
              style={{ fontSize: 16 }}
            >
              VS
            </Text>
            <View style={{ alignItems: 'center' }}>
              <Avatar name={isOpen ? 'İlan' : (opp?.name ?? '?')} size={64} />
              <Text
                className="font-sans font-bold text-text"
                style={{ fontSize: 13.5, marginTop: 8 }}
              >
                {isOpen ? 'Açık İlan' : opp ? opp.name.split(' ')[0] : '—'}
              </Text>
              <Text
                className="font-num font-bold text-text-3"
                style={{ fontSize: 12 }}
              >
                {isOpen ? 'rakip bekleniyor' : (opp?.elo ?? '—')}
              </Text>
            </View>
          </View>
        )}

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
                  {winDelta !== null ? `+${winDelta}` : '—'}
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
                  {lossDelta !== null ? lossDelta : '—'}
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
        {nm.kind === 'ranking' && (() => {
          const rulesRead = nm.rulesAcknowledgedFormat === nm.format;
          return (
            <Pressable
              onPress={() =>
                router.push(
                  `/match/new/format-rules?format=${nm.format}` as never,
                )
              }
              className="flex-row items-center rounded-md"
              style={{
                padding: 14,
                gap: 10,
                borderWidth: 1,
                borderColor: rulesRead ? colors.win : colors.claySoft,
                backgroundColor: rulesRead ? colors.limeSoft : colors.claySofter,
              }}
            >
              <Icon
                name={rulesRead ? 'check' : 'info'}
                size={18}
                color={rulesRead ? colors.win : colors.clay}
              />
              <Text
                className="font-sans font-bold"
                style={{ flex: 1, fontSize: 13.5, color: colors.clayText }}
              >
                {rulesRead
                  ? 'Format kuralları okundu'
                  : 'Format kurallarını oku (zorunlu)'}
              </Text>
              <Icon name="chevR" size={18} color={rulesRead ? colors.win : colors.clay} />
            </Pressable>
          );
        })()}
      </ScrollView>
      <View style={{ padding: 18 }}>
        <Button
          full
          size="lg"
          disabled={nm.kind === 'ranking' && nm.rulesAcknowledgedFormat !== nm.format}
          icon={
            submitting ? (
              <ActivityIndicator size="small" color={colors.onLime} />
            ) : (
              <Icon name="share" size={17} color={colors.onLime} />
            )
          }
          onPress={handleSubmit}
        >
          {submitting ? 'Gönderiliyor…' : 'Teklifi gönder'}
        </Button>
      </View>
    </View>
  );
}
