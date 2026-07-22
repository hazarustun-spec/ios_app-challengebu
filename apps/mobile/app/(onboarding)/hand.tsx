// Onboarding · Dominant el (D12)
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObHand

import { router } from 'expo-router';
import { OBFrame } from '../../components/onboarding/OBFrame';
import { PickList } from '../../components/onboarding/PickList';
import { useOnboardingStore, type DominantHand } from '../../stores/onboarding-store';

export default function ObHand() {
  const hand = useOnboardingStore((s) => s.hand);
  const setField = useOnboardingStore((s) => s.setField);

  return (
    <OBFrame
      step="hand"
      title="Dominant elin"
      canNext={!!hand}
      onNext={() => router.push('/(onboarding)/availability')}
    >
      <PickList<DominantHand>
        value={hand}
        onPick={(v) => setField('hand', v)}
        cols={2}
        options={[
          { value: 'sol', label: 'Sol' },
          { value: 'sag', label: 'Sağ' },
        ]}
      />
    </OBFrame>
  );
}
