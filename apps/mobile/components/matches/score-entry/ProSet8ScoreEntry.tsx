import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import {
  useScoreEntryStore,
  type ProSet8Draft,
} from '../../../stores/score-entry-store';

interface Props {
  matchId: string;
  myLetter: 'a' | 'b';
  onSubmit: (draft: ProSet8Draft, winnerTeam: 'a' | 'b' | 'void', scoreA: number, scoreB: number) => void;
  submitting: boolean;
}

export function ProSet8ScoreEntry({ matchId, myLetter, onSubmit, submitting }: Props) {
  const draft = useScoreEntryStore((s) => s.getProSet8(matchId));
  const setDraft = useScoreEntryStore((s) => s.setProSet8);

  const [gamesA, setGamesA] = useState(String(draft.games.a));
  const [gamesB, setGamesB] = useState(String(draft.games.b));
  const [hasTiebreak, setHasTiebreak] = useState(!!draft.tiebreakScore);
  const [tbA, setTbA] = useState(String(draft.tiebreakScore?.a ?? 0));
  const [tbB, setTbB] = useState(String(draft.tiebreakScore?.b ?? 0));
  const [err, setErr] = useState<string>();

  const onSubmitTap = () => {
    const a = Number(gamesA);
    const b = Number(gamesB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      setErr('Geçerli game sayısı gir');
      return;
    }
    const max = Math.max(a, b);
    const diff = Math.abs(a - b);
    if (max < 8) {
      setErr('Kazanan en az 8 game almalı');
      return;
    }
    let winner: 'a' | 'b';
    let tb: { a: number; b: number } | undefined;
    if (a === 8 && b === 8) {
      if (!hasTiebreak) {
        setErr('8-8 olduğunda tiebreak skoru gir');
        return;
      }
      const ta = Number(tbA);
      const tb_ = Number(tbB);
      if (!Number.isInteger(ta) || !Number.isInteger(tb_) || ta < 0 || tb_ < 0 || Math.abs(ta - tb_) < 2) {
        setErr('Tiebreak skoru geçersiz (en az 2 fark)');
        return;
      }
      winner = ta > tb_ ? 'a' : 'b';
      tb = { a: ta, b: tb_ };
    } else if (diff >= 2) {
      winner = a > b ? 'a' : 'b';
    } else {
      setErr('Skor geçersiz (örn. 8-6, 8-5, 8-4, 9-7, 9-8 tiebreak)');
      return;
    }

    const persisted: ProSet8Draft = { games: { a, b }, tiebreakScore: tb };
    setDraft(matchId, persisted);
    const scoreA = a;
    const scoreB = b;
    onSubmit(persisted, winner, scoreA, scoreB);
  };

  return (
    <View className="flex-1 gap-3">
      <Text className="text-sm text-gray-700">Maç sonu game skorunu gir.</Text>
      <TextField
        label={myLetter === 'a' ? 'Senin game' : 'Rakibin game'}
        keyboardType="number-pad"
        value={gamesA}
        onChangeText={(v) => { setGamesA(v); setErr(undefined); }}
      />
      <TextField
        label={myLetter === 'b' ? 'Senin game' : 'Rakibin game'}
        keyboardType="number-pad"
        value={gamesB}
        onChangeText={(v) => { setGamesB(v); setErr(undefined); }}
      />
      <View className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
        <Text className="text-base text-gray-900">8-8 oldu, tiebreak oynandı</Text>
        <Switch value={hasTiebreak} onValueChange={setHasTiebreak} />
      </View>
      {hasTiebreak && (
        <>
          <TextField
            label={`Tiebreak — ${myLetter === 'a' ? 'sen' : 'rakip'}`}
            keyboardType="number-pad"
            value={tbA}
            onChangeText={(v) => { setTbA(v); setErr(undefined); }}
          />
          <TextField
            label={`Tiebreak — ${myLetter === 'b' ? 'sen' : 'rakip'}`}
            keyboardType="number-pad"
            value={tbB}
            onChangeText={(v) => { setTbB(v); setErr(undefined); }}
          />
        </>
      )}
      {err && <Text className="text-sm text-red-500">{err}</Text>}
      <View className="mt-auto">
        <Button onPress={onSubmitTap} loading={submitting}>Skoru gönder</Button>
      </View>
    </View>
  );
}
