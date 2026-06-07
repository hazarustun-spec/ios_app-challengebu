import { Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuthStore } from '../../stores/auth-store';

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold text-gray-900">
          Hoş geldin, {profile?.firstName ?? 'oyuncu'}!
        </Text>
        <Text className="mt-4 text-center text-gray-600">
          Maç akışı Plan 4'te gelecek.
        </Text>
      </View>
    </ScreenContainer>
  );
}
