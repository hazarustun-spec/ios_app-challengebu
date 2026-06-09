import { Stack } from 'expo-router';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { seasonDisplayName } from '@tennis/shared';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import {
  useAdminSeasons,
  useCloseSeason,
  useStartSeasonFinale,
  type AdminSeason,
} from '../../hooks/use-admin-seasons';

export default function AdminSeasonsScreen() {
  const list = useAdminSeasons();
  const startFinale = useStartSeasonFinale();
  const closeSeason = useCloseSeason();

  const handleStart = (s: AdminSeason) => {
    Alert.alert(
      'Sezon Finalini Başlat',
      `${seasonDisplayName(s.name)} ${s.year} için bracket'leri seed etmek istiyor musun?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Başlat',
          onPress: () =>
            startFinale.mutate(s.id, {
              onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Başlatılamadı'),
            }),
        },
      ],
    );
  };

  const handleClose = (s: AdminSeason) => {
    Alert.alert(
      'Sezonu Kapat',
      `${seasonDisplayName(s.name)} ${s.year} için ELO soft reset uygulansın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kapat',
          style: 'destructive',
          onPress: () =>
            closeSeason.mutate(s.id, {
              onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Kapatılamadı'),
            }),
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Sezon Yönetimi', headerShown: true }} />
      <FlatList
        data={list.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mb-3 rounded-lg border border-gray-200 bg-white p-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900">
                {seasonDisplayName(item.name)} {item.year}
              </Text>
              <Text className="text-xs text-gray-500">{item.status}</Text>
            </View>
            <Text className="mt-1 text-[10px] text-gray-500">
              {new Date(item.starts_at).toLocaleDateString('tr-TR')} →{' '}
              {new Date(item.ends_at).toLocaleDateString('tr-TR')}
            </Text>
            <Text className="mt-1 text-[10px] text-gray-500">
              Finale: {new Date(item.finale_starts_at).toLocaleDateString('tr-TR')} →{' '}
              {new Date(item.finale_ends_at).toLocaleDateString('tr-TR')} · Turnuva: {item.tournament_count}
            </Text>
            <View className="mt-3 gap-2">
              {item.status === 'active' || item.status === 'finale' ? (
                <Button onPress={() => handleStart(item)} variant="secondary">
                  Finale başlat
                </Button>
              ) : null}
              {item.status === 'finale' ? (
                <Button onPress={() => handleClose(item)} variant="ghost">
                  Sezonu kapat
                </Button>
              ) : null}
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />
        }
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-500">Sezon kaydı yok.</Text>
        }
      />
    </ScreenContainer>
  );
}
