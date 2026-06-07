import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import {
  useScoreEntryStore,
  type ThreeSetKlasikDraft,
} from '../../../stores/score-entry-store';
import type { WinnerTeam } from '../../../hooks/use-submit-match-score';

interface Props {
  matchId: string;
  myLetter: 'a' | 'b';
  onSubmit: (draft: ThreeSetKlasikDraft, winnerTeam: WinnerTeam, scoreA: number, scoreB: number) => void;
  submitting: boolean;
}

interface SetInput {
  a: string;
  b: string;
}

function parseSet(s: SetInput): { a: number; b: number } | null {
  if (s.a === '' || s.b === '') return null;
  const a = Number(s.a);
  const b = Number(s.b);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
  return { a, b };
}

function isLegalSetScore(a: number, b: number): boolean {
  if (a < 0 || b < 0) return false;
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  if (max === 6 && min <= 4) return true;
  if (max === 7 && (min === 5 || min === 6)) return true;
  return false;
}

export function ThreeSetKlasikScoreEntry({ matchId, myLetter, onSubmit, submitting }: Props) {
  const draft = useScoreEntryStore((s) => s.getThreeSetKlasik(matchId));
  const setDraft = useScoreEntryStore((s) => s.setThreeSetKlasik);

  const initialSets: SetInput[] = draft.sets.length
    ? draft.sets.map((s) => ({ a: String(s.a), b: String(s.b) }))
    : [{ a: '', b: '' }, { a: '', b: '' }];

  const [sets, setSets] = useState<SetInput[]>(initialSets);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    setDraft(matchId, {
      sets: sets.map((s, i) => ({ set: i + 1, a: Number(s.a) || 0, b: Number(s.b) || 0 })),
    });
  }, [sets, matchId, setDraft]);

  const parsed0 = sets[0] ? parseSet(sets[0]) : null;
  const parsed1 = sets[1] ? parseSet(sets[1]) : null;
  let decidedAfterTwo = false;
  if (parsed0 && parsed1) {
    const winner0 = parsed0.a > parsed0.b ? 'a' : parsed0.a < parsed0.b ? 'b' : null;
    const winner1 = parsed1.a > parsed1.b ? 'a' : parsed1.a < parsed1.b ? 'b' : null;
    if (winner0 && winner1 && winner0 === winner1) decidedAfterTwo = true;
  }

  const addSet = () => {
    if (sets.length < 3 && !decidedAfterTwo) setSets([...sets, { a: '', b: '' }]);
  };

  const updateSet = (i: number, key: 'a' | 'b', value: string) => {
    const next = [...sets];
    next[i] = { ...next[i], [key]: value };
    setSets(next);
    setErr(undefined);
  };

  const onSubmitTap = () => {
    const effectiveSets = decidedAfterTwo ? sets.slice(0, 2) : sets;
    const parsed: { set: number; a: number; b: number }[] = [];
    let setsA = 0;
    let setsB = 0;
    for (let i = 0; i < effectiveSets.length; i++) {
      const a = Number(effectiveSets[i].a);
      const b = Number(effectiveSets[i].b);
      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        setErr(`${i + 1}. set skoru geçersiz`);
        return;
      }
      if (!isLegalSetScore(a, b)) {
        setErr(`${i + 1}. set skoru geçersiz (örn. 6-3, 7-5, 7-6)`);
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
      {sets.length < 3 && !decidedAfterTwo && (
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
