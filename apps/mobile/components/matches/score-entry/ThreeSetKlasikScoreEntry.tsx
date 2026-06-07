import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import {
  useScoreEntryStore,
  type ThreeSetKlasikDraft,
} from '../../../stores/score-entry-store';

interface Props {
  matchId: string;
  myLetter: 'a' | 'b';
  onSubmit: (draft: ThreeSetKlasikDraft, winnerTeam: 'a' | 'b' | 'void', scoreA: number, scoreB: number) => void;
  submitting: boolean;
}

interface SetInput {
  a: string;
  b: string;
}

export function ThreeSetKlasikScoreEntry({ matchId, myLetter, onSubmit, submitting }: Props) {
  const draft = useScoreEntryStore((s) => s.getThreeSetKlasik(matchId));
  const setDraft = useScoreEntryStore((s) => s.setThreeSetKlasik);

  const initialSets: SetInput[] = draft.sets.length
    ? draft.sets.map((s) => ({ a: String(s.a), b: String(s.b) }))
    : [{ a: '', b: '' }, { a: '', b: '' }];

  const [sets, setSets] = useState<SetInput[]>(initialSets);
  const [err, setErr] = useState<string>();

  const addSet = () => {
    if (sets.length < 3) setSets([...sets, { a: '', b: '' }]);
  };

  const updateSet = (i: number, key: 'a' | 'b', value: string) => {
    const next = [...sets];
    next[i] = { ...next[i], [key]: value };
    setSets(next);
    setErr(undefined);
  };

  const onSubmitTap = () => {
    const parsed: { set: number; a: number; b: number }[] = [];
    let setsA = 0;
    let setsB = 0;
    for (let i = 0; i < sets.length; i++) {
      const a = Number(sets[i].a);
      const b = Number(sets[i].b);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 7 || b > 7) {
        setErr(`${i + 1}. set skoru geçersiz`);
        return;
      }
      if (a === b) {
        setErr(`${i + 1}. sette beraberlik olamaz`);
        return;
      }
      parsed.push({ set: i + 1, a, b });
      if (a > b) setsA++;
      else setsB++;
    }
    if (setsA < 2 && setsB < 2) {
      setErr('Maç bitmemiş (kimsenin 2 seti yok)');
      return;
    }
    const winner: 'a' | 'b' = setsA >= 2 ? 'a' : 'b';
    setDraft(matchId, { sets: parsed });
    onSubmit({ sets: parsed }, winner, setsA, setsB);
  };

  return (
    <View className="flex-1 gap-3">
      <Text className="text-sm text-gray-700">Her set için sayıyı gir.</Text>
      {sets.map((s, i) => (
        <View key={i} className="rounded-lg bg-gray-50 p-3">
          <Text className="mb-2 text-sm font-medium text-gray-700">{i + 1}. Set</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label={myLetter === 'a' ? 'Sen' : 'Rakip'}
                keyboardType="number-pad"
                value={s.a}
                onChangeText={(v) => updateSet(i, 'a', v)}
              />
            </View>
            <View className="flex-1">
              <TextField
                label={myLetter === 'b' ? 'Sen' : 'Rakip'}
                keyboardType="number-pad"
                value={s.b}
                onChangeText={(v) => updateSet(i, 'b', v)}
              />
            </View>
          </View>
        </View>
      ))}
      {sets.length < 3 && (
        <Pressable onPress={addSet} className="items-center py-2">
          <Text className="text-primary">+ 3. seti ekle</Text>
        </Pressable>
      )}
      {err && <Text className="text-sm text-red-500">{err}</Text>}
      <View className="mt-auto">
        <Button onPress={onSubmitTap} loading={submitting}>Skoru gönder</Button>
      </View>
    </View>
  );
}
