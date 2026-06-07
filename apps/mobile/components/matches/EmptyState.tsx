import { Text, View } from 'react-native';

interface Props {
  title: string;
  message: string;
  icon?: string;
}

export function EmptyState({ title, message, icon = '🎾' }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="mb-4 text-5xl">{icon}</Text>
      <Text className="mb-2 text-center text-lg font-semibold text-gray-900">{title}</Text>
      <Text className="text-center text-base text-gray-600">{message}</Text>
    </View>
  );
}
