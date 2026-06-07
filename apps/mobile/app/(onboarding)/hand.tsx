import { router } from 'expo-router';
import { useState } from 'react';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type HandValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: HandValue; label: string }[] = [
  { value: 'sag', label: 'Sağ el' },
  { value: 'sol', label: 'Sol el' },
];

export default function HandScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [value, setValue] = useState<HandValue | undefined>(draft.dominantHand);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (!value) {
      setError('Bir seçim yap');
      return;
    }
    update({ dominantHand: value });
    router.push('/(onboarding)/availability');
  };

  return (
    <StepLayout step={8} total={TOTAL_STEPS} title="Dominant el" onNext={handleNext}>
      <RadioGroup label="El" options={OPTIONS} value={value} onChange={setValue} error={error} />
    </StepLayout>
  );
}
