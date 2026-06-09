import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { useDisputeDetail } from '../../../hooks/use-dispute-detail';
import { useResolveDispute, type DisputeOutcome } from '../../../hooks/use-resolve-dispute';

export default function DisputeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useDisputeDetail(id);
  const resolve = useResolveDispute();

  if (detail.isLoading) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: 'İtiraz', headerShown: true }} />
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }
  const d = detail.data;
  if (!d) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: 'İtiraz', headerShown: true }} />
        <Text className="text-sm text-gray-500">İtiraz bulunamadı.</Text>
      </ScreenContainer>
    );
  }

  const submit = (outcome: DisputeOutcome, label: string) => {
    Alert.alert('Onayla', `${label} aksiyonunu uygulamak istiyor musun?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Uygula',
        onPress: () => {
          resolve.mutate(
            { disputeId: d.id, outcome },
            {
              onSuccess: () => router.back(),
              onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız'),
            },
          );
        },
      },
    ]);
  };

  return (
    <ScreenContainer scrollable>
      <Stack.Screen options={{ title: 'İtiraz', headerShown: true }} />
      <Text className="text-base font-semibold text-gray-900">İtiraz gerekçesi</Text>
      <Text className="mt-1 mb-4 text-sm text-gray-700">{d.reason}</Text>

      <Text className="mb-2 text-base font-semibold text-gray-900">Maç özeti</Text>
      <View className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
        <Text className="text-xs text-gray-600">Kategori: {d.match.category}</Text>
        <Text className="text-xs text-gray-600">Format: {d.match.format}</Text>
        <Text className="mt-1 text-sm font-semibold text-gray-900">
          Skor: {d.match.score_team_a} - {d.match.score_team_b}
        </Text>
        <Text className="mt-1 text-xs text-gray-600">
          Kazanan: {d.match.winner_team ?? 'belirsiz'}
        </Text>
      </View>

      <Text className="mb-2 text-base font-semibold text-gray-900">Submissions</Text>
      {d.submissions.length === 0 ? (
        <Text className="mb-4 text-xs text-gray-500">Submission yok.</Text>
      ) : (
        d.submissions.map((s) => (
          <View key={`${s.submitted_by}-${s.submitted_at}`} className="mb-2 rounded-lg border border-gray-200 bg-white p-3">
            <Text className="text-xs font-semibold text-gray-900">{s.submitted_by_name}</Text>
            <Text className="mt-1 text-[10px] text-gray-500">
              {new Date(s.submitted_at).toLocaleString('tr-TR')}
            </Text>
            <Text className="mt-1 text-[10px] text-gray-700">{JSON.stringify(s.score_details)}</Text>
          </View>
        ))
      )}

      <View className="mt-4 gap-2">
        <Button onPress={() => submit('approve_a', 'Skor A')}>A lehine onayla</Button>
        <Button onPress={() => submit('approve_b', 'Skor B')} variant="secondary">
          B lehine onayla
        </Button>
        <Button onPress={() => submit('void', 'Voided')} variant="ghost">
          Maç voided
        </Button>
        <Button onPress={() => submit('replay', 'Tekrar oynat')} variant="ghost">
          Tekrar oynat
        </Button>
      </View>
    </ScreenContainer>
  );
}
