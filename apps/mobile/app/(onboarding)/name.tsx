import { router } from 'expo-router';
import { useState } from 'react';
import { TextField } from '../../components/ui/TextField';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;

export default function NameScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [firstName, setFirstName] = useState(draft.firstName);
  const [lastName, setLastName] = useState(draft.lastName);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});

  const handleNext = () => {
    const errs: { firstName?: string; lastName?: string } = {};
    if (!firstName.trim()) errs.firstName = 'Adın gerekli';
    if (!lastName.trim()) errs.lastName = 'Soyadın gerekli';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    update({ firstName: firstName.trim(), lastName: lastName.trim() });
    router.push('/(onboarding)/phone');
  };

  return (
    <StepLayout step={1} total={TOTAL_STEPS} title="Adın ne?" onNext={handleNext}>
      <TextField
        label="Ad"
        placeholder="Ali"
        value={firstName}
        onChangeText={setFirstName}
        error={errors.firstName}
      />
      <TextField
        label="Soyad"
        placeholder="Yılmaz"
        value={lastName}
        onChangeText={setLastName}
        error={errors.lastName}
      />
    </StepLayout>
  );
}
