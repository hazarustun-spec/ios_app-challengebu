import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { Toggle } from '../../components/ui/Toggle';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useDepartments } from '../../hooks/use-departments';
import { useOnboardingStore } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;

export default function DepartmentScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const { data: departments, isLoading } = useDepartments();

  const [departmentId, setDepartmentId] = useState<string | undefined>(draft.departmentId);
  const [showDepartment, setShowDepartment] = useState(draft.showDepartment);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (!departmentId) {
      setError('Bölümünü seç');
      return;
    }
    update({ departmentId, showDepartment });
    router.push('/(onboarding)/class-year');
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  const options = (departments ?? []).map((d) => ({ value: d.id, label: d.name }));

  return (
    <StepLayout step={5} total={TOTAL_STEPS} title="Bölüm" onNext={handleNext}>
      <View className="mb-4 max-h-72">
        <ScrollView>
          <RadioGroup
            label="Bölümünü seç"
            options={options}
            value={departmentId}
            onChange={setDepartmentId}
            error={error}
          />
        </ScrollView>
      </View>
      <Toggle label="Bölümü profilimde göster" value={showDepartment} onValueChange={setShowDepartment} />
    </StepLayout>
  );
}
