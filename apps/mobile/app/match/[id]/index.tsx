// apps/mobile/app/match/[id]/index.tsx — Plan 8 Phase E5.
//
// Match detail screen — opens for an existing match. Shows the two players
// (you + opponent), match meta (category, format, when, court), status
// banner (confirmed / pending), and two CTAs:
//   • primary  → live score entry (`/match/[id]/score`)
//   • ghost    → dispute form     (`/match/[id]/dispute`)
//
// Wired to live data via useMatchDetail(id) + useOpponentNames().

import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { FormatChip } from '../../../components/ui/FormatChip';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { useAuthStore } from '../../../stores/auth-store';
import { DB_TO_UI_FORMAT } from '../../../lib/formats';
import { colors } from '../../../theme/colors';

// ---------------------------------------------------------------------------
// Category key → human label (mirrors convention in (tabs)/index.tsx).
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

/** Format `played_at` ISO string into "Bugün · 18:30" / "14 Haz · 18:30". */
function formatPlayedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hhmm = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  if (d >= startOfToday) {
    return `Bugün · ${hhmm}`;
  }
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d >= startOfYesterday) {
    return `Dün · ${hhmm}`;
  }
  const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return `${dateStr} · ${hhmm}`;
}

// ---------------------------------------------------------------------------
// MatchDetail
// ---------------------------------------------------------------------------

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const matchQ = useMatchDetail(id);
  const opponentNames = useOpponentNames();
  const profile = useAuthStore((s) => s.profile);
  const myFirstName = profile?.firstName ?? 'Sen';

  // --- Loading state ---
  if (matchQ.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Maç" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.clay} />
        </View>
      </View>
    );
  }

  // --- Error / not found state ---
  if (matchQ.isError || !matchQ.data) {
    return (
      <View className="flex-1 bg-bg">
        <NavHeader title="Maç" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center" style={{ padding: 32 }}>
          <Text
            className="font-sans font-semibold text-text-3"
            style={{ fontSize: 14, textAlign: 'center' }}
          >
            {matchQ.isError ? 'Maç yüklenemedi.' : 'Maç bulunamadı.'}
          </Text>
        </View>
      </View>
    );
  }

  const m = matchQ.data;

  // Resolve opponent via shared hook (batch roster, no N+1 queries).
  const opponent = opponentNames.resolve(m);

  // Map DB format enum → UI FormatKey for FormatChip.
  const fmtKey = DB_TO_UI_FORMAT[m.format] ?? 'klasik';

  // Category human label.
  const categoryLabel = CATEGORY_LABELS[m.category] ?? m.category;

  // Date / time.
  const whenLabel = formatPlayedAt(m.played_at);

  // Court label.
  const courtLabel = m.court?.name ?? '—';

  // Status: DB uses 'awaiting_confirmation' for "pending" in this screen's
  // context. 'confirmed' maps directly. 'disputed' and 'voided' are
  // treated as non-confirmed banners.
  const isConfirmed = m.status === 'confirmed';

  const rows: Array<{ label: string; value?: string; valueNode?: ReactNode }> = [
    { label: 'Kategori', value: categoryLabel },
    { label: 'Format', valueNode: <FormatChip fmtKey={fmtKey} /> },
    { label: 'Tarih', value: whenLabel },
    { label: 'Kort', value: courtLabel },
  ];

  return (
    <View className="flex-1 bg-bg">
      <NavHeader title="Maç" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}>
        {/* Players row */}
        <View
          className="flex-row items-center justify-center"
          style={{ gap: 18, paddingVertical: 8 }}
        >
          <View style={{ alignItems: 'center' }}>
            <Avatar name={myFirstName} size={64} />
            <Text
              className="font-sans font-bold text-text"
              style={{ fontSize: 13.5, marginTop: 8 }}
            >
              {myFirstName}
            </Text>
          </View>
          <Text
            className="font-num font-extrabold text-text-3"
            style={{ fontSize: 16 }}
          >
            VS
          </Text>
          <View style={{ alignItems: 'center' }}>
            <Avatar name={opponent.primaryName} size={64} />
            <Text
              className="font-sans font-bold text-text"
              style={{ fontSize: 13.5, marginTop: 8 }}
            >
              {opponent.primaryName.split(' ')[0]}
            </Text>
          </View>
        </View>

        {/* Meta card */}
        <View
          className="rounded-lg overflow-hidden"
          style={{
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surface,
          }}
        >
          {rows.map((r, i) => (
            <Row
              key={r.label}
              label={r.label}
              value={r.value}
              valueNode={r.valueNode}
              first={i === 0}
            />
          ))}
        </View>

        {/* Status banner */}
        <View
          className="flex-row items-center rounded-md"
          style={{
            padding: 12,
            gap: 10,
            backgroundColor: isConfirmed ? colors.limeSoft : colors.warnSoft,
          }}
        >
          <Icon
            name={isConfirmed ? 'check' : 'clock'}
            size={18}
            color={isConfirmed ? colors.win : colors.warn}
            stroke={3}
          />
          <Text
            className="font-sans font-bold"
            style={{
              flex: 1,
              fontSize: 13.5,
              color: isConfirmed ? colors.win : colors.warn,
            }}
          >
            {isConfirmed
              ? 'Maç onaylı, sahaya hazırsın'
              : 'Karşı taraf henüz onaylamadı'}
          </Text>
        </View>
      </ScrollView>

      <View style={{ padding: 18, gap: 8 }}>
        <Button
          full
          size="lg"
          icon={<Icon name="spark" size={17} color={colors.onLime} />}
          onPress={() => router.push(`/match/${id}/score` as never)}
        >
          Skoru gir
        </Button>
        <Button
          full
          size="md"
          variant="ghost"
          onPress={() => router.push(`/match/${id}/dispute` as never)}
        >
          İtiraz et
        </Button>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  valueNode,
  first,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
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
        <Text
          className="font-sans font-bold text-text"
          style={{ fontSize: 14 }}
        >
          {value}
        </Text>
      )}
    </View>
  );
}
