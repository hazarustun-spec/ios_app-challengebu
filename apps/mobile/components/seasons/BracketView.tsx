import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { BracketSlot } from '../../hooks/use-tournament-bracket';

interface Props {
  bracketSize: number;
  slots: BracketSlot[];
}

const ROUND_LABELS: Record<number, string> = {
  1: 'Çeyrek Final',
  2: 'Yarı Final',
  3: 'Final',
};

const ROUND_LABELS_SMALL: Record<number, string> = {
  1: 'Yarı Final',
  2: 'Final',
};

export function BracketView({ bracketSize, slots }: Props) {
  const rounds = bracketSize === 8 ? [1, 2, 3] : [1, 2];
  const labels = bracketSize === 8 ? ROUND_LABELS : ROUND_LABELS_SMALL;
  const byRound = new Map<number, BracketSlot[]>();
  for (const s of slots) {
    const list = byRound.get(s.round) ?? [];
    list.push(s);
    byRound.set(s.round, list);
  }

  return (
    <View className="flex-row">
      {rounds.map((r) => (
        <View key={r} className="mr-3 flex-1">
          <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">
            {labels[r]}
          </Text>
          <View className="gap-3">
            {(byRound.get(r) ?? []).map((s) => (
              <SlotCard key={s.id} slot={s} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function SlotCard({ slot }: { slot: BracketSlot }) {
  const aWon = slot.winner_team === 'a';
  const bWon = slot.winner_team === 'b';
  const onPress = slot.match_id ? () => router.push(`/match/${slot.match_id}`) : undefined;
  const cardBody = (
    <View className="rounded-lg border border-gray-200 bg-white p-2">
      <Row
        seed={slot.seed_a}
        name={slot.player_a_name}
        score={slot.score_team_a}
        highlight={aWon}
      />
      <View className="my-1 h-px bg-gray-100" />
      <Row
        seed={slot.seed_b}
        name={slot.player_b_name}
        score={slot.score_team_b}
        highlight={bWon}
      />
    </View>
  );
  if (!onPress) return cardBody;
  return <Pressable onPress={onPress}>{cardBody}</Pressable>;
}

function Row({
  seed,
  name,
  score,
  highlight,
}: {
  seed: number | null;
  name: string | null;
  score: number | null;
  highlight: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center">
        <Text className="mr-2 text-[10px] text-gray-400">{seed !== null ? `#${seed}` : '—'}</Text>
        <Text
          className={`flex-1 text-xs ${highlight ? 'font-bold text-green-700' : 'text-gray-900'}`}
          numberOfLines={1}
        >
          {name ?? 'Bekleniyor'}
        </Text>
      </View>
      <Text className={`text-xs ${highlight ? 'font-bold text-green-700' : 'text-gray-700'}`}>
        {score ?? '—'}
      </Text>
    </View>
  );
}
