import { ActivityIndicator, View } from 'react-native';
import { RadioGroup } from '../ui/RadioGroup';
import { useCourts } from '../../hooks/use-courts';

interface Props {
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
}

export function CourtPicker({ value, onChange, error }: Props) {
  const { data: courts, isLoading } = useCourts();

  if (isLoading) {
    return (
      <View className="items-center py-4">
        <ActivityIndicator color="#1e3a8a" />
      </View>
    );
  }

  return (
    <RadioGroup
      label="Kort"
      options={(courts ?? []).map((c) => ({ value: c.id, label: c.name }))}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}
