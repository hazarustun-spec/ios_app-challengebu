import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';
import { BuKlasikScoreEntry } from '../../components/matches/score-entry/BuKlasikScoreEntry';
import { HizliTiebreakScoreEntry } from '../../components/matches/score-entry/HizliTiebreakScoreEntry';
import { ProSet8ScoreEntry } from '../../components/matches/score-entry/ProSet8ScoreEntry';
import { ThreeSetKlasikScoreEntry } from '../../components/matches/score-entry/ThreeSetKlasikScoreEntry';
import { FormatRulesModal } from '../../components/matches/FormatRulesModal';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useMatchDetail } from '../../hooks/use-match-detail';
import { useSubmitMatchScore, type WinnerTeam } from '../../hooks/use-submit-match-score';
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

  const submitScore = async (
    winnerTeam: WinnerTeam,
    scoreA: number,
    scoreB: number,
    extra: Partial<Pick<
      Parameters<typeof submit.mutateAsync>[0],
      'els' | 'sets' | 'games' | 'tiebreakScore' | 'points'
    >>,
  ) => {
    try {
      const res = await submit.mutateAsync({
        matchId,
        scoreTeamA: scoreA,
        scoreTeamB: scoreB,
        winnerTeam,
        ...extra,
      });
      clearDraft(matchId);
      Alert.alert(
        res.matched ? 'Eşleşti' : 'Gönderildi',
        res.matched
          ? 'Karşı taraftan onay bekleniyor.'
          : 'Rakip henüz aynı skoru girmedi.',
        [{ text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) }],
      );
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
              onSubmit={(draft, winnerTeam, scoreA, scoreB) =>
                submitScore(winnerTeam, scoreA, scoreB, { els: draft.els })
              }
              submitting={submit.isPending}
            />
          )}
          {m.format === 'hizli_tiebreak' && (
            <HizliTiebreakScoreEntry
              matchId={matchId}
              myLetter={myLetter}
              onSubmit={(draft, winnerTeam, scoreA, scoreB) =>
                submitScore(winnerTeam, scoreA, scoreB, { points: draft.points })
              }
              submitting={submit.isPending}
            />
          )}
          {m.format === 'pro_set_8' && (
            <ProSet8ScoreEntry
              matchId={matchId}
              myLetter={myLetter}
              onSubmit={(draft, winnerTeam, scoreA, scoreB) =>
                submitScore(winnerTeam, scoreA, scoreB, {
                  games: draft.games,
                  tiebreakScore: draft.tiebreakScore,
                })
              }
              submitting={submit.isPending}
            />
          )}
          {m.format === '3set_klasik' && (
            <ThreeSetKlasikScoreEntry
              matchId={matchId}
              myLetter={myLetter}
              onSubmit={(draft, winnerTeam, setsA, setsB) =>
                submitScore(winnerTeam, setsA, setsB, { sets: draft.sets })
              }
              submitting={submit.isPending}
            />
          )}
        </ScreenContainer>
      )}
    </>
  );
}
