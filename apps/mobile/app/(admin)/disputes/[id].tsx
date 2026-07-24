// Admin · İtiraz detayı — Plan 8 Phase G restyle.
//
// Plan 7 shipped the resolve flow (`useResolveDispute` with 4 outcomes:
// approve_a / approve_b / void / replay). Plan 8 keeps the same business
// logic but rewrites the surface around `NavHeader`, `Card`, and `Banner`
// primitives so it matches the visual rhythm of the disputes list it's
// pushed from.

import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Button } from '../../../components/ui/Button';
import { Banner } from '../../../components/ui/Banner';
import { useDisputeDetail } from '../../../hooks/use-dispute-detail';
import {
  useResolveDispute,
  type DisputeOutcome,
} from '../../../hooks/use-resolve-dispute';
import { colors } from '../../../theme/colors';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

const FORMAT_LABELS: Record<string, string> = {
  bu_klasik: 'Klasik',
  hizli_tiebreak: 'Hızlı Tiebreak',
  full_set: 'Full Set',
  pro_set: 'Pro Set',
};

export default function DisputeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useDisputeDetail(id);
  const resolve = useResolveDispute();

  if (detail.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="İtiraz" onBack={() => router.back()} />
        <View
          className="flex-1 items-center justify-center"
          style={{ padding: 24 }}
        >
          <Text className="font-sans text-text-3" style={{ fontSize: 13 }}>
            Yükleniyor…
          </Text>
        </View>
      </View>
    );
  }

  const d = detail.data;
  if (!d) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="İtiraz" onBack={() => router.back()} />
        <View
          className="flex-1 items-center justify-center"
          style={{ padding: 24 }}
        >
          <Text className="font-sans text-text-3" style={{ fontSize: 13 }}>
            İtiraz bulunamadı.
          </Text>
        </View>
      </View>
    );
  }

  const submit = (outcome: DisputeOutcome, label: string) => {
    Alert.alert('Onayla', `${label} aksiyonunu uygulamak istiyor musun?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Uygula',
        onPress: () => {
          resolve.mutate(
            { disputeId: d.id, outcome },
            {
              onSuccess: () => router.back(),
              onError: (e) =>
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'İşlem başarısız',
                ),
            },
          );
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="İtiraz" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
      >
        <Banner tone="warning" title="İtiraz gerekçesi" body={d.reason} />

        <Section title="Maç özeti">
          <Row label="Kategori" value={CATEGORY_LABELS[d.match.category] ?? d.match.category} />
          <Row label="Format" value={FORMAT_LABELS[d.match.format] ?? d.match.format} />
          <Row
            label="Skor"
            value={`${d.match.score_team_a} - ${d.match.score_team_b}`}
            bold
          />
          <Row label="Kazanan" value={d.match.winner_team ?? 'belirsiz'} />
        </Section>

        <Section title="Skor kayıtları">
          {d.submissions.length === 0 ? (
            <Text
              className="font-sans text-text-3"
              style={{ fontSize: 12.5, paddingVertical: 4 }}
            >
              Kayıt yok.
            </Text>
          ) : (
            d.submissions.map((s) => (
              <View
                key={`${s.submitted_by}-${s.submitted_at}`}
                style={{
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: colors.surface3,
                }}
              >
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 13 }}
                >
                  {s.submitted_by_name}
                </Text>
                <Text
                  className="font-num text-text-3"
                  style={{ fontSize: 11, marginTop: 2 }}
                >
                  {new Date(s.submitted_at).toLocaleString('tr-TR')}
                </Text>
                <Text
                  className="font-num text-text-2"
                  style={{ fontSize: 11, marginTop: 4 }}
                  numberOfLines={3}
                >
                  {JSON.stringify(s.score_details)}
                </Text>
              </View>
            ))
          )}
        </Section>

        <View style={{ gap: 10, marginTop: 4 }}>
          <Button onPress={() => submit('approve_a', 'Skor A')} variant="primary" full>
            A lehine onayla
          </Button>
          <Button onPress={() => submit('approve_b', 'Skor B')} variant="secondary" full>
            B lehine onayla
          </Button>
          <Button onPress={() => submit('void', 'Voided')} variant="danger" full>
            Maçı geçersiz say
          </Button>
          <Button onPress={() => submit('replay', 'Tekrar oynat')} variant="ghost" full>
            Tekrar oynat
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        borderRadius: 18,
        padding: 14,
      }}
    >
      <Text
        className="font-sans font-extrabold"
        style={{
          fontSize: 11,
          letterSpacing: 0.66,
          color: colors.text3,
          marginBottom: 8,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
      }}
    >
      <Text
        className="font-sans text-text-3"
        style={{ fontSize: 12.5 }}
      >
        {label}
      </Text>
      <Text
        className={['font-sans text-text', bold ? 'font-extrabold' : 'font-semibold'].join(' ')}
        style={{ fontSize: bold ? 14 : 13 }}
      >
        {value}
      </Text>
    </View>
  );
}
