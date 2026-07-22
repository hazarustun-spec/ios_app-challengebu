// Onboarding · Sınıf (D10) — pill grid + show toggle
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObYear

import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { OBFrame } from '../../components/onboarding/OBFrame';
import { Toggle } from '../../components/ui/Toggle';
import { useOnboardingStore, type ClassYear } from '../../stores/onboarding-store';
import { colors } from '../../theme/colors';
import { haptics } from '../../lib/haptics';

const YEARS: { value: ClassYear; label: string }[] = [
  { value: 'hazirlik', label: 'Hazırlık' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: 'yl', label: 'Yüksek Lisans' },
  { value: 'doktora', label: 'Doktora' },
  { value: 'mezun', label: 'Mezun' },
];

export default function ObYear() {
  const classYear = useOnboardingStore((s) => s.classYear);
  const showClassYear = useOnboardingStore((s) => s.showClassYear);
  const setField = useOnboardingStore((s) => s.setField);

  return (
    <OBFrame
      step="year"
      title="Sınıfın"
      canNext={!!classYear}
      onNext={() => router.push('/(onboarding)/department')}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {YEARS.map((y) => {
          const on = classYear === y.value;
          return (
            <Pressable
              key={y.value}
              onPress={() => {
                haptics.select();
                setField('classYear', y.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 9999,
                borderWidth: 1.5,
                borderColor: on ? colors.clay : colors.borderStrong,
                backgroundColor: on ? colors.clay : colors.surface,
              }}
            >
              <Text
                className="font-sans font-bold"
                style={{
                  fontSize: 15,
                  color: on ? '#FFFFFF' : colors.text,
                }}
              >
                {y.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={() => setField('showClassYear', !showClassYear)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginTop: 22,
          paddingVertical: 6,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            className="font-sans font-bold text-text"
            style={{ fontSize: 14.5 }}
          >
            Profilimde göster
          </Text>
        </View>
        <Toggle
          value={showClassYear}
          onChange={(v) => setField('showClassYear', v)}
        />
      </Pressable>
    </OBFrame>
  );
}
