// Onboarding · Zamir (D7)
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObPronoun

import { router } from 'expo-router';
import { OBFrame } from '../../components/onboarding/OBFrame';
import { PickList } from '../../components/onboarding/PickList';
import { useOnboardingStore, type Pronoun } from '../../stores/onboarding-store';

export default function ObPronoun() {
  const pronoun = useOnboardingStore((s) => s.pronoun);
  const setField = useOnboardingStore((s) => s.setField);

  return (
    <OBFrame
      step="pronoun"
      title="Zamirin"
      subtitle="Profilinde 'Ali (he/him)' biçiminde küçük bir çip olarak görünür."
      canNext={!!pronoun}
      onNext={() => router.push('/(onboarding)/category')}
    >
      <PickList<Pronoun>
        value={pronoun}
        onPick={(v) => setField('pronoun', v)}
        options={[
          { value: 'he/him', label: 'he/him' },
          { value: 'she/her', label: 'she/her' },
          { value: 'they/them', label: 'they/them' },
          { value: 'other', label: 'Diğer / belirtmek istemiyorum' },
        ]}
      />
    </OBFrame>
  );
}
