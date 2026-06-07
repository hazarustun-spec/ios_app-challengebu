import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ActivityIndicator, Text, View } from 'react-native';
import { BuKlasikScoreEntry } from '../../components/matches/score-entry/BuKlasikScoreEntry';
import { HizliTiebreakScoreEntry } from '../../components/matches/score-entry/HizliTiebreakScoreEntry';
import { ProSet8ScoreEntry } from '../../components/matches/score-entry/ProSet8ScoreEntry';
import { FormatRulesModal } from '../../components/matches/FormatRulesModal';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useMatchDetail } from '../../hooks/use-match-detail';
import { useSubmitMatchScore } from '../../hooks/use-submit-match-score';
import { useAuthStore } from '../../stores/auth-store';
import { useScoreEntryStore } from '../../stores/score-entry-store';

export default function PlayScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { data: m, isLoading } = useMatchDetail(matchId);
  const userId = useAuthStore((s) => s.user?.id);
  const submit = useSubmitMatchScore();
  const clearDraft = useScoreEntryStore((s) => s.clear);
  const [rulesAcknowledged, setRulesAcknowledged] = useState(false);

  if (isLoading || !m || !matchId || !userId) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1e3a8a" />
        </View>
      </ScreenContainer>
    );
  }

  const myLetter: 'a' | 'b' = m.team_a_player_ids.includes(userId) ? 'a' : 'b';

  const onBuKlasikSubmit = async (
    draft: { els: { el: number; winner: 'a' | 'b' }[] },
    winnerTeam: 'a' | 'b' | 'void',
    scoreA: number,
    scoreB: number,
  ) => {
    try {
      const res = await submit.mutateAsync({
        matchId,
        scoreTeamA: scoreA,
        scoreTeamB: scoreB,
        winnerTeam,
        els: draft.els,
      });
      clearDraft(matchId);
      if (res.matched) {
        Alert.alert('Eşleşti', 'Karşı taraftan onay bekleniyor. Onaylama ekranına yönlendiriliyorsun.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      } else {
        Alert.alert('Gönderildi', 'Rakip henüz aynı skoru girmedi. Eşleşince devam edebileceksin.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      }
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Gönderilemedi');
    }
  };

  const onHizliTiebreakSubmit = async (
    draft: { points: { a: number; b: number } },
    winnerTeam: 'a' | 'b' | 'void',
    scoreA: number,
    scoreB: number,
  ) => {
    try {
      const res = await submit.mutateAsync({
        matchId,
        scoreTeamA: scoreA,
        scoreTeamB: scoreB,
        winnerTeam,
        points: draft.points,
      });
      clearDraft(matchId);
      if (res.matched) {
        Alert.alert('Eşleşti', 'Karşı taraftan onay bekleniyor.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      } else {
        Alert.alert('Gönderildi', 'Rakip henüz aynı skoru girmedi.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      }
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Gönderilemedi');
    }
  };

  const onProSet8Submit = async (
    draft: { games: { a: number; b: number }; tiebreakScore?: { a: number; b: number } },
    winnerTeam: 'a' | 'b' | 'void',
    scoreA: number,
    scoreB: number,
  ) => {
    try {
      const res = await submit.mutateAsync({
        matchId,
        scoreTeamA: scoreA,
        scoreTeamB: scoreB,
        winnerTeam,
        games: draft.games,
        tiebreakScore: draft.tiebreakScore,
      });
      clearDraft(matchId);
      Alert.alert(res.matched ? 'Eşleşti' : 'Gönderildi', res.matched ? 'Karşı taraftan onay bekleniyor.' : 'Rakip henüz aynı skoru girmedi.', [
        { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
      ]);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Gönderilemedi');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Maç oyna', headerShown: true }} />
      <FormatRulesModal
        visible={!rulesAcknowledged}
        format={m.format}
        onAcknowledge={() => setRulesAcknowledged(true)}
      />
      {rulesAcknowledged && (
        <ScreenContainer>
          {m.format === 'bu_klasik' && (
            <BuKlasikScoreEntry
              matchId={matchId}
              myLetter={myLetter}
              onSubmit={onBuKlasikSubmit}
              submitting={submit.isPending}
            />
          )}
          {m.format === 'hizli_tiebreak' && (
            <HizliTiebreakScoreEntry
              matchId={matchId}
              myLetter={myLetter}
              onSubmit={onHizliTiebreakSubmit}
              submitting={submit.isPending}
            />
          )}
          {m.format === 'pro_set_8' && (
            <ProSet8ScoreEntry
              matchId={matchId}
              myLetter={myLetter}
              onSubmit={onProSet8Submit}
              submitting={submit.isPending}
            />
          )}
          {m.format === '3set_klasik' && (
            <View className="flex-1 items-center justify-center">
              <View className="rounded-lg bg-yellow-50 p-4">
                <Text className="text-yellow-900">
                  3 Set Klasik skor girişi Task 12'de gelecek.
                </Text>
              </View>
            </View>
          )}
        </ScreenContainer>
      )}
    </>
  );
}
