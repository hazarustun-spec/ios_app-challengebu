import { Text, View } from 'react-native';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import {
  useScoreEntryStore,
  type HizliTiebreakDraft,
} from '../../../stores/score-entry-store';
import { useState } from 'react';

interface Props {
  matchId: string;
  myLetter: 'a' | 'b';
  onSubmit: (draft: HizliTiebreakDraft, winnerTeam: 'a' | 'b' | 'void', scoreA: number, scoreB: number) => void;
  submitting: boolean;
}

export function HizliTiebreakScoreEntry({ matchId, myLetter, onSubmit, submitting }: Props) {
  const draft = useScoreEntryStore((s) => s.getHizliTiebreak(matchId));
  const setDraft = useScoreEntryStore((s) => s.setHizliTiebreak);
  const [aStr, setAStr] = useState(String(draft.points.a));
  const [bStr, setBStr] = useState(String(draft.points.b));
  const [err, setErr] = useState<string>();

  const onPersist = () => {
    setDraft(matchId, { points: { a: Number(aStr) || 0, b: Number(bStr) || 0 } });
  };

  const onSubmitTap = () => {
    const a = Number(aStr);
    const b = Number(bStr);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      setErr('Geçerli sayı gir');
      return;
    }
    if (a === b) {
      setErr('Tiebreakte beraberlik olmaz, kazanan en az 2 fark olmalı');
      return;
    }
    const diff = Math.abs(a - b);
    const max = Math.max(a, b);
    if (max < 10 || diff < 2) {
      setErr('Kazanan ≥10 ve ≥2 fark olmalı');
      return;
    }
    const winner: 'a' | 'b' = a > b ? 'a' : 'b';
    onPersist();
    onSubmit({ points: { a, b } }, winner, a, b);
  };

  return (
    <View className="flex-1 gap-4">
      <Text className="text-sm text-gray-700">
        Maç sonu skorunu gir (örn. 10-7).
      </Text>
      <TextField
        label={myLetter === 'a' ? 'Senin sayın' : 'Rakibin sayısı'}
        keyboardType="number-pad"
        value={aStr}
        onChangeText={(v) => { setAStr(v); setErr(undefined); }}
      />
      <TextField
        label={myLetter === 'b' ? 'Senin sayın' : 'Rakibin sayısı'}
        keyboardType="number-pad"
        value={bStr}
        onChangeText={(v) => { setBStr(v); setErr(undefined); }}
        error={err}
      />
      <View className="mt-auto">
        <Button onPress={onSubmitTap} loading={submitting}>Skoru gönder</Button>
      </View>
    </View>
  );
}
