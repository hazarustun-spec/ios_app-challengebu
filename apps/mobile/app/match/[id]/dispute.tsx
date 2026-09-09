// apps/mobile/app/match/[id]/dispute.tsx — Plan 8 Phase E9, wired to live data.
//
// Dispute form — pick one of four reasons (score, notplayed, format, other),
// add a free-form note, submit. CTA is gated on the reason picker.
// Live data: match context via useMatchDetail(id), opponent name via
// useOpponentNames, submission via useRaiseDispute. On success navigates back
// to the matches tab; on error surfaces an inline error message.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { NavHeader } from '../../../components/ui/NavHeader';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { useRaiseDispute } from '../../../hooks/use-raise-dispute';
import { liveFormatRule } from '../../../lib/live-format';
import { resolveMatchSides, toTeams } from '../../../lib/match-sides';
import { userMessage } from '../../../lib/user-message';
import { useAuthStore } from '../../../stores/auth-store';
import { colors } from '../../../theme/colors';

type DisputeReason = 'score' | 'notplayed' | 'format' | 'other';

const REASONS: Array<{ key: DisputeReason; label: string }> = [
  { key: 'score', label: 'Skor yanlış girilmiş' },
  { key: 'notplayed', label: 'Bu maç oynanmadı' },
  { key: 'format', label: 'Yanlış format/kategori' },
  { key: 'other', label: 'Diğer' },
];

/** Digits only, capped at two, so the field can never carry a stray character. */
function sanitizeScore(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 2);
}

export default function DisputeForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [note, setNote] = useState('');
  // Kept as strings: an empty field has to stay empty, and a number state would
  // turn it into 0 and claim a score the reporter never entered.
  const [myScore, setMyScore] = useState('');
  const [oppScore, setOppScore] = useState('');

  const matchQ = useMatchDetail(id);
  const opponentNames = useOpponentNames();
  const raiseDispute = useRaiseDispute();
  const userId = useAuthStore((s) => s.user?.id);

  const match = matchQ.data ?? null;
  const opponentInfo = match ? opponentNames.resolve(match) : null;
  const opponentName = opponentInfo?.name ?? 'Rakip';
  const rule = liveFormatRule(match?.format);

  // Same single mapping the score screen uses. The claimed score is stored
  // against the match's fixed team sides, so it is translated out of
  // "mine"/"theirs" exactly once, by toTeams below.
  const sides = resolveMatchSides(match, userId);

  // A score is only claimed when BOTH boxes are filled — half a score is worse
  // than none, since an admin cannot tell which half is missing.
  const claimComplete = myScore !== '' && oppScore !== '';
  const claimPartial = (myScore !== '') !== (oppScore !== '');
  const showScoreClaim = reason !== null && reason !== 'notplayed';

  const handleSubmit = () => {
    if (!reason || !id) return;
    const payload = note.trim() ? `${reason}: ${note.trim()}` : reason;
    let claim: { claimedScoreA?: number; claimedScoreB?: number } = {};
    if (showScoreClaim && claimComplete && sides.resolved) {
      const { a, b } = toTeams(sides, Number(myScore), Number(oppScore));
      claim = { claimedScoreA: a, claimedScoreB: b };
    }
    raiseDispute.mutate(
      { matchId: id, reason: payload, ...claim },
      {
        onSuccess: () => {
          router.replace('/(tabs)/matches' as never);
        },
        onError: (err) => {
          const msg = userMessage(err, 'İtiraz gönderilemedi. Tekrar dene.');
          Alert.alert('Hata', msg);
        },
      },
    );
  };

  if (matchQ.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="İtiraz Et" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (matchQ.isError || (matchQ.isFetched && !match)) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="İtiraz Et" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
          <Text className="font-sans text-text-2" style={{ fontSize: 14, textAlign: 'center' }}>
            Maç bilgisi yüklenemedi. Lütfen geri dönüp tekrar dene.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="İtiraz Et" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View className="flex-row bg-surface-2 rounded-md" style={{ padding: 14, gap: 10 }}>
          <Icon name="info" size={18} color={colors.info} />
          <Text className="font-sans text-text-2" style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>
            {opponentName !== 'Rakip' ? `${opponentName} ile olan maçına itiraz ediyorsun. ` : ''}
            İtirazın bir admin tarafından incelenecek. Karar verilene kadar ELO değişimi askıya
            alınır.
          </Text>
        </View>

        <Text className="font-sans font-bold text-text-2" style={{ fontSize: 13 }}>
          İtiraz sebebi
        </Text>
        <View style={{ gap: 8 }}>
          {REASONS.map((r) => {
            const on = reason === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setReason(r.key)}
                className="flex-row items-center"
                style={{
                  padding: 14,
                  gap: 12,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: on ? colors.clay : colors.borderStrong,
                  backgroundColor: on ? colors.claySofter : colors.surface,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: on ? 0 : 2,
                    borderColor: colors.borderStrong,
                    backgroundColor: on ? colors.clay : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {on && <Icon name="check" size={12} color="#FFFFFF" stroke={3} />}
                </View>
                <Text className="font-sans font-bold text-text" style={{ fontSize: 14.5 }}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {showScoreClaim && (
          <View style={{ gap: 8, marginTop: 6 }}>
            <Text className="font-sans font-bold text-text-2" style={{ fontSize: 13 }}>
              {`Gerçek skor (${rule.unit})`}
            </Text>
            <Text className="font-sans text-text-3" style={{ fontSize: 12.5, lineHeight: 18 }}>
              Maçın gerçekte kaç {rule.unitPlural} bittiğini yaz — admin bunu değerlendirecek. Emin
              değilsen boş bırakabilirsin.
            </Text>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text className="font-sans text-text-3" style={{ fontSize: 12 }}>
                  Sen
                </Text>
                <TextInput
                  value={myScore}
                  onChangeText={(v) => setMyScore(sanitizeScore(v))}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={colors.text3}
                  accessibilityLabel={`Senin ${rule.unitPlural} sayın`}
                  style={{
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: colors.borderStrong,
                    backgroundColor: colors.surface,
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 20,
                    textAlign: 'center',
                    color: colors.text,
                  }}
                />
              </View>
              <Text className="font-num text-text-3" style={{ fontSize: 18, marginTop: 18 }}>
                –
              </Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text className="font-sans text-text-3" numberOfLines={1} style={{ fontSize: 12 }}>
                  {opponentName}
                </Text>
                <TextInput
                  value={oppScore}
                  onChangeText={(v) => setOppScore(sanitizeScore(v))}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={colors.text3}
                  accessibilityLabel={`${opponentName} ${rule.unitPlural} sayısı`}
                  style={{
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: colors.borderStrong,
                    backgroundColor: colors.surface,
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 20,
                    textAlign: 'center',
                    color: colors.text,
                  }}
                />
              </View>
            </View>
            {claimPartial && (
              <Text className="font-sans" style={{ fontSize: 12, color: colors.loss }}>
                İki skoru da yaz ya da ikisini de boş bırak.
              </Text>
            )}
          </View>
        )}

        <Text className="font-sans font-bold text-text-2" style={{ fontSize: 13, marginTop: 6 }}>
          Açıklama
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Ne olduğunu kısaca anlat…"
          placeholderTextColor={colors.text3}
          multiline
          numberOfLines={4}
          style={{
            padding: 14,
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
            fontFamily: 'PlusJakartaSans',
            fontSize: 15,
            color: colors.text,
            textAlignVertical: 'top',
            minHeight: 100,
          }}
        />
      </ScrollView>

      <View style={{ padding: 20 }}>
        <Button
          full
          size="lg"
          disabled={!reason || claimPartial || raiseDispute.isPending}
          icon={<Icon name="flag" size={17} color={colors.onLime} />}
          onPress={handleSubmit}
        >
          {raiseDispute.isPending ? 'Gönderiliyor…' : 'İtirazı gönder'}
        </Button>
      </View>
    </View>
  );
}
