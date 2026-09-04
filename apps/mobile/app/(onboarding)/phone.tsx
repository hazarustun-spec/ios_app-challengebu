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
        onChange={(v) => {
          // Strip everything but digits and drop a leading country prefix
          // ("+90…" or "0…") so what we store is always the 10-digit local
          // form (5XX XXX XX XX). The submit hook re-attaches "+90" so the
          // server ends up with the E.164 string phoneSchema requires.
          let digits = v.replace(/\D/g, '');
          if (digits.startsWith('90')) digits = digits.slice(2);
          else if (digits.startsWith('0')) digits = digits.slice(1);
          if (digits.length > 10) digits = digits.slice(0, 10);
          setField('phone', digits.length > 0 ? digits : null);
        }}
        keyboardType="phone-pad"
        big
        icon="phone"
        suffix="🇹🇷 +90"
      />
    </OBFrame>
  );
}
