import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';

// Plan 7 Faz D ships only the route group + role gate. The six admin screens
// are wired up in Phases E/F/G — see plan 7 phase outline. For now every
// button is disabled; later phases will swap onPress + drop the "yakında"
// suffix. Styling stays at the ScreenContainer + Button primitive level on
// purpose: Plan 8 redesigns the admin surface end-to-end.

export default function AdminHomeScreen() {
  const noop = () => {};
  return (
    <ScreenContainer scrollable>
      <Text className="mb-4 text-xs text-gray-500">
        Admin işlemlerin audit log&apos;a kaydedilir.
      </Text>
      <View className="gap-3">
        <Button onPress={() => router.push('/(admin)/disputes')} variant="secondary">
          Bekleyen İtirazlar
        </Button>
        <Button onPress={noop} variant="secondary" disabled>
          Sezon Yönetimi (yakında)
        </Button>
        <Button onPress={noop} variant="secondary" disabled>
          Finale Bracket Yönetimi (yakında)
        </Button>
        <Button onPress={noop} variant="secondary" disabled>
          Kullanıcı Yönetimi (yakında)
        </Button>
        <Button onPress={noop} variant="secondary" disabled>
          Topluluk Duyurusu (yakında)
        </Button>
        <Button onPress={noop} variant="secondary" disabled>
          Sistem Sağlığı (yakında)
        </Button>
      </View>
    </ScreenContainer>
  );
}
