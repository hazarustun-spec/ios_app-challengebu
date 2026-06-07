import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';

export default function SettingsScreen() {
  const signOutStore = useAuthStore((s) => s.signOut);
  const session = useAuthStore((s) => s.session);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOutStore();
    router.replace('/(auth)/sign-in');
  };

  const confirmDelete = () => {
    Alert.alert(
      'Hesabını sil',
      'Bu işlem geri alınamaz. Profilin anonimleştirilir, maç geçmişin "Eski Üye" olarak korunur. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: secondConfirm },
      ],
    );
  };

  const secondConfirm = () => {
    Alert.alert('Son onay', 'Gerçekten silmek istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Evet, sil', style: 'destructive', onPress: doDelete },
    ]);
  };

  const doDelete = async () => {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/anonymize-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error?.message ?? 'Silme başarısız');
      }
      await supabase.auth.signOut();
      signOutStore();
      router.replace('/(auth)/sign-in');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi');
    }
  };

  return (
    <ScreenContainer>
      <View className="flex-1 gap-4 pt-8">
        <Button onPress={handleLogout} variant="secondary">
          Çıkış yap
        </Button>
        <Text className="mt-8 text-sm text-gray-500">Hesabını kalıcı olarak sil:</Text>
        <Button onPress={confirmDelete} variant="ghost">
          Hesabımı sil
        </Button>
      </View>
    </ScreenContainer>
  );
}
