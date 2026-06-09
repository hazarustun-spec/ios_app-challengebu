import { useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { useAdminUpdateProfile } from '../../../hooks/use-admin-update-profile';
import { useAdminUserDetail } from '../../../hooks/use-admin-user-detail';

export default function AdminUserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const detail = useAdminUserDetail(userId);
  const update = useAdminUpdateProfile();

  if (detail.isLoading) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }
  const u = detail.data;
  if (!u) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Kullanıcı bulunamadı.</Text>
      </ScreenContainer>
    );
  }

  const apply = (
    label: string,
    patch: { role?: 'player' | 'admin'; status?: 'active' | 'suspended' | 'banned' },
  ) => {
    Alert.alert(`${label} uygulanacak`, 'Devam etmek istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Uygula',
        onPress: () =>
          update.mutate(
            { targetUserId: u.user_id, ...patch },
            {
              onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Başarısız'),
            },
          ),
      },
    ]);
  };

  return (
    <ScreenContainer scrollable>
      <View className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
        <Text className="text-base font-semibold text-gray-900">
          {u.first_name} {u.last_name}
        </Text>
        <Text className="mt-1 text-xs text-gray-500">Email: {u.email ?? '—'}</Text>
        <Text className="text-xs text-gray-500">Telefon: {u.phone ?? '—'}</Text>
        <Text className="mt-1 text-xs text-gray-500">Rol: {u.role}</Text>
        <Text className="text-xs text-gray-500">Durum: {u.status ?? '—'}</Text>
        <Text className="mt-1 text-[10px] text-gray-400">
          Kategori: {u.gender_category ?? '—'} · Son maç: {u.last_match_at ?? '—'}
        </Text>
      </View>

      <Text className="mb-2 text-xs font-semibold text-gray-700">Aksiyonlar</Text>
      <View className="gap-2">
        {u.status !== 'suspended' ? (
          <Button onPress={() => apply('Askıya al', { status: 'suspended' })} variant="secondary">
            Askıya al
          </Button>
        ) : null}
        {u.status !== 'banned' ? (
          <Button onPress={() => apply('Banla', { status: 'banned' })} variant="ghost">
            Banla
          </Button>
        ) : null}
        {u.status !== 'active' ? (
          <Button onPress={() => apply('Geri aktif et', { status: 'active' })} variant="secondary">
            Geri aktif et
          </Button>
        ) : null}
        {u.role === 'player' ? (
          <Button onPress={() => apply('Admin ata', { role: 'admin' })}>Admin ata</Button>
        ) : (
          <Button onPress={() => apply('Admin yetkisini al', { role: 'player' })} variant="ghost">
            Admin yetkisini al
          </Button>
        )}
      </View>
    </ScreenContainer>
  );
}
