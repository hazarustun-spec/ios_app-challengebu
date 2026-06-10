import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useSignOut } from '../../hooks/use-sign-out';
import { invokeFunction } from '../../lib/invoke-function';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';

export default function SettingsScreen() {
  const signOutStore = useAuthStore((s) => s.signOut);
  const session = useAuthStore((s) => s.session);
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  const signOutMutation = useSignOut();

  const handleLogout = () => {
    signOutMutation.mutate();
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
    if (!session?.access_token) {
      Alert.alert('Hata', 'Oturum bulunamadı');
      return;
    }
    try {
      await invokeFunction('anonymize-account', {}, session.access_token);
      await supabase.auth.signOut();
      signOutStore();
      router.replace('/(auth)/sign-in');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi');
    }
  };

  return (
    <ScreenContainer>
      <View className="flex-1 gap-3 pt-6">
        <Button onPress={() => router.push('/notification-preferences')} variant="secondary">
          Bildirim Tercihleri
        </Button>
        {isAdmin ? (
          <Button onPress={() => router.push({ pathname: '/(admin)' })} variant="secondary">
            Admin Paneli
          </Button>
        ) : null}
        <Button onPress={handleLogout} variant="secondary" loading={signOutMutation.isPending}>
          Çıkış yap
        </Button>
        <Text className="mt-6 text-sm text-gray-500">Hesabını kalıcı olarak sil:</Text>
        <Button onPress={confirmDelete} variant="ghost">
          Hesabımı sil
        </Button>
      </View>
    </ScreenContainer>
  );
}
