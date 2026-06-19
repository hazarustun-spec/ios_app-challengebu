// apps/mobile/app/match/[id]/start.tsx — Plan 8 Phase E6a.
//
// "Maçı Başlat" two-player handshake lobby.
//
// Flow:
//   1. First player taps "Maçı Başlat" → RPC start_match() adds them to
//      started_by; button changes to "Hazırsın ✓ · rakip bekleniyor…"
//   2. Realtime UPDATE lands when the second player confirms → bothReady=true
//   3. MatchStartBurst overlay plays (~1.6 s) → router.replace('/score')
//
// Edge cases:
//   • Match already has winner_team (scored) → skip straight to /score.
//   • Both already confirmed on first load → play animation directly.

import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { FormatChip } from '../../../components/ui/FormatChip';
import { MatchStartBurst } from '../../../components/matches/MatchStartBurst';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useStartMatch } from '../../../hooks/use-start-match';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { useRealtimeChannel } from '../../../hooks/use-realtime-channel';
import { useAuthStore } from '../../../stores/auth-store';
import { queryKeys } from '../../../lib/query-keys';
import { DB_TO_UI_FORMAT } from '../../../lib/formats';
import { colors } from '../../../theme/colors';

// ---------------------------------------------------------------------------
// Category label map (mirrors index.tsx + matches.tsx)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

/** Format played_at ISO → "Bugün · 18:30" / "14 Haz · 18:30". */
function formatPlayedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hhmm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (d >= todayStart) return `Bugün · ${hhmm}`;
  const yesterday = new Date(todayStart);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d >= yesterday) return `Dün · ${hhmm}`;
  const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return `${dateStr} · ${hhmm}`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MatchStartLobby() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const matchQ = useMatchDetail(id);
  const startMutation = useStartMatch();
  const opponentNames = useOpponentNames();
  const userId = useAuthStore((s) => s.user?.id);
  const profile = useAuthStore((s) => s.profile);

  // Guard so navigation fires only once after animation completes.
  const navigatedRef = useRef(false);

  // Realtime subscription: invalidate match detail whenever the row updates
  // so started_by refreshes when the opponent confirms.
  useRealtimeChannel({
    channelName: id ? `match:start:${id}` : 'match:start:none',
    enabled: !!id,
    configs: [{ event: 'UPDATE', table: 'matches', filter: id ? `id=eq.${id}` : undefined }],
    invalidateKeys: id ? [queryKeys.activeMatches.detail(id)] : [],
  });

  const match = matchQ.data ?? null;

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const startedBy: string[] = match?.started_by ?? [];
  const teamA: string[] = match?.team_a_player_ids ?? [];
  const teamB: string[] = match?.team_b_player_ids ?? [];
  const everyone = [...teamA, ...teamB];

  const iAmReady = !!userId && startedBy.includes(userId);
  const bothReady =
    everyone.length > 0 && everyone.every((p) => startedBy.includes(p));

  // Opponent info
  const opponent = match ? opponentNames.resolve(match) : null;
  const opponentName = opponent?.name ?? 'Rakip';
  const opponentPrimaryName = opponent?.primaryName ?? 'Rakip';

  // My display name
  const myFirstName = profile?.firstName ?? 'Sen';

  // Format/category display
  const fmtKey = match ? (DB_TO_UI_FORMAT[match.format] ?? 'klasik') : 'klasik';
  const categoryLabel = match ? (CATEGORY_LABELS[match.category] ?? match.category) : '';
  const whenLabel = match?.played_at ? formatPlayedAt(match.played_at) : '—';
  const courtLabel = match?.court?.name ?? '—';

  // -------------------------------------------------------------------------
  // Navigation shortcuts
  // -------------------------------------------------------------------------

  // If match already has a winner (already scored), go straight to score/result.
  useEffect(() => {
    if (!match) return;
    if (match.winner_team != null && !navigatedRef.current) {
      navigatedRef.current = true;
      router.replace(`/match/${id}/score` as never);
    }
  }, [match?.winner_team]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleStartMatch() {
    if (!id) return;
    startMutation.mutate(id, {
      onSuccess: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
    });
  }

  function handleAnimationDone() {
    if (!navigatedRef.current) {
      navigatedRef.current = true;
      router.replace(`/match/${id}/score` as never);
    }
  }

  // -------------------------------------------------------------------------
  // Render: loading / error states
  // -------------------------------------------------------------------------

  if (matchQ.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Maçı Başlat" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  if (matchQ.isError || !match) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Maçı Başlat" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
          <Text className="font-sans text-text-3" style={{ fontSize: 14, textAlign: 'center' }}>
            {matchQ.isError
              ? 'Maç bilgisi yüklenemedi. Lütfen tekrar dene.'
              : 'Maç bulunamadı.'}
          </Text>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Render: lobby
  // -------------------------------------------------------------------------

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Maçı Başlat" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 20,
          flexGrow: 1,
        }}
      >
        {/* VS hero row */}
        <View
          className="flex-row items-center justify-center"
          style={{ gap: 24, paddingVertical: 16 }}
        >
          {/* Me */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Avatar name={myFirstName} size={72} />
            <Text
              className="font-sans font-bold text-text"
              style={{ fontSize: 14, marginTop: 10 }}
            >
              Sen
            </Text>
            {iAmReady && (
              <View
                className="flex-row items-center rounded-pill"
                style={{
                  marginTop: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  gap: 4,
                  backgroundColor: colors.limeSoft,
                }}
              >
                <Icon name="check" size={11} color={colors.win} stroke={3} />
                <Text
                  style={{ fontSize: 10.5, fontWeight: '800', color: colors.win }}
                >
                  Hazır
                </Text>
              </View>
            )}
          </View>

          {/* VS label */}
          <Text
            className="font-num font-extrabold text-text-3"
            style={{ fontSize: 18 }}
          >
            VS
          </Text>

          {/* Opponent */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Avatar name={opponentPrimaryName} size={72} />
            <Text
              className="font-sans font-bold text-text"
              style={{ fontSize: 14, marginTop: 10 }}
              numberOfLines={1}
            >
              {opponentPrimaryName.split(' ')[0]}
            </Text>
            {bothReady && (
              <View
                className="flex-row items-center rounded-pill"
                style={{
                  marginTop: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  gap: 4,
                  backgroundColor: colors.limeSoft,
                }}
              >
                <Icon name="check" size={11} color={colors.win} stroke={3} />
                <Text
                  style={{ fontSize: 10.5, fontWeight: '800', color: colors.win }}
                >
                  Hazır
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Match info row */}
        <View
          className="rounded-lg overflow-hidden"
          style={{
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
          }}
        >
          <InfoRow label="Tarih" value={whenLabel} first />
          <InfoRow label="Kort" value={courtLabel} />
          <InfoRow
            label="Format"
            valueNode={<FormatChip fmtKey={fmtKey} />}
          />
          <InfoRow label="Kategori" value={categoryLabel} />
        </View>

        {/* Waiting banner (shown when I'm ready but opponent isn't) */}
        {iAmReady && !bothReady && (
          <View
            className="flex-row items-center rounded-md"
            style={{
              padding: 14,
              gap: 10,
              backgroundColor: colors.warnSoft,
            }}
          >
            <ActivityIndicator size="small" color={colors.warn} />
            <Text
              className="font-sans font-semibold"
              style={{ flex: 1, fontSize: 13.5, color: colors.warn }}
            >
              {opponentName} henüz hazır değil…
            </Text>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={{ padding: 16, gap: 10 }}>
        {!iAmReady ? (
          <Button
            full
            size="lg"
            icon={<Icon name="spark" size={17} color={colors.onLime} />}
            onPress={handleStartMatch}
            disabled={startMutation.isPending}
          >
            {startMutation.isPending ? 'Başlatılıyor…' : 'Maçı Başlat'}
          </Button>
        ) : (
          <Button
            full
            size="lg"
            variant="secondary"
            disabled
            icon={<ActivityIndicator size="small" color={colors.text3} />}
          >
            Hazırsın ✓ · rakip bekleniyor…
          </Button>
        )}
      </View>

      {/* Start burst overlay — rendered only when both are ready */}
      {bothReady && <MatchStartBurst onDone={handleAnimationDone} />}
    </View>
  );
}

// ---------------------------------------------------------------------------
// InfoRow helper
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  value,
  valueNode,
  first,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  first?: boolean;
}) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{
        padding: 14,
        paddingHorizontal: 16,
        borderTopWidth: first ? 0 : 1,
        borderColor: colors.surface3,
      }}
    >
      <Text
        className="font-sans font-semibold text-text-3"
        style={{ fontSize: 14 }}
      >
        {label}
      </Text>
      {valueNode ?? (
        <Text className="font-sans font-bold text-text" style={{ fontSize: 14 }}>
          {value}
        </Text>
      )}
    </View>
  );
}
