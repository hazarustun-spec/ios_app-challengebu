import { Switch, Text, View } from 'react-native';

interface Props {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export function Toggle({ label, value, onValueChange }: Props) {
  return (
    <View className="mb-3 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
      <Text className="flex-1 text-base text-gray-800">{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}
