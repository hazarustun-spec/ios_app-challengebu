import { Alert, Pressable, Text, View } from 'react-native';
import { Button } from '../../ui/Button';
import {
  useScoreEntryStore,
  type BuKlasikDraft,
} from '../../../stores/score-entry-store';
import type { WinnerTeam } from '../../../hooks/use-submit-match-score';

interface Props {
  matchId: string;
  myLetter: 'a' | 'b';
  onSubmit: (draft: BuKlasikDraft, winnerTeam: WinnerTeam, scoreA: number, scoreB: number) => void;
  submitting: boolean;
}

const TARGET = 4;
const MAX_ELS = 7;

export function BuKlasikScoreEntry({ matchId, myLetter, onSubmit, submitting }: Props) {
  const draft = useScoreEntryStore((s) => s.getBuKlasik(matchId));
  const setDraft = useScoreEntryStore((s) => s.setBuKlasik);

  const scoreA = draft.els.filter((e) => e.winner === 'a').length;
  const scoreB = draft.els.filter((e) => e.winner === 'b').length;
  const currentEl = draft.els.length + 1;

  const matchComplete = scoreA >= TARGET || scoreB >= TARGET;
  const isThreeThree = scoreA === 3 && scoreB === 3;
  const canVoid = isThreeThree;

  const recordEl = (winner: 'a' | 'b') => {
    if (matchComplete) return;
    if (draft.els.length >= MAX_ELS) return;
    setDraft(matchId, { els: [...draft.els, { el: currentEl, winner }] });
  };

  const undoLast = () => {
    if (draft.els.length === 0) return;
    setDraft(matchId, { els: draft.els.slice(0, -1) });
  };

  const submitVoid = () => {
    Alert.alert('Maçı bitir', '3-3 — maç yapılmamış sayılacak. Onaylıyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Evet, bitir', onPress: () => onSubmit(draft, 'void', scoreA, scoreB) },
    ]);
  };

  const submitFinal = () => {
    const winnerTeam: 'a' | 'b' = scoreA > scoreB ? 'a' : 'b';
    onSubmit(draft, winnerTeam, scoreA, scoreB);
  };

  return (
    <View className="flex-1 gap-4">
      <View className="rounded-lg bg-gray-100 p-4">
        <Text className="mb-2 text-center text-sm text-gray-600">El {Math.min(currentEl, MAX_ELS)}</Text>
        <View className="flex-row items-center justify-center gap-6">
          <View className="items-center">
            <Text className="text-xs text-gray-500">{myLetter === 'a' ? 'Sen' : 'Rakip'}</Text>
            <Text className="text-5xl font-bold text-gray-900">{scoreA}</Text>
          </View>
          <Text className="text-3xl text-gray-400">-</Text>
          <View className="items-center">
            <Text className="text-xs text-gray-500">{myLetter === 'b' ? 'Sen' : 'Rakip'}</Text>
            <Text className="text-5xl font-bold text-gray-900">{scoreB}</Text>
          </View>
        </View>
      </View>

      <Text className="text-sm text-gray-700">
        Bu eli kim kazandı?
      </Text>
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => recordEl('a')}
          disabled={matchComplete}
          className={`flex-1 items-center rounded-lg border border-primary py-4 ${matchComplete ? 'opacity-50' : 'active:bg-blue-50'}`}
        >
          <Text className="text-lg font-semibold text-primary">{myLetter === 'a' ? 'Ben' : 'Rakip'}</Text>
        </Pressable>
        <Pressable
          onPress={() => recordEl('b')}
          disabled={matchComplete}
          className={`flex-1 items-center rounded-lg border border-primary py-4 ${matchComplete ? 'opacity-50' : 'active:bg-blue-50'}`}
        >
          <Text className="text-lg font-semibold text-primary">{myLetter === 'b' ? 'Ben' : 'Rakip'}</Text>
        </Pressable>
      </View>

      <Pressable onPress={undoLast} disabled={draft.els.length === 0} className="items-center py-2">
        <Text className={draft.els.length === 0 ? 'text-gray-400' : 'text-primary'}>↩ Son eli geri al</Text>
      </Pressable>

      {matchComplete && (
        <View className="rounded-lg bg-green-50 p-3">
          <Text className="text-base font-medium text-green-900">
            Maç bitti: {scoreA} - {scoreB}
          </Text>
        </View>
      )}

      <View className="mt-auto gap-3">
        {canVoid && (
          <Button onPress={submitVoid} variant="ghost">Maçı bitir (3-3 voided)</Button>
        )}
        {matchComplete && (
          <Button onPress={submitFinal} loading={submitting}>Skoru gönder</Button>
        )}
      </View>
    </View>
  );
}
