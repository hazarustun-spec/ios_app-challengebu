// Onboarding · Seviye (D11)
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObLevel

import { router } from 'expo-router';
import { OBFrame } from '../../components/onboarding/OBFrame';
import { PickList } from '../../components/onboarding/PickList';
import { useOnboardingStore, type SkillLevel } from '../../stores/onboarding-store';

export default function ObLevel() {
  const level = useOnboardingStore((s) => s.level);
  const setField = useOnboardingStore((s) => s.setField);

  return (
    <OBFrame
      step="level"
      title="Tenis seviyen"
      subtitle="Başlangıç ELO'nu belirlemeye yardımcı olur. İlk 10 maçta hızla kalibre olur."
      onNext={() => router.push('/(onboarding)/hand')}
    >
      <PickList<SkillLevel>
        value={level}
        onPick={(v) => setField('level', v)}
        options={[
          {
            value: 'baslangic',
            label: 'Başlangıç',
            icon: 'spark',
            desc: 'Yeni başlıyorum / temel vuruşlar.',
          },
          {
            value: 'orta',
            label: 'Orta',
            icon: 'bolt',
            desc: 'Düzenli oynuyorum, ralli kurabiliyorum.',
          },
          {
            value: 'ileri',
            label: 'İleri',
            icon: 'flame',
            desc: 'Maç tecrübem var, taktik oynuyorum.',
          },
        ]}
      />
    </OBFrame>
  );
}
