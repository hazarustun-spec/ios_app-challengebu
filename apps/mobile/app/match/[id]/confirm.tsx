// apps/mobile/app/match/[id]/confirm.tsx — Plan 8 Phase E7.
//
// Opponent approval screen — the OTHER side opens this after the home device
// finishes the score. Big score readout in the middle, info banner explaining
// the flow, and two CTAs (Onayla / İtiraz et).
//
// Live data: match detail via useMatchDetail(id), opponent name via
// useOpponentNames, confirm action via useConfirmMatch.

import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useConfirmMatch } from '../../../hooks/use-confirm-match';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { useAuthStore } from '../../../stores/auth-store';
import { myPerspective } from '../../../lib/match-opponent';
import { colors } from '../../../theme/colors';

export default function MatchConfirm() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const matchQ = useMatchDetail(id);
  const confirmMutation = useConfirmMatch();
  const opponentNames = useOpponentNames();
  const myUserId = useAuthStore((s) => s.user?.id) ?? '';

  const match = matchQ.data;

  // Derive score and opponent from live match data
  const perspective = match ? myPerspective(match, myUserId) : null;
  const score =
    perspective !== null
      ? `${perspective.myScore}-${perspective.oppScore}`
      : '–';

  const opponent = match ? opponentNames.resolve(match) : null;
  const opponentName = opponent?.name ?? 'Rakip';
  const opponentPrimaryName = opponent?.primaryName ?? 'Rakip';

  const isLoading = matchQ.isLoading;
  const isError = matchQ.isError;

  const handleConfirm = () => {
    if (!id) return;
    confirmMutation.mutate(
      { matchId: id },
      {
        onSuccess: () => {
          router.replace('/(tabs)/matches' as never);
        },
      },
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Skor onayı" onBack={() => router.back()} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : isError || !match ? (
        <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
          <Text className="font-sans text-text-3" style={{ fontSize: 14, textAlign: 'center' }}>
            {isError
              ? 'Maç bilgisi yüklenemedi. Lütfen tekrar dene.'
              : 'Maç bulunamadı.'}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}>
            <View
              className="flex-row items-center justify-center"
              style={{ gap: 18, paddingVertical: 14 }}
            >
              <Avatar name="Sen" size={64} />
              <Text
                className="font-num font-extrabold text-text"
                style={{ fontSize: 40 }}
              >
                {score}
              </Text>
              <Avatar name={opponentPrimaryName} size={64} />
            </View>

            <View
              className="bg-blue-soft rounded-md"
              style={{ padding: 14, flexDirection: 'row', gap: 10 }}
            >
              <Icon name="info" size={18} color={colors.info} />
              <Text
                className="font-sans text-text-2"
                style={{ flex: 1, fontSize: 13, lineHeight: 19 }}
              >
                {opponentName} bu skoru girdi. Senin onayın bekliyor. Doğruysa
                &quot;Onayla&quot;, yanlışsa &quot;İtiraz et&quot;.
              </Text>
            </View>
          </ScrollView>

          <View style={{ padding: 18, gap: 8 }}>
            <Button
              full
              size="lg"
              icon={<Icon name="check" size={17} color={colors.onLime} stroke={3} />}
              onPress={handleConfirm}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? 'Onaylanıyor…' : 'Onayla'}
            </Button>
            <Button
              full
              size="md"
              variant="secondary"
              onPress={() => router.push(`/match/${id}/dispute` as never)}
              disabled={confirmMutation.isPending}
            >
              İtiraz et
            </Button>
          </View>
        </>
      )}
    </View>
  );
}
