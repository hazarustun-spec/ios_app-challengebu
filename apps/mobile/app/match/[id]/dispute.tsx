// apps/mobile/app/match/[id]/dispute.tsx — Plan 8 Phase E9, wired to live data.
//
// Dispute form — pick one of four reasons (score, notplayed, format, other),
// add a free-form note, submit. CTA is gated on the reason picker.
// Live data: match context via useMatchDetail(id), opponent name via
// useOpponentNames, submission via useRaiseDispute. On success navigates back
// to the matches tab; on error surfaces an inline error message.

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useRaiseDispute } from '../../../hooks/use-raise-dispute';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { colors } from '../../../theme/colors';

type DisputeReason = 'score' | 'notplayed' | 'format' | 'other';

const REASONS: Array<{ key: DisputeReason; label: string }> = [
  { key: 'score', label: 'Skor yanlış girilmiş' },
  { key: 'notplayed', label: 'Bu maç oynanmadı' },
  { key: 'format', label: 'Yanlış format/kategori' },
  { key: 'other', label: 'Diğer' },
];

export default function DisputeForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [note, setNote] = useState('');

  const matchQ = useMatchDetail(id);
  const opponentNames = useOpponentNames();
  const raiseDispute = useRaiseDispute();

  const match = matchQ.data ?? null;
  const opponentInfo = match ? opponentNames.resolve(match) : null;
  const opponentName = opponentInfo?.name ?? 'Rakip';

  const handleSubmit = () => {
    if (!reason || !id) return;
    const payload = note.trim() ? `${reason}: ${note.trim()}` : reason;
    raiseDispute.mutate(
      { matchId: id, reason: payload },
      {
        onSuccess: () => {
          router.replace('/(tabs)/matches' as never);
        },
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : 'İtiraz gönderilemedi. Tekrar dene.';
          Alert.alert('Hata', msg);
        },
      }
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
          <Text
            className="font-sans text-text-2"
            style={{ fontSize: 14, textAlign: 'center' }}
          >
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
        <View
          className="flex-row bg-surface-2 rounded-md"
          style={{ padding: 14, gap: 10 }}
        >
          <Icon name="info" size={18} color={colors.info} />
          <Text
            className="font-sans text-text-2"
            style={{ flex: 1, fontSize: 13, lineHeight: 19 }}
          >
            {opponentName !== 'Rakip'
              ? `${opponentName} ile olan maçına itiraz ediyorsun. `
              : ''}
            İtirazın bir admin tarafından incelenecek. Karar verilene kadar
            ELO değişimi askıya alınır.
          </Text>
        </View>

        <Text
          className="font-sans font-bold text-text-2"
          style={{ fontSize: 13 }}
        >
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
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 14.5 }}
                >
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          className="font-sans font-bold text-text-2"
          style={{ fontSize: 13, marginTop: 6 }}
        >
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
          disabled={!reason || raiseDispute.isPending}
          icon={<Icon name="flag" size={17} color={colors.onLime} />}
          onPress={handleSubmit}
        >
          {raiseDispute.isPending ? 'Gönderiliyor…' : 'İtirazı gönder'}
        </Button>
      </View>
    </View>
  );
}
