import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { EloDeltaDisplay } from '../../components/matches/EloDeltaDisplay';
import { MismatchBanner } from '../../components/matches/MismatchBanner';
import { StatusBadge } from '../../components/matches/StatusBadge';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAcceptMatchRequest } from '../../hooks/use-accept-match-request';
import { useApplyToOpenCall } from '../../hooks/use-apply-to-open-call';
import { useMatchDetail } from '../../hooks/use-match-detail';
import { useMatchRequestDetail } from '../../hooks/use-match-request-detail';
import { useRejectMatchRequest } from '../../hooks/use-reject-match-request';
import { useAuthStore } from '../../stores/auth-store';

const FORMAT_LABELS: Record<string, string> = {
  bu_klasik: 'BÜ Klasik', hizli_tiebreak: 'Hızlı Tiebreak',
  pro_set_8: 'Pro Set 8', '3set_klasik': '3 Set Klasik',
};
const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek', kadin_tek: 'Kadın Tek', open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift', kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift', open_cift: 'Open Çift',
};

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  const matchQuery = useMatchDetail(id);
  const requestQuery = useMatchRequestDetail(id);

  const accept = useAcceptMatchRequest();
  const reject = useRejectMatchRequest();
  const apply = useApplyToOpenCall();

  if ((matchQuery.isLoading || requestQuery.isLoading) && !matchQuery.data && !requestQuery.data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Maç', headerShown: true }} />
        <ScreenContainer>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1e3a8a" />
          </View>
        </ScreenContainer>
      </>
    );
  }

  if (matchQuery.data) {
    const m = matchQuery.data;
    if (!userId) return null;
    const onTeamA = m.team_a_player_ids.includes(userId);
    const myScore = onTeamA ? m.score_team_a : m.score_team_b;
    const oppScore = onTeamA ? m.score_team_b : m.score_team_a;
    const winnerSet = m.winner_team !== null;
    const myConfirmed = m.confirmed_by.includes(userId);
    const playedAt = new Date(m.played_at);

    const onPlay = () => router.push(`/play/${m.id}`);
    const onConfirm = () => router.push(`/play/confirm/${m.id}`);
    const onDispute = () => router.push(`/dispute/${m.id}`);

    return (
      <>
        <Stack.Screen options={{ title: 'Maç', headerShown: true }} />
        <ScreenContainer scrollable>
          <View className="gap-3">
            {m.status === 'awaiting_confirmation' && winnerSet && !myConfirmed && (
              <MismatchBanner message="Skor girildi. Aynı skoruysa onayla; uyuşmazlık varsa itiraz et." />
            )}
            <Text className="text-2xl font-bold text-gray-900">
              {CATEGORY_LABELS[m.category] ?? m.category}
            </Text>
            <Row label="Format" value={FORMAT_LABELS[m.format] ?? m.format} />
            <Row label="Tip" value={m.is_rated ? '🏆 Sıralama' : '🤝 Dostluk'} />
            <Row label="Tarih" value={`${playedAt.toLocaleDateString('tr-TR')} ${playedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`} />
            <Row label="Kort" value={m.court?.name ?? '—'} />
            <Row label="Durum" value={m.status === 'awaiting_confirmation' ? 'Onay bekliyor' : m.status === 'disputed' ? 'İtirazda' : m.status === 'confirmed' ? 'Onaylandı' : 'Voided'} />
            {winnerSet && (
              <Row label="Skor" value={`Sen ${myScore} - Rakip ${oppScore}`} />
            )}

            {m.status === 'awaiting_confirmation' && !winnerSet && (
              <View className="mt-6">
                <Button onPress={onPlay}>Maça başla / Skor gir</Button>
              </View>
            )}

            {m.status === 'awaiting_confirmation' && winnerSet && !myConfirmed && (
              <View className="mt-6 gap-3">
                <Button onPress={onConfirm}>Skoru onayla</Button>
                <Button onPress={onDispute} variant="ghost">İtiraz et</Button>
              </View>
            )}

            {m.status === 'awaiting_confirmation' && winnerSet && myConfirmed && (
              <View className="mt-6 gap-3">
                <View className="rounded-lg bg-blue-50 p-3">
                  <Text className="text-sm text-blue-900">
                    ✓ Onayladın. Karşı tarafın onayı bekleniyor.
                  </Text>
                </View>
                <Button onPress={onDispute} variant="ghost">İtiraz et</Button>
              </View>
            )}

            {m.status === 'disputed' && (
              <View className="mt-6 rounded-lg bg-yellow-50 p-3">
                <Text className="text-sm text-yellow-900">
                  ⚠️ Bu maç itiraz altında. Admin karar verene kadar bekleniyor.
                </Text>
              </View>
            )}

            {m.status === 'confirmed' && m.is_rated && m.rating_before_team_a !== null && m.rating_after_team_a !== null && (
              <EloDeltaDisplay
                before={onTeamA ? m.rating_before_team_a : (m.rating_before_team_b ?? m.rating_before_team_a)}
                after={onTeamA ? m.rating_after_team_a : (m.rating_after_team_b ?? m.rating_after_team_a)}
              />
            )}
          </View>
        </ScreenContainer>
      </>
    );
  }

  const r = requestQuery.data;
  if (!r || !userId) {
    return (
      <>
        <Stack.Screen options={{ title: 'Maç teklifi', headerShown: true }} />
        <ScreenContainer>
          <EmptyOrError />
        </ScreenContainer>
      </>
    );
  }

  const isIncomingDirect = r.type === 'direct_challenge' && r.target_id === userId && r.status === 'pending';
  const isOutgoing = r.creator_id === userId;
  const isOpenCallForOthers = r.type === 'open_call' && !isOutgoing && r.status === 'pending';

  const opponent = isOutgoing ? r.target_profile : r.creator_profile;
  const opponentName = opponent
    ? `${opponent.first_name} ${opponent.last_name}`
    : r.type === 'open_call' ? 'Açık ilan' : '—';

  const onAccept = () =>
    accept.mutate(
      { requestId: r.id },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Kabul edilemedi') },
    );
  const onReject = () =>
    Alert.alert('Reddet', 'Bu meydan okumayı reddetmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: () =>
          reject.mutate(
            { requestId: r.id },
            { onSuccess: () => router.back(), onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Reddedilemedi') },
          ),
      },
    ]);
  const onApply = () =>
    apply.mutate(
      { requestId: r.id },
      {
        onSuccess: () => {
          Alert.alert('Başarılı', 'İlana başvurun gönderildi.');
          router.back();
        },
        onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Başvurulamadı'),
      },
    );

  return (
    <>
      <Stack.Screen options={{ title: 'Maç teklifi', headerShown: true }} />
      <ScreenContainer scrollable>
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-gray-900">{opponentName}</Text>
            <StatusBadge status={r.status} />
          </View>

          <Row label="Kategori" value={CATEGORY_LABELS[r.category] ?? r.category} />
          <Row label="Format" value={FORMAT_LABELS[r.format] ?? r.format} />
          <Row label="Tip" value={r.is_rated ? '🏆 Sıralama' : '🤝 Dostluk'} />
          <Row label="Tarih" value={`${r.proposed_date} ${r.proposed_time.slice(0, 5)}`} />
          <Row label="Kort" value={r.court?.name ?? '—'} />
          {r.type === 'open_call' && <Row label="Tür" value="📢 Açık ilan" />}

          {isIncomingDirect && (
            <View className="mt-6 gap-3">
              <Button onPress={onAccept} loading={accept.isPending}>Kabul et</Button>
              <Button onPress={onReject} variant="ghost" disabled={reject.isPending}>Reddet</Button>
            </View>
          )}
          {isOpenCallForOthers && (
            <View className="mt-6">
              <Button onPress={onApply} loading={apply.isPending}>İlana başvur</Button>
            </View>
          )}
          {isOutgoing && r.type === 'open_call' && r.status === 'pending' && (
            <View className="mt-6">
              <Button onPress={() => router.push(`/applications/${r.id}`)}>Başvuruları gör</Button>
            </View>
          )}
        </View>
      </ScreenContainer>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="border-b border-gray-200 pb-2">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="mt-1 text-base text-gray-900">{value}</Text>
    </View>
  );
}

function EmptyOrError() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-gray-500">Maç bulunamadı.</Text>
    </View>
  );
}
