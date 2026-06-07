import { Text, View } from 'react-native';

interface Props {
  message: string;
}

export function MismatchBanner({ message }: Props) {
  return (
    <View className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3">
      <Text className="text-sm font-medium text-red-900">⚠️ {message}</Text>
    </View>
  );
}
