import { Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';

export default function ProfileScreen() {
  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl text-gray-700">Profil ekranı — Task 23'te</Text>
      </View>
    </ScreenContainer>
  );
}
