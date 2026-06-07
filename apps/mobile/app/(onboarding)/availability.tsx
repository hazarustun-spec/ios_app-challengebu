import { router } from 'expo-router';
import { useState } from 'react';
import { CheckboxGroup } from '../../components/ui/CheckboxGroup';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type AvailabilityValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: AvailabilityValue; label: string }[] = [
  { value: 'weekday_morning', label: 'Hafta içi sabah' },
  { value: 'weekday_noon', label: 'Hafta içi öğle' },
  { value: 'weekday_evening', label: 'Hafta içi akşam' },
  { value: 'weekend_morning', label: 'Hafta sonu sabah' },
  { value: 'weekend_noon', label: 'Hafta sonu öğle' },
  { value: 'weekend_evening', label: 'Hafta sonu akşam' },
];

export default function AvailabilityScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [value, setValue] = useState<AvailabilityValue[]>(draft.availabilityWindows);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (value.length === 0) {
      setError('En az bir zaman dilimi seç');
      return;
    }
    update({ availabilityWindows: value });
    router.push('/(onboarding)/avatar');
  };

  return (
    <StepLayout step={9} total={TOTAL_STEPS} title="Hangi zamanlarda oynayabilirsin?" onNext={handleNext}>
      <CheckboxGroup label="Müsait zamanlar" options={OPTIONS} value={value} onChange={setValue} error={error} />
    </StepLayout>
  );
}
