import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { useRaiseDispute } from '../../hooks/use-raise-dispute';

export default function DisputeScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string>();
  const raise = useRaiseDispute();

  const onSubmit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setErr('Lütfen kısa bir açıklama gir (en az 5 karakter)');
      return;
    }
    if (trimmed.length > 500) {
      setErr('Açıklama 500 karakteri aşmamalı');
      return;
    }
    if (!matchId) return;
    try {
      await raise.mutateAsync({ matchId, reason: trimmed });
      Alert.alert('İtiraz açıldı', 'Admin karar verene kadar maç beklemede.', [
        { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
      ]);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'İtiraz açılamadı');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'İtiraz et', headerShown: true }} />
      <ScreenContainer scrollable>
        <View className="flex-1 gap-4">
          <View className="rounded-lg bg-yellow-50 p-3">
            <Text className="text-sm text-yellow-900">
              İtirazını kısaca açıkla. Admin maçı inceler ve karar verir. Bu işlem geri alınamaz.
            </Text>
          </View>
          <TextField
            label="Açıklama (5-500 karakter)"
            placeholder="Örn: Bob girdiği skor yanlış, ben 4-2 kazandım ama o 4-1 girmiş..."
            multiline
            numberOfLines={5}
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            value={reason}
            onChangeText={(v) => { setReason(v); setErr(undefined); }}
            error={err}
          />
          <View className="mt-auto">
            <Button onPress={onSubmit} loading={raise.isPending}>İtirazı gönder</Button>
          </View>
        </View>
      </ScreenContainer>
    </>
  );
}
