// Onboarding · Telefon (D6) — optional, skippable
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObPhone

import { router } from 'expo-router';
import { OBFrame } from '../../components/onboarding/OBFrame';
import { Field } from '../../components/ui/Field';
import { useOnboardingStore } from '../../stores/onboarding-store';

export default function ObPhone() {
  const phone = useOnboardingStore((s) => s.phone);
  const setField = useOnboardingStore((s) => s.setField);

  return (
    <OBFrame
      step="phone"
      title="Telefon (opsiyonel)"
      subtitle="Rakiplerinle kort koordinasyonu için kullanılır. İstersen sonra eklersin."
      onNext={() => router.push('/(onboarding)/pronoun')}
      onSkip={() => {
        setField('phone', null);
        router.push('/(onboarding)/pronoun');
      }}
    >
      <Field
        placeholder="5XX XXX XX XX"
        value={phone ?? ''}
        onChange={(v) => setField('phone', v.length > 0 ? v : null)}
        keyboardType="phone-pad"
        big
        icon="phone"
        suffix="🇹🇷 +90"
      />
    </OBFrame>
  );
}
