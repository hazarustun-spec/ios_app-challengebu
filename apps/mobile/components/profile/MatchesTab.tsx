import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { ActiveMatchRow } from '../../hooks/use-active-matches';
import { useUserMatchHistory } from '../../hooks/use-match-history';

interface Props {
  targetUserId: string;
}

export function MatchesTab({ targetUserId }: Props) {
  const { data, isLoading } = useUserMatchHistory(targetUserId);
  const list = data ?? [];
  if (isLoading) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }
  if (list.length === 0) {
    return <Text className="mt-4 text-sm text-gray-500">Henüz oynanmış maç yok.</Text>;
  }
  return (
    <View className="mt-4">
      {list.map((m) => (
        <HistoryRow key={m.id} match={m} myUserId={targetUserId} />
      ))}
    </View>
  );
}

function HistoryRow({ match, myUserId }: { match: ActiveMatchRow; myUserId: string }) {
  const onTeamA = match.team_a_player_ids.includes(myUserId);
  const my = onTeamA ? match.score_team_a : match.score_team_b;
  const opp = onTeamA ? match.score_team_b : match.score_team_a;
  const iWon = (onTeamA && match.winner_team === 'a') || (!onTeamA && match.winner_team === 'b');
  const voided = match.winner_team === 'void';
  const ratingBefore = onTeamA ? match.rating_before_team_a : match.rating_before_team_b;
  const ratingAfter = onTeamA ? match.rating_after_team_a : match.rating_after_team_b;
  const delta = ratingBefore !== null && ratingAfter !== null ? ratingAfter - ratingBefore : null;
  const playedAt = new Date(match.played_at).toLocaleDateString('tr-TR');

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      className="mb-2 rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-600">{playedAt}</Text>
        <Text className={`text-sm font-semibold ${voided ? 'text-gray-700' : iWon ? 'text-green-700' : 'text-red-700'}`}>
          {voided ? 'Voided' : iWon ? 'Kazandın' : 'Kaybettin'}
        </Text>
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-base text-gray-900">
          {voided ? '— — —' : `${my} - ${opp}`}
        </Text>
        {delta !== null && match.is_rated && (
          <Text className={delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-gray-700'}>
            {delta > 0 ? '+' : ''}{delta} ELO
          </Text>
        )}
      </View>
    </Pressable>
  );
}
