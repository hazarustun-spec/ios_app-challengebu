import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { Toggle } from '../../components/ui/Toggle';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type ClassYearValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: ClassYearValue; label: string }[] = [
  { value: 'hazirlik', label: 'Hazırlık' },
  { value: '1', label: '1. sınıf' },
  { value: '2', label: '2. sınıf' },
  { value: '3', label: '3. sınıf' },
  { value: '4', label: '4. sınıf' },
  { value: 'yl', label: 'Yüksek Lisans' },
  { value: 'doktora', label: 'Doktora' },
];

export default function ClassYearScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [value, setValue] = useState<ClassYearValue | undefined>(draft.classYear);
  const [show, setShow] = useState(draft.showClassYear);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (!value) {
      setError('Bir seçim yap');
      return;
    }
    update({ classYear: value, showClassYear: show });
    router.push('/(onboarding)/skill');
  };

  return (
    <StepLayout step={6} total={TOTAL_STEPS} title="Sınıf" onNext={handleNext}>
      <RadioGroup label="Sınıfını seç" options={OPTIONS} value={value} onChange={setValue} error={error} />
      <View className="mt-4 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
        <Text className="flex-1 text-base text-gray-800">Sınıfı profilimde göster</Text>
        <Toggle value={show} onChange={setShow} />
      </View>
    </StepLayout>
  );
}
