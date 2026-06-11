// Onboarding · Ad Soyad (D5)
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObName

import { View } from 'react-native';
import { router } from 'expo-router';
import { OBFrame } from '../../components/onboarding/OBFrame';
import { Field } from '../../components/ui/Field';
import { useOnboardingStore } from '../../stores/onboarding-store';

export default function ObName() {
  const firstName = useOnboardingStore((s) => s.firstName);
  const lastName = useOnboardingStore((s) => s.lastName);
  const setField = useOnboardingStore((s) => s.setField);

  const canNext = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <OBFrame
      step="name"
      title="Adın ve soyadın"
      subtitle="Sıralama ve maçlarda bu isimle görüneceksin."
      canNext={canNext}
      onNext={() => router.push('/(onboarding)/phone')}
    >
      <View style={{ gap: 12 }}>
        <Field
          label="Ad"
          placeholder="Ad"
          value={firstName}
          onChange={(v) => setField('firstName', v)}
          icon="user"
          autoFocus
          big
        />
        <Field
          label="Soyad"
          placeholder="Soyad"
          value={lastName}
          onChange={(v) => setField('lastName', v)}
          icon="user"
          big
        />
      </View>
    </OBFrame>
  );
}
