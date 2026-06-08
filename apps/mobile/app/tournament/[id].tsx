import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { BracketView } from '../../components/seasons/BracketView';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useTournamentBracket } from '../../hooks/use-tournament-bracket';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useTournamentBracket(id);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1e3a8a" />
        </View>
      </ScreenContainer>
    );
  }
  if (!data) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Turnuva bulunamadı.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <Text className="text-lg font-bold text-gray-900">
        {CATEGORY_LABELS[data.category] ?? data.category}
      </Text>
      <Text className="mb-3 text-xs text-gray-500">
        {data.bracket_size} oyuncu · {statusLabel(data.status)}
      </Text>
      {data.bracket_size !== 4 && data.bracket_size !== 8 ? (
        <View className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <Text className="text-xs text-amber-900">
            Beklenmedik bracket boyutu ({data.bracket_size}); ham slot listesini gösteriyoruz.
          </Text>
        </View>
      ) : null}
      <BracketView bracketSize={data.bracket_size} slots={data.slots} />
    </ScreenContainer>
  );
}

function statusLabel(s: string): string {
  if (s === 'seeded') return 'Eşleşmeler hazır';
  if (s === 'in_progress') return 'Devam ediyor';
  return 'Tamamlandı';
}
