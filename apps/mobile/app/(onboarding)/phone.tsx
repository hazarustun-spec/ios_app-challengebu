import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { TextField } from '../../components/ui/TextField';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const E164 = /^\+\d{10,15}$/;

export default function PhoneScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [phone, setPhone] = useState(draft.phone ?? '');
  const [error, setError] = useState<string>();

  const handleNext = () => {
    const trimmed = phone.trim();
    if (trimmed && !E164.test(trimmed)) {
      setError('E.164 formatında girmelisin (+905551234567)');
      return;
    }
    update({ phone: trimmed || undefined });
    router.push('/(onboarding)/pronoun');
  };

  return (
    <StepLayout step={2} total={TOTAL_STEPS} title="Telefon" subtitle="Opsiyonel" onNext={handleNext}>
      <View className="mb-3 rounded-lg bg-blue-50 p-3">
        <Text className="text-sm text-blue-900">
          Sadece maç koordinasyonu için, kabul ettiğin oyunculara gösterilir.
        </Text>
      </View>
      <TextField
        label="Telefon"
        placeholder="+905551234567"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        error={error}
      />
    </StepLayout>
  );
}
