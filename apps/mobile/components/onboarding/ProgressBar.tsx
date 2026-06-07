import { View } from 'react-native';

interface Props {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  return (
    <View className="h-1 w-full bg-gray-200">
      <View className="h-full bg-primary" style={{ width: `${pct}%` }} />
    </View>
  );
}
