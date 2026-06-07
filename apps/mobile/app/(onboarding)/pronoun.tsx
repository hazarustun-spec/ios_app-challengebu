import { router } from 'expo-router';
import { useState } from 'react';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { TextField } from '../../components/ui/TextField';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type PronounValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: PronounValue; label: string }[] = [
  { value: 'he/him', label: 'he/him' },
  { value: 'she/her', label: 'she/her' },
  { value: 'they/them', label: 'they/them' },
  { value: 'other', label: 'Diğer' },
];

export default function PronounScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [pronoun, setPronoun] = useState<PronounValue | undefined>(draft.pronoun);
  const [custom, setCustom] = useState(draft.pronounCustom ?? '');
  const [errors, setErrors] = useState<{ pronoun?: string; custom?: string }>({});

  const handleNext = () => {
    const errs: typeof errors = {};
    if (!pronoun) errs.pronoun = 'Bir seçim yap';
    if (pronoun === 'other' && !custom.trim()) errs.custom = 'Diğer için belirt';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    update({ pronoun, pronounCustom: pronoun === 'other' ? custom.trim() : undefined });
    router.push('/(onboarding)/gender-category');
  };

  return (
    <StepLayout step={3} total={TOTAL_STEPS} title="Pronoun" subtitle="Profilinde görünür" onNext={handleNext}>
      <RadioGroup
        label="Pronoun"
        options={OPTIONS}
        value={pronoun}
        onChange={setPronoun}
        error={errors.pronoun}
      />
      {pronoun === 'other' && (
        <TextField
          label="Diğer (max 30 karakter)"
          placeholder="ze/zir"
          maxLength={30}
          value={custom}
          onChangeText={setCustom}
          error={errors.custom}
        />
      )}
    </StepLayout>
  );
}
