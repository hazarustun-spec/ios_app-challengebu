import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { useConfirmMatch } from '../../../hooks/use-confirm-match';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useAuthStore } from '../../../stores/auth-store';

const FORMAT_LABELS: Record<string, string> = {
  bu_klasik: 'BÜ Klasik', hizli_tiebreak: 'Hızlı Tiebreak',
  pro_set_8: 'Pro Set 8', '3set_klasik': '3 Set Klasik',
};

export default function ConfirmMatchScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { data: m, isLoading } = useMatchDetail(matchId);
  const userId = useAuthStore((s) => s.user?.id);
  const confirm = useConfirmMatch();

  if (isLoading || !m || !matchId || !userId) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1e3a8a" />
        </View>
      </ScreenContainer>
    );
  }

  const onTeamA = m.team_a_player_ids.includes(userId);
  const myScore = onTeamA ? m.score_team_a : m.score_team_b;
  const oppScore = onTeamA ? m.score_team_b : m.score_team_a;
  const iWon = (onTeamA && m.winner_team === 'a') || (!onTeamA && m.winner_team === 'b');
  const voided = m.winner_team === 'void';
  const alreadyConfirmed = m.confirmed_by.includes(userId);

  const onConfirm = async () => {
    try {
      const res = await confirm.mutateAsync({ matchId });
      if (res.confirmed) {
        Alert.alert('Maç onaylandı', res.status === 'confirmed' ? 'ELO güncellendi.' : 'Maç voided sayıldı.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      } else if (res.alreadyConfirmed) {
        Alert.alert('Zaten onaylamıştın', 'Karşı tarafın onayı bekleniyor.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      } else {
        Alert.alert('Onayın kaydedildi', 'Karşı tarafın onayı bekleniyor.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      }
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Onaylanamadı');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Onayla', headerShown: true }} />
      <ScreenContainer>
        <View className="flex-1 gap-4">
          <View className="rounded-lg bg-gray-100 p-4">
            <Text className="mb-2 text-center text-sm text-gray-600">
              {FORMAT_LABELS[m.format] ?? m.format}
            </Text>
            <View className="items-center">
              {voided ? (
                <Text className="text-2xl font-bold text-gray-700">⚠️ Maç yapılmamış sayıldı (3-3)</Text>
              ) : (
                <>
                  <Text className="mb-1 text-base text-gray-600">{iWon ? 'Kazandın 🏆' : 'Kaybettin'}</Text>
                  <Text className="text-5xl font-bold text-gray-900">
                    {myScore} - {oppScore}
                  </Text>
                </>
              )}
            </View>
          </View>

          {m.is_rated && !voided && !alreadyConfirmed && (
            <View className="rounded-lg bg-blue-50 p-3">
              <Text className="text-sm text-blue-900">
                Bu sıralama maçı. Onayladığında ELO puanın güncellenecek.
              </Text>
            </View>
          )}

          {alreadyConfirmed && (
            <View className="rounded-lg bg-green-50 p-3">
              <Text className="text-sm text-green-900">
                ✓ Bu skoru zaten onayladın. Karşı tarafın onayı bekleniyor.
              </Text>
            </View>
          )}

          <View className="mt-auto">
            <Button onPress={onConfirm} loading={confirm.isPending} disabled={alreadyConfirmed}>
              {alreadyConfirmed ? 'Onaylandı' : 'Skoru onayla'}
            </Button>
          </View>
        </View>
      </ScreenContainer>
    </>
  );
}
