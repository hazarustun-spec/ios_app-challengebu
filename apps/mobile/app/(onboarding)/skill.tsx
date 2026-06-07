import { router } from 'expo-router';
import { useState } from 'react';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type SkillValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: SkillValue; label: string }[] = [
  { value: 'baslangic', label: 'Başlangıç' },
  { value: 'orta', label: 'Orta' },
  { value: 'ileri', label: 'İleri' },
];

export default function SkillScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [value, setValue] = useState<SkillValue | undefined>(draft.skillSelfAssessment);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (!value) {
      setError('Bir seçim yap');
      return;
    }
    update({ skillSelfAssessment: value });
    router.push('/(onboarding)/hand');
  };

  return (
    <StepLayout step={7} total={TOTAL_STEPS} title="Tenis seviyen" subtitle="ELO'ya etkisi yok, sadece eşleşme önerisi için" onNext={handleNext}>
      <RadioGroup label="Seviye" options={OPTIONS} value={value} onChange={setValue} error={error} />
    </StepLayout>
  );
}
