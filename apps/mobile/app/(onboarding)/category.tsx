// Onboarding · Yarışma kategorisi (D8)
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-onboarding.jsx — ObCategory

import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { OBFrame } from '../../components/onboarding/OBFrame';
import { PickList } from '../../components/onboarding/PickList';
import { Icon } from '../../components/ui/Icon';
import { useOnboardingStore, type GenderCategory } from '../../stores/onboarding-store';
import { colors } from '../../theme/colors';

export default function ObCategory() {
  const category = useOnboardingStore((s) => s.category);
  const setField = useOnboardingStore((s) => s.setField);

  return (
    <OBFrame
      step="category"
      title="Yarışma kategorin"
      subtitle="Hangi tekler sıralamalarında yer alacağını belirler. Open sıralamalarına herkes katılabilir."
      onNext={() => router.push('/(onboarding)/year')}
    >
      <PickList<GenderCategory>
        value={category}
        onPick={(v) => setField('category', v)}
        options={[
          {
            value: 'erkek',
            label: 'Erkek',
            icon: 'user',
            desc: 'Erkek Tek + Open Tek sıralamalarında yer alırsın.',
          },
          {
            value: 'kadin',
            label: 'Kadın',
            icon: 'user',
            desc: 'Kadın Tek + Open Tek sıralamalarında yer alırsın.',
          },
          {
            value: 'open_only',
            label: 'Sadece Open',
            icon: 'ranking',
            desc: 'Yalnızca Open Tek sıralamasında yer alırsın.',
          },
        ]}
      />
      <View
        style={{
          marginTop: 16,
          flexDirection: 'row',
          gap: 10,
          padding: 14,
          backgroundColor: colors.surface2,
          borderRadius: 18,
        }}
      >
        <Icon name="info" size={18} color={colors.info} />
        <Text
          className="font-sans text-text-2"
          style={{ fontSize: 13, lineHeight: 19, flex: 1 }}
        >
          Bu seçim sıralama uygunluğunu etkiler, ayarlardan sonra değiştirilebilir.
        </Text>
      </View>
    </OBFrame>
  );
}
