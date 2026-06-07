import { Pressable, Text, View } from 'react-native';
import type { ActiveMatchRow } from '../../hooks/use-active-matches';

interface Props {
  match: ActiveMatchRow;
  myUserId: string;
  onPress: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  bu_klasik: 'BÜ Klasik',
  hizli_tiebreak: 'Hızlı Tiebreak',
  pro_set_8: 'Pro Set 8',
  '3set_klasik': '3 Set Klasik',
};

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek', kadin_tek: 'Kadın Tek', open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift', kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift', open_cift: 'Open Çift',
};

export function ActiveMatchCard({ match, myUserId, onPress }: Props) {
  const onTeamA = match.team_a_player_ids.includes(myUserId);
  const myConfirmed = match.confirmed_by.includes(myUserId);
  const winnerSet = match.winner_team !== null;

  let stateLabel = '';
  if (match.status === 'disputed') stateLabel = '⚠️ İtirazda';
  else if (winnerSet && myConfirmed) stateLabel = '✓ Onayladın, karşı taraf bekleniyor';
  else if (winnerSet && !myConfirmed) stateLabel = '✏️ Onayını bekliyor';
  else stateLabel = '🎾 Maçı oyna';

  const playedAt = new Date(match.played_at);
  const dateStr = playedAt.toLocaleDateString('tr-TR');
  const timeStr = playedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 rounded-lg border border-primary bg-blue-50 p-3 active:opacity-80"
    >
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900">
          {CATEGORY_LABELS[match.category] ?? match.category}
        </Text>
        <Text className="text-xs text-gray-600">
          {match.is_rated ? '🏆 Sıralama' : '🤝 Dostluk'}
        </Text>
      </View>
      <Text className="text-sm text-gray-700">
        {FORMAT_LABELS[match.format] ?? match.format} · {dateStr} {timeStr} · {match.court?.name ?? '—'}
      </Text>
      <Text className="mt-2 text-sm font-medium text-primary">{stateLabel}</Text>
      {winnerSet && (
        <Text className="mt-1 text-sm text-gray-600">
          Skor: {onTeamA ? `${match.score_team_a} - ${match.score_team_b}` : `${match.score_team_b} - ${match.score_team_a}`}
        </Text>
      )}
    </Pressable>
  );
}
