// apps/mobile/app/match/[id]/dispute.tsx — Plan 8 Phase E9.
//
// Dispute form — pick one of four reasons (score, notplayed, format, other),
// add a free-form note, submit. CTA is gated on the reason picker. The real
// mutation (`createDispute`) lands later; for now we replace to the matches
// tab on submit.

import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { colors } from '../../../theme/colors';

type DisputeReason = 'score' | 'notplayed' | 'format' | 'other';

const REASONS: Array<{ key: DisputeReason; label: string }> = [
  { key: 'score', label: 'Skor yanlış girilmiş' },
  { key: 'notplayed', label: 'Bu maç oynanmadı' },
  { key: 'format', label: 'Yanlış format/kategori' },
  { key: 'other', label: 'Diğer' },
];

export default function DisputeForm() {
  useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [note, setNote] = useState('');

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
          disabled={!reason}
          icon={<Icon name="flag" size={17} color={colors.onLime} />}
          onPress={() => {
            // TODO(plan-8-E-polish): createDispute mutation
            router.replace('/(tabs)/matches' as never);
          }}
        >
          İtirazı gönder
        </Button>
      </View>
    </View>
  );
}
