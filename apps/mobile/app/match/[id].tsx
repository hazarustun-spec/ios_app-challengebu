import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { StatusBadge } from '../../components/matches/StatusBadge';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAcceptMatchRequest } from '../../hooks/use-accept-match-request';
import { useApplyToOpenCall } from '../../hooks/use-apply-to-open-call';
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

export default function MatchRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: r, isLoading } = useMatchRequestDetail(id);
  const accept = useAcceptMatchRequest();
  const reject = useRejectMatchRequest();
  const apply = useApplyToOpenCall();

  if (isLoading || !r || !userId) {
    return (
      <>
        <Stack.Screen options={{ title: 'Maç teklifi', headerShown: true }} />
        <ScreenContainer>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1e3a8a" />
          </View>
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

  const onAccept = () => {
    accept.mutate(
      { requestId: r.id },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Kabul edilemedi'),
      },
    );
  };

  const onReject = () => {
    Alert.alert('Reddet', 'Bu meydan okumayı reddetmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: () =>
          reject.mutate(
            { requestId: r.id },
            {
              onSuccess: () => router.back(),
              onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Reddedilemedi'),
            },
          ),
      },
    ]);
  };

  const onApply = () => {
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
  };

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
          {r.type === 'open_call' && (
            <Row label="Tür" value="📢 Açık ilan" />
          )}

          {isIncomingDirect && (
            <View className="mt-6 gap-3">
              <Button onPress={onAccept} loading={accept.isPending}>Kabul et</Button>
              <Button onPress={onReject} variant="ghost" disabled={reject.isPending}>
                Reddet
              </Button>
            </View>
          )}

          {isOpenCallForOthers && (
            <View className="mt-6">
              <Button onPress={onApply} loading={apply.isPending}>İlana başvur</Button>
            </View>
          )}

          {isOutgoing && r.type === 'open_call' && r.status === 'pending' && (
            <View className="mt-6">
              <Button onPress={() => router.push(`/applications/${r.id}`)}>
                Başvuruları gör
              </Button>
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
