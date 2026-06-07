import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { EmptyState } from '../../components/matches/EmptyState';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useApplicationsForRequest, type ApplicationRow } from '../../hooks/use-applications';
import { useSelectApplication } from '../../hooks/use-select-application';

export default function ApplicationsListScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { data: apps, isLoading } = useApplicationsForRequest(requestId);
  const select = useSelectApplication();

  const onSelect = (app: ApplicationRow) => {
    Alert.alert(
      'Seç',
      `${app.applicant?.first_name ?? 'Bu oyuncu'} ile maç oluşturulacak. Diğer başvurular otomatik kapanır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Seç',
          onPress: () =>
            select.mutate(
              { applicationId: app.id },
              {
                onSuccess: () => {
                  Alert.alert('Başarılı', 'Maç oluşturuldu.');
                  router.back();
                },
                onError: (e) =>
                  Alert.alert('Hata', e instanceof Error ? e.message : 'Seçilemedi'),
              },
            ),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Başvurular', headerShown: true }} />
        <ScreenContainer>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1e3a8a" />
          </View>
        </ScreenContainer>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Başvurular', headerShown: true }} />
      <ScreenContainer>
        <FlatList
          data={apps ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              disabled={item.status !== 'pending' || select.isPending}
              className={`mb-2 rounded-lg border p-3 ${
                item.status === 'selected' ? 'border-green-500 bg-green-50' :
                item.status === 'declined' ? 'border-gray-300 bg-gray-50' :
                'border-gray-300 bg-white active:bg-gray-50'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-gray-900">
                  {item.applicant?.first_name} {item.applicant?.last_name}
                </Text>
                <Text className="text-xs text-gray-500">
                  {item.status === 'pending' ? 'Bekliyor' :
                   item.status === 'selected' ? '✓ Seçildi' : '✗ Kapandı'}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Henüz başvuru yok"
              message="İnsanlar ilanını gördükçe başvurular burada görünecek."
              icon="📨"
            />
          }
        />
      </ScreenContainer>
    </>
  );
}
