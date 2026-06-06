import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
  scrollable?: boolean;
}

export function ScreenContainer({ children, scrollable = false }: Props) {
  const Inner = (
    <View className="flex-1 bg-white px-6 py-4">{children}</View>
  );
  if (scrollable) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {Inner}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return <SafeAreaView className="flex-1 bg-white">{Inner}</SafeAreaView>;
}
