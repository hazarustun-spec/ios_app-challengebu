import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type GenderCategoryValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: GenderCategoryValue; label: string }[] = [
  { value: 'erkek', label: 'Erkek' },
  { value: 'kadin', label: 'Kadın' },
  { value: 'open_only', label: 'Sadece Open' },
];

export default function GenderCategoryScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [value, setValue] = useState<GenderCategoryValue | undefined>(draft.genderCategory);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (!value) {
      setError('Bir seçim yap');
      return;
    }
    update({ genderCategory: value });
    router.push('/(onboarding)/department');
  };

  return (
    <StepLayout
      step={4}
      total={TOTAL_STEPS}
      title="Yarışma kategorisi"
      onNext={handleNext}
    >
      <View className="mb-3 rounded-lg bg-blue-50 p-3">
        <Text className="text-sm text-blue-900">
          Bu seçim erkek/kadın kategorilerine katılımını belirler. Open kategorisine zaten dahilsin. Sezon başında değiştirebilirsin.
        </Text>
      </View>
      <RadioGroup label="Kategori" options={OPTIONS} value={value} onChange={setValue} error={error} />
    </StepLayout>
  );
}
