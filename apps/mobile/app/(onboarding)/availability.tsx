// Onboarding · Müsaitlik (D13) — 2×3 checkbox grid
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObAvail

import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { OBFrame } from '../../components/onboarding/OBFrame';
import { CheckBox } from '../../components/ui/CheckBox';
import { useOnboardingStore, type AvailabilitySlot } from '../../stores/onboarding-store';
import { colors } from '../../theme/colors';
import { haptics } from '../../lib/haptics';

const SLOTS: { key: AvailabilitySlot; label: string }[] = [
  { key: 'wd_am', label: 'Hafta içi sabah' },
  { key: 'wd_noon', label: 'Hafta içi öğlen' },
  { key: 'wd_eve', label: 'Hafta içi akşam' },
  { key: 'we_am', label: 'Hafta sonu sabah' },
  { key: 'we_noon', label: 'Hafta sonu öğlen' },
  { key: 'we_eve', label: 'Hafta sonu akşam' },
];

export default function ObAvailability() {
  const availability = useOnboardingStore((s) => s.availability);
  const setField = useOnboardingStore((s) => s.setField);

  const toggle = (k: AvailabilitySlot) => {
    setField(
      'availability',
      availability.includes(k)
        ? availability.filter((x) => x !== k)
        : [...availability, k],
    );
  };

  return (
    <OBFrame
      step="availability"
      title="Müsaitliğin"
      subtitle="Sana uygun rakipler önerebilmemiz için ne zaman oynayabildiğini seç."
      canNext={availability.length > 0}
      onNext={() => router.push('/(onboarding)/photo')}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {SLOTS.map((s) => {
          const on = availability.includes(s.key);
          return (
            <Pressable
              key={s.key}
              onPress={() => {
                haptics.select();
                toggle(s.key);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={{
                width: '48%',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 14,
                borderRadius: 18,
                borderWidth: 1.5,
                borderColor: on ? colors.win : colors.borderStrong,
                backgroundColor: on ? colors.limeSoft : colors.surface,
              }}
            >
              <CheckBox checked={on} onChange={() => toggle(s.key)} />
              <Text
                className="font-sans font-bold"
                style={{ fontSize: 13.5, color: colors.text, flex: 1 }}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OBFrame>
  );
}
