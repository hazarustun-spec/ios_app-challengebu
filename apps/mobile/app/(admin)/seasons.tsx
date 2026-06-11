// Admin · Sezon Yönetimi — Plan 8 Phase G (screen 51 in screens-admin.jsx).
//
// Same mutations as Plan 7 (`useStartSeasonFinale`, `useCloseSeason`),
// restyled to match the design source: active season card with status chip
// + dual-button row, an info banner explaining the soft-reset formula, and
// a "Geçmiş sezonlar" list rendered as `ListRow`s with a crown icon.

import { router } from 'expo-router';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { seasonDisplayName } from '@tennis/shared';
import { NavHeader } from '../../components/ui/NavHeader';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { Icon } from '../../components/ui/Icon';
import {
  useAdminSeasons,
  useCloseSeason,
  useStartSeasonFinale,
  type AdminSeason,
  type SeasonStatus,
} from '../../hooks/use-admin-seasons';
import { colors } from '../../theme/colors';

const STATUS_LABEL: Record<SeasonStatus, string> = {
  upcoming: 'Yaklaşan',
  active: 'Aktif',
  finale: 'Finalde',
  closed: 'Kapandı',
};

const STATUS_TONE: Record<
  SeasonStatus,
  { bg: string; color: string }
> = {
  upcoming: { bg: colors.surface2, color: colors.text2 },
  active: { bg: colors.limeSoft, color: colors.lvCaylak },
  finale: { bg: colors.blueSoft, color: colors.court },
  closed: { bg: colors.surface3, color: colors.text3 },
};

export default function AdminSeasonsScreen() {
  const list = useAdminSeasons();
  const startFinale = useStartSeasonFinale();
  const closeSeason = useCloseSeason();

  const handleStart = (s: AdminSeason) => {
    Alert.alert(
      'Sezon Finalini Başlat',
      `${seasonDisplayName(s.name)} ${s.year} için bracket'leri seed etmek istiyor musun?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Başlat',
          onPress: () =>
            startFinale.mutate(s.id, {
              onError: (e) =>
                Alert.alert('Hata', e instanceof Error ? e.message : 'Başlatılamadı'),
            }),
        },
      ],
    );
  };

  const handleClose = (s: AdminSeason) => {
    Alert.alert(
      'Sezonu Kapat',
      `${seasonDisplayName(s.name)} ${s.year} için ELO soft reset uygulansın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kapat',
          style: 'destructive',
          onPress: () =>
            closeSeason.mutate(s.id, {
              onError: (e) =>
                Alert.alert('Hata', e instanceof Error ? e.message : 'Kapatılamadı'),
            }),
        },
      ],
    );
  };

  const data = list.data ?? [];
  const active = data.find((s) => s.status === 'active' || s.status === 'finale');
  const closed = data.filter((s) => s.status === 'closed');

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Sezon Yönetimi" onBack={() => router.back()} />
      <FlatList
        data={closed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 32, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => list.refetch()}
            tintColor={colors.text3}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            {/* Active season card */}
            {active && (
              <ActiveSeasonCard
                season={active}
                onStartFinale={handleStart}
                onClose={handleClose}
                startBusy={startFinale.isPending}
                closeBusy={closeSeason.isPending}
              />
            )}

            {/* Soft reset explainer */}
            <Banner
              tone="info"
              title="Sezon sonu soft reset"
              body="Yeni ELO = (önceki + 1200) / 2. Tepeler düşer, dipler yükselir."
            />

            {/* Past-seasons section label */}
            {closed.length > 0 && <SectionLabel>Geçmiş sezonlar</SectionLabel>}
          </View>
        }
        renderItem={({ item }) => (
          <PastSeasonRow season={item} />
        )}
        ListEmptyComponent={
          active || list.isLoading ? null : (
            <View style={{ alignItems: 'center', paddingTop: 32 }}>
              <Text
                className="font-sans text-text-3"
                style={{ fontSize: 13, textAlign: 'center' }}
              >
                Sezon kaydı yok.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

function ActiveSeasonCard({
  season,
  onStartFinale,
  onClose,
  startBusy,
  closeBusy,
}: {
  season: AdminSeason;
  onStartFinale: (s: AdminSeason) => void;
  onClose: (s: AdminSeason) => void;
  startBusy: boolean;
  closeBusy: boolean;
}) {
  const tone = STATUS_TONE[season.status];
  const canStartFinale =
    season.status === 'active' && new Date() >= new Date(season.finale_starts_at);
  const canClose = season.status === 'finale';

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        borderRadius: 18,
        padding: 18,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          className="font-display font-extrabold text-text"
          style={{ fontSize: 18 }}
        >
          {seasonDisplayName(season.name)} {season.year}
        </Text>
        <View
          style={{
            backgroundColor: tone.bg,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
          }}
        >
          <Text
            className="font-sans font-bold"
            style={{ fontSize: 11.5, color: tone.color }}
          >
            {STATUS_LABEL[season.status]}
          </Text>
        </View>
      </View>
      <Text
        className="font-sans text-text-2"
        style={{ fontSize: 13 }}
      >
        {fmtDate(season.starts_at)} – {fmtDate(season.ends_at)} · Finale{' '}
        {fmtDate(season.finale_starts_at)}–{fmtDate(season.finale_ends_at)}
      </Text>
      <Text
        className="font-sans text-text-3"
        style={{ fontSize: 12 }}
      >
        Turnuva: {season.tournament_count}
      </Text>
      {(canStartFinale || canClose) && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          {canStartFinale && (
            <View style={{ flex: 1 }}>
              <Button
                size="sm"
                full
                variant="secondary"
                onPress={() => onStartFinale(season)}
                loading={startBusy}
              >
                Finale başlat
              </Button>
            </View>
          )}
          {canClose && (
            <View style={{ flex: 1 }}>
              <Button
                size="sm"
                full
                variant="danger"
                onPress={() => onClose(season)}
                loading={closeBusy}
              >
                Sezonu kapat
              </Button>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function PastSeasonRow({ season }: { season: AdminSeason }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: colors.surface2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="crown" size={20} color={colors.acGold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          className="font-sans font-bold text-text"
          style={{ fontSize: 14 }}
        >
          {seasonDisplayName(season.name)} {season.year}
        </Text>
        <Text
          className="font-sans text-text-3"
          style={{ fontSize: 12, marginTop: 1 }}
        >
          {fmtDate(season.starts_at)} – {fmtDate(season.ends_at)}
        </Text>
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="font-sans font-extrabold text-text-3"
      style={{
        fontSize: 11,
        letterSpacing: 0.66,
        paddingLeft: 4,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
  });
}
