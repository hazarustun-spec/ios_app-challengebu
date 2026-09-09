// apps/mobile/app/match/[id]/index.tsx — Plan 8 Phase E5.
//
// Match detail screen — opens for an existing match. Shows the two players
// (you + opponent), match meta (category, format, when, court), status
// banner (confirmed / pending), and two CTAs:
//   • primary  → live score entry (`/match/[id]/score`)
//   • ghost    → dispute form     (`/match/[id]/dispute`)
//
// Wired to live data via useMatchDetail(id) + useOpponentNames().

import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { FormatChip } from '../../../components/ui/FormatChip';
import { Icon } from '../../../components/ui/Icon';
import { NavHeader } from '../../../components/ui/NavHeader';
import { Sheet } from '../../../components/ui/Sheet';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useOpponentNames } from '../../../hooks/use-opponent-names';
import { useStartConversation } from '../../../hooks/use-start-conversation';
import { DB_TO_UI_FORMAT } from '../../../lib/formats';
import {
  type MatchCalendarEvent,
  addMatchToDeviceCalendar,
  deviceCalendarSupported,
  openInGoogleCalendar,
} from '../../../lib/match-calendar';
import { useAuthStore } from '../../../stores/auth-store';
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
  const { start: startConversation } = useStartConversation();
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

  // A match is an appointment with another person; the reason to put it in a
  // calendar is that the app is not where anyone checks what their afternoon
  // looks like.
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarEvent: MatchCalendarEvent = {
    title: `${opponent.name} ile maç 🎾`,
    startsAt: new Date(m.played_at),
    format: m.format,
    courtName: m.court?.name ?? null,
    notes: 'ChallengeBu!',
  };

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
          <Text className="font-num font-extrabold text-text-3" style={{ fontSize: 16 }}>
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
            {isConfirmed ? 'Maç onaylı, sahaya hazırsın' : 'Karşı taraf henüz onaylamadı'}
          </Text>
        </View>
      </ScrollView>

      <View style={{ padding: 18, gap: 8 }}>
        <Button
          full
          size="lg"
          icon={<Icon name="spark" size={17} color={colors.onLime} />}
          onPress={() =>
            m.winner_team == null
              ? router.push(`/match/${id}/start` as never)
              : router.push(`/match/${id}/result` as never)
          }
        >
          {m.winner_team == null ? 'Maçı Başlat' : 'Sonucu Onayla'}
        </Button>
        {m.match_request_id != null && opponent.primaryId != null && (
          <Button
            full
            size="md"
            variant="secondary"
            icon={<Icon name="mail" size={16} color={colors.text} />}
            onPress={() =>
              startConversation({
                requestId: m.match_request_id!,
                otherUserId: opponent.primaryId!,
                name: opponent.name,
              })
            }
          >
            Mesaj
          </Button>
        )}
        {/* Only for a match that has not been played yet — adding a finished
            match to a calendar is noise. */}
        {m.winner_team == null && (
          <Button
            full
            size="md"
            variant="secondary"
            icon={<Icon name="calendar" size={16} color={colors.text} />}
            onPress={() => setCalendarOpen(true)}
          >
            Takvime ekle
          </Button>
        )}
        <Button
          full
          size="md"
          variant="ghost"
          onPress={() => router.push(`/match/${id}/dispute` as never)}
        >
          İtiraz et
        </Button>
      </View>

      <Sheet visible={calendarOpen} onClose={() => setCalendarOpen(false)} title="Takvime ekle">
        <View style={{ gap: 8, paddingBottom: 4 }}>
          {deviceCalendarSupported() && (
            <CalendarOption
              label="Apple Takvim"
              hint="Telefonunun takvimine doğrudan eklenir"
              onPress={async () => {
                setCalendarOpen(false);
                const r = await addMatchToDeviceCalendar(calendarEvent);
                if (r.ok) {
                  Alert.alert('Eklendi', 'Maç takvimine eklendi. Bir saat önce hatırlatacak.');
                } else if (r.reason === 'permission') {
                  // Naming Settings matters: iOS only shows the prompt once, so
                  // after a refusal the only way back is through Settings and
                  // "try again" would just fail silently forever.
                  Alert.alert(
                    'Takvim izni yok',
                    'Ayarlar → ChallengeBu! → Takvimler bölümünden izin verebilirsin.',
                  );
                } else {
                  Alert.alert(
                    'Eklenemedi',
                    "Maç takvime eklenemedi. Google Takvim'i deneyebilirsin.",
                  );
                }
              }}
            />
          )}
          <CalendarOption
            label="Google Takvim"
            hint="Tarayıcıda açılır, sen kaydedersin"
            onPress={async () => {
              setCalendarOpen(false);
              const ok = await openInGoogleCalendar(calendarEvent);
              if (!ok) Alert.alert('Açılamadı', 'Google Takvim açılamadı.');
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

function CalendarOption({
  label,
  hint,
  onPress,
}: {
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      // Plain object, not a function: NativeWind's interop spreads the style
      // prop and spreading a function yields {}.
      className="active:opacity-70"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: colors.surface2,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name="calendar" size={18} color={colors.court} />
      <View style={{ flex: 1 }}>
        <Text className="font-sans font-bold text-text" style={{ fontSize: 15 }}>
          {label}
        </Text>
        <Text className="font-sans text-text-2" style={{ fontSize: 12.5, marginTop: 1 }}>
          {hint}
        </Text>
      </View>
    </Pressable>
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
      <Text className="font-sans font-semibold text-text-3" style={{ fontSize: 14 }}>
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
