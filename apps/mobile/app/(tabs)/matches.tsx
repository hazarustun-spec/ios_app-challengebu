// Maçlar Hub (Matches) — Plan 8 Phase E3, wired to live data (ELO-badge pass).
// Source: docs/superpowers/specs/plan-8-design-bundle/project/app/screens-matches.jsx
//   (`MatchesHub` + `UpcomingList` + `OffersList` + `FeedList` + `KindDot`)
//
// Tab screen for the Maçlar slot with three Segmented views:
//
//   1. Yaklaşan — confirmed + pending upcoming matches (active matches with
//      awaiting_confirmation or disputed status), with format/court details
//      and a "Kurallar" + "Skor gir" action row
//   2. Teklifler — incoming match challenges with accept/reject buttons
//      (direct_challenge requests where the current user is the target)
//   3. İlanlar   — open call feed with apply CTA + a link to one's own
//      open-call applicants screen
//
// The trailing NavHeader action is a clock icon that pushes the user
// into `/match/history`.
//
// Live data:
//   - useActiveMatches         → Yaklaşan tab
//   - useOpponentNames         → opponent display name in Yaklaşan rows
//   - useIncomingMatchRequests → Teklifler tab
//   - useAcceptMatchRequest    → Kabul et button
//   - useRejectMatchRequest    → Reddet button
//   - useOpenCallsFeed         → İlanlar tab
//   - useApplyToOpenCall       → İlana başvur button
//   - usePlayerRatings         → per-player ELO badge on Teklifler + İlanlar cards

import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ScreenEnter } from '../../components/ui/ScreenEnter';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { Segmented } from '../../components/ui/Segmented';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { FormatChip } from '../../components/ui/FormatChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { OpponentSuggestStrip } from '../../components/matches/OpponentSuggestStrip';
import { useUnreadMessageCount } from '../../hooks/use-conversations';
import { useActiveMatches } from '../../hooks/use-active-matches';
import type { ActiveMatchRow } from '../../hooks/use-active-matches';
import { useOpponentNames } from '../../hooks/use-opponent-names';
import {
  useIncomingMatchRequests,
  type MatchRequestRow,
} from '../../hooks/use-match-requests';
import { useAcceptMatchRequest } from '../../hooks/use-accept-match-request';
import { useRejectMatchRequest } from '../../hooks/use-reject-match-request';
import { useOpenCallsFeed, useMyOpenCalls } from '../../hooks/use-open-calls';
import {
  useApplyToMatchRequest,
  useMyMatchApplications,
} from '../../hooks/use-match-applications';
import { useDeleteOpenCall } from '../../hooks/use-delete-open-call';
import { useToast } from '../../components/ui/ToastProvider';
import { usePlayerRatings } from '../../hooks/use-ladder';
import { useMyRankings } from '../../hooks/use-my-rankings';
import { primaryCategoryOf } from '../../lib/primary-category';
import { DB_TO_UI_FORMAT } from '../../lib/formats';
import type { FormatKey } from '../../lib/formats';
import { levelForElo } from '../../lib/levels';
import { colors } from '../../theme/colors';

type HubView = 'upcoming' | 'offers' | 'feed';

// ---------------------------------------------------------------------------
// Category label map
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

// ---------------------------------------------------------------------------
// Date/time formatting helpers
// ---------------------------------------------------------------------------

/** Format a played_at ISO string into "Bugün", "Yarın", "8 Haz", etc. */
function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfDayAfter = new Date(startOfTomorrow);
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1);

  if (d >= startOfToday && d < startOfTomorrow) return 'Bugün';
  if (d >= startOfTomorrow && d < startOfDayAfter) return 'Yarın';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/** Format a played_at ISO string into "HH:MM". */
function formatMatchTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/** Format a proposed_date ("YYYY-MM-DD") + proposed_time ("HH:MM") pair into
 *  a human label like "Cmt 14:00". */
function formatRequestDateTime(date: string, time: string): string {
  if (!date) return time ?? '';
  // proposed_time may arrive as 'HH:MM' or 'HH:MM:SS' — normalize to HH:MM.
  const t = (time || '00:00').slice(0, 5);
  const d = new Date(`${date}T${t}:00`);
  if (Number.isNaN(d.getTime())) return (time || '').slice(0, 5);
  const dayStr = d.toLocaleDateString('tr-TR', { weekday: 'short' });
  const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return `${dayStr} ${timeStr}`;
}

/** Safely convert a db format string to a UI FormatKey (default 'klasik'). */
function toFormatKey(dbFormat: string): FormatKey {
  return (DB_TO_UI_FORMAT as Record<string, FormatKey>)[dbFormat] ?? 'klasik';
}

// ---------------------------------------------------------------------------
// Root screen
// ---------------------------------------------------------------------------

export default function MatchesTab() {
  const [view, setView] = useState<HubView>('upcoming');

  // Suggestions are personalized to the player's primary category.
  const rankingsQ = useMyRankings();
  const primaryCat = primaryCategoryOf(rankingsQ.data);

  // Hoist all queries here so we can feed a single refreshControl to the
  // outer ScrollView without nesting ScrollViews.
  const matchesQ = useActiveMatches();
  const opponentNames = useOpponentNames();
  const requestsQ = useIncomingMatchRequests();
  const feedQ = useOpenCallsFeed();
  const myOpenQ = useMyOpenCalls();
  const accept = useAcceptMatchRequest();
  const reject = useRejectMatchRequest();
  const applyMutation = useApplyToMatchRequest();
  const myAppsQ = useMyMatchApplications();
  const appliedIds = useMemo(
    () => new Set((myAppsQ.data ?? []).map((a) => a.request_id)),
    [myAppsQ.data],
  );
  const playerRatings = usePlayerRatings();

  const { data: unreadMessages = 0 } = useUnreadMessageCount();

  const isRefetching =
    (view === 'upcoming' && matchesQ.isRefetching) ||
    (view === 'offers' && requestsQ.isRefetching) ||
    (view === 'feed' && feedQ.isRefetching);

  function handleRefresh() {
    if (view === 'upcoming') matchesQ.refetch();
    else if (view === 'offers') requestsQ.refetch();
    else feedQ.refetch();
  }

  return (
    <ScreenEnter className="flex-1 bg-bg">
      <NavHeader
        large
        title="Maçlar"
        actionIcon="clock"
        onAction={() => router.push('/match/history' as never)}
      />
      <View
        style={{
          paddingHorizontal: 18,
          paddingTop: 4,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Segmented<HubView>
            value={view}
            onChange={setView}
            options={[
              { value: 'upcoming', label: 'Yaklaşan' },
              { value: 'offers', label: 'Teklifler' },
              { value: 'feed', label: 'İlanlar' },
            ]}
          />
        </View>
        <Pressable
          onPress={() => router.push('/messages' as never)}
          accessibilityRole="button"
          accessibilityLabel="Mesajlar"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: colors.surface2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="mail" size={20} color={colors.text} />
          {unreadMessages > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -5,
                minWidth: 17,
                height: 17,
                paddingHorizontal: 4,
                borderRadius: 8.5,
                backgroundColor: colors.pinkDeep,
                borderWidth: 1.5,
                borderColor: colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: '#FFFFFF',
                }}
              >
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 11 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.clay}
          />
        }
      >
        {/* Sana uygun rakipler — full strip (top 5), always visible above segments.
            Category = the player's primary ranked category (primaryCategoryOf). */}
        <View style={{ gap: 8 }}>
          <Text
            className="font-display font-extrabold text-text"
            style={{ fontSize: 15, letterSpacing: -0.15, paddingHorizontal: 2 }}
          >
            Sana uygun rakipler
          </Text>
          <OpponentSuggestStrip category={primaryCat} variant="full" />
        </View>

        {view === 'upcoming' && (
          <UpcomingList
            matchesQ={matchesQ}
            opponentNames={opponentNames}
          />
        )}
        {view === 'offers' && (
          <OffersList
            requestsQ={requestsQ}
            accept={accept}
            reject={reject}
            ratingOf={playerRatings.ratingOf}
          />
        )}
        {view === 'feed' && (
          <FeedList
            feedQ={feedQ}
            myQ={myOpenQ}
            appliedIds={appliedIds}
            applyMutation={applyMutation}
            ratingOf={playerRatings.ratingOf}
          />
        )}
      </ScrollView>
    </ScreenEnter>
  );
}

// ---------------------------------------------------------------------------
// KindDot
// ---------------------------------------------------------------------------

function KindDot({ kind }: { kind: 'ranking' | 'friendly' }) {
  const ranking = kind === 'ranking';
  return (
    <View className="flex-row items-center" style={{ gap: 4 }}>
      <Icon
        name={ranking ? 'trophy' : 'handshake'}
        size={13}
        color={ranking ? colors.clay : colors.pinkDeep}
      />
      <Text
        className="font-sans font-bold"
        style={{
          fontSize: 11.5,
          color: ranking ? colors.clayText : colors.pinkDeep,
        }}
      >
        {ranking ? 'Sıralama' : 'Dostluk'}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// UpcomingList — feeds from useActiveMatches
// ---------------------------------------------------------------------------

interface UpcomingListProps {
  matchesQ: ReturnType<typeof useActiveMatches>;
  opponentNames: ReturnType<typeof useOpponentNames>;
}

function UpcomingList({ matchesQ, opponentNames }: UpcomingListProps) {
  const matches: ActiveMatchRow[] = matchesQ.data ?? [];

  if (matchesQ.isLoading) {
    return (
      <View className="items-center justify-center" style={{ paddingVertical: 48 }}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="Yaklaşan maçın yok"
        body="Kabul edilen maçlar ve onay bekleyenler burada görünecek."
        action="Yeni Maç"
        onAction={() => router.push('/match/new/type' as never)}
      />
    );
  }

  return (
    <>
      {matches.map((m) => {
        const fmtKey = toFormatKey(m.format as string);
        const kind: 'ranking' | 'friendly' = m.is_rated ? 'ranking' : 'friendly';
        const catLabel = CATEGORY_LABELS[m.category] ?? m.category;
        const dateStr = formatMatchDate(m.played_at);
        const timeStr = formatMatchTime(m.played_at);
        const courtLabel = m.court?.name ?? 'Bilinmeyen kort';
        // awaiting_confirmation = pending approval; disputed = in dispute
        const isPending =
          m.status === 'awaiting_confirmation' || m.status === 'disputed';
        const opponent = opponentNames.resolve(m);

        return (
          <View
            key={m.id}
            className="rounded-lg border-base border-border-strong bg-surface overflow-hidden"
          >
            <View
              className="flex-row items-center"
              style={{ padding: 14, paddingHorizontal: 16, gap: 12 }}
            >
              <Avatar name={opponent.primaryName} size={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  className="font-sans font-bold text-text"
                  style={{ fontSize: 15.5 }}
                >
                  {opponent.name}
                </Text>
                <View
                  className="flex-row items-center"
                  style={{ marginTop: 3, gap: 7 }}
                >
                  <KindDot kind={kind} />
                  <Text className="text-text-3" style={{ fontSize: 12 }}>
                    · {catLabel}
                  </Text>
                </View>
              </View>
              {isPending ? (
                <View
                  className="flex-row items-center rounded-pill"
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    gap: 4,
                    backgroundColor: colors.warnSoft,
                  }}
                >
                  <Icon name="clock" size={12} color={colors.warn} />
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '800',
                      color: colors.warn,
                    }}
                  >
                    {m.status === 'disputed' ? 'İtiraz' : 'Onay bekliyor'}
                  </Text>
                </View>
              ) : (
                <View
                  className="flex-row items-center rounded-pill"
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    gap: 4,
                    backgroundColor: colors.limeSoft,
                  }}
                >
                  <Icon name="check" size={12} color={colors.win} stroke={3} />
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '800',
                      color: colors.win,
                    }}
                  >
                    Onaylı
                  </Text>
                </View>
              )}
            </View>
            <View
              className="flex-row items-center"
              style={{
                paddingHorizontal: 16,
                paddingBottom: 12,
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <View className="flex-row items-center" style={{ gap: 5 }}>
                <Icon name="calendar" size={15} color={colors.text3} />
                <Text
                  className="font-sans font-semibold text-text-2"
                  style={{ fontSize: 13 }}
                >
                  {dateStr} · {timeStr}
                </Text>
              </View>
              <View className="flex-row items-center" style={{ gap: 5 }}>
                <Icon name="pin" size={15} color={colors.text3} />
                <Text
                  className="font-sans font-semibold text-text-2"
                  style={{ fontSize: 13 }}
                >
                  {courtLabel}
                </Text>
              </View>
              <FormatChip fmtKey={fmtKey} />
            </View>
            <View
              className="flex-row"
              style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}
            >
              <View style={{ flex: 1 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  full
                  icon={<Icon name="info" size={15} color={colors.text} />}
                  onPress={() =>
                    router.push(
                      `/match/new/format-rules?format=${fmtKey}` as never,
                    )
                  }
                >
                  Kurallar
                </Button>
              </View>
              <View style={{ flex: 1.4 }}>
                <Button
                  size="sm"
                  full
                  icon={<Icon name="spark" size={15} color={colors.onLime} />}
                  onPress={() =>
                    m.winner_team == null
                      ? router.push(`/match/${m.id}/start` as never)
                      : router.push(`/match/${m.id}/result` as never)
                  }
                >
                  {m.winner_team == null ? 'Maçı Başlat' : 'Sonucu Onayla'}
                </Button>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// OffersList — feeds from useIncomingMatchRequests
// ---------------------------------------------------------------------------

interface OffersListProps {
  requestsQ: ReturnType<typeof useIncomingMatchRequests>;
  accept: ReturnType<typeof useAcceptMatchRequest>;
  reject: ReturnType<typeof useRejectMatchRequest>;
  ratingOf: (profileId: string | undefined, category: string | undefined) => number | null;
}

function OffersList({ requestsQ, accept, reject, ratingOf }: OffersListProps) {
  const requests: MatchRequestRow[] = (requestsQ.data ?? []).filter(
    (r) => r.status === 'pending',
  );

  if (requestsQ.isLoading) {
    return (
      <View className="items-center justify-center" style={{ paddingVertical: 48 }}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon="bolt"
        title="Bekleyen teklif yok"
        body="Biri sana meydan okuduğunda teklifler burada görünecek."
      />
    );
  }

  return (
    <>
      {requests.map((m) => {
        const fmtKey = toFormatKey(m.format);
        const creatorName = m.creator_profile
          ? `${m.creator_profile.first_name} ${m.creator_profile.last_name}`
          : 'Rakip';
        const timeLabel = formatRequestDateTime(m.proposed_date, m.proposed_time);
        const courtLabel = m.court?.name ?? 'Bilinmeyen kort';
        const catLabel = CATEGORY_LABELS[m.category] ?? m.category;

        const acceptVars = accept.variables as { requestId: string } | undefined;
        const rejectVars = reject.variables as { requestId: string } | undefined;
        const isAccepting = accept.isPending && acceptVars?.requestId === m.id;
        const isRejecting = reject.isPending && rejectVars?.requestId === m.id;

        const creatorElo = ratingOf(m.creator_id, m.category);
        const creatorLevel = creatorElo !== null ? levelForElo(creatorElo) : null;

        return (
          <View
            key={m.id}
            className="rounded-lg border-base border-border-strong bg-surface"
            style={{ padding: 16 }}
          >
            <View
              className="flex-row items-center"
              style={{ gap: 12, marginBottom: 12 }}
            >
              <Avatar name={creatorName} size={46} />
              <View style={{ flex: 1 }}>
                <View className="flex-row items-center" style={{ gap: 7 }}>
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 15.5 }}
                  >
                    {creatorName}
                  </Text>
                  {creatorElo !== null && creatorLevel !== null && (
                    <View
                      className="rounded-pill"
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        backgroundColor: `${creatorLevel.color}22`,
                      }}
                    >
                      <Text
                        className="font-num font-extrabold"
                        style={{ fontSize: 11, color: creatorLevel.color }}
                      >
                        {creatorElo}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  className="font-sans text-text-3"
                  style={{ fontSize: 12.5, marginTop: 2 }}
                >
                  sana meydan okudu · {catLabel}
                </Text>
              </View>
            </View>
            <View
              className="flex-row items-center"
              style={{ gap: 12, marginBottom: 13, flexWrap: 'wrap' }}
            >
              <FormatChip fmtKey={fmtKey} />
              <Text
                className="font-sans font-semibold text-text-2"
                style={{ fontSize: 12.5 }}
              >
                {timeLabel} · {courtLabel}
              </Text>
            </View>
            <View className="flex-row" style={{ gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  size="sm"
                  variant="danger"
                  full
                  onPress={() => reject.mutate({ requestId: m.id })}
                  disabled={isRejecting || isAccepting}
                >
                  {isRejecting ? 'Reddediliyor…' : 'Reddet'}
                </Button>
              </View>
              <View style={{ flex: 1.6 }}>
                <Button
                  size="sm"
                  full
                  icon={
                    <Icon
                      name="check"
                      size={15}
                      color={colors.onLime}
                      stroke={3}
                    />
                  }
                  onPress={() => accept.mutate({ requestId: m.id })}
                  disabled={isAccepting || isRejecting}
                >
                  {isAccepting ? 'Kabul ediliyor…' : 'Kabul et'}
                </Button>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// FeedList — feeds from useOpenCallsFeed
// ---------------------------------------------------------------------------

interface FeedListProps {
  feedQ: ReturnType<typeof useOpenCallsFeed>;
  myQ: ReturnType<typeof useMyOpenCalls>;
  appliedIds: Set<string>;
  applyMutation: ReturnType<typeof useApplyToMatchRequest>;
  ratingOf: (profileId: string | undefined, category: string | undefined) => number | null;
}

function FeedList({ feedQ, myQ, appliedIds, applyMutation, ratingOf }: FeedListProps) {
  const toast = useToast();
  const deleteOpenCall = useDeleteOpenCall();
  const listings: MatchRequestRow[] = feedQ.data ?? [];
  const mine: MatchRequestRow[] = myQ.data ?? [];

  // The user's own open calls are excluded from the community feed, so surface
  // them here at the top — otherwise creating one looks like nothing happened.
  const mySection =
    mine.length > 0 ? (
      <View style={{ marginBottom: 18, gap: 8 }}>
        <Text
          className="font-display font-bold text-text"
          style={{ fontSize: 15, marginBottom: 2 }}
        >
          Senin açık ilanların
        </Text>
        {mine.map((m) => {
          const catLabel = CATEGORY_LABELS[m.category] ?? m.category;
          const windowLabel = m.proposed_date
            ? formatRequestDateTime(m.proposed_date, m.proposed_time)
            : 'Esnek';
          const courtName = (m as { court?: { name?: string } }).court?.name ?? '';
          const confirmDelete = () =>
            Alert.alert('İlanı sil', 'Bu açık ilan ve gelen başvurular silinsin mi?', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: () =>
                  deleteOpenCall.mutate(m.id, {
                    onSuccess: () => toast.show('İlan silindi'),
                    onError: () => toast.show('İlan silinemedi', 'error'),
                  }),
              },
            ]);
          return (
            <View
              key={m.id}
              className="flex-row items-center bg-surface rounded-md"
              style={{
                paddingLeft: 13,
                paddingRight: 6,
                gap: 6,
                borderWidth: 1.5,
                borderColor: colors.borderStrong,
              }}
            >
              <Pressable
                onPress={() => router.push(`/match/open-applicants/${m.id}` as never)}
                className="flex-row items-center"
                style={{ flex: 1, gap: 11, paddingVertical: 13 }}
              >
                <Icon name="flag" size={20} color={colors.court} />
                <View style={{ flex: 1 }}>
                  <Text className="font-sans font-bold text-text" style={{ fontSize: 14 }}>
                    {catLabel} · {windowLabel}
                  </Text>
                  <Text className="font-sans text-text-3" style={{ fontSize: 12, marginTop: 2 }}>
                    {courtName ? `${courtName} · ` : ''}başvuranları gör
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={confirmDelete} hitSlop={8} style={{ padding: 10 }} accessibilityLabel="İlanı sil">
                <Icon name="trash" size={18} color={colors.loss} />
              </Pressable>
            </View>
          );
        })}
      </View>
    ) : null;

  if (feedQ.isLoading) {
    return (
      <View className="items-center justify-center" style={{ paddingVertical: 48 }}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (listings.length === 0) {
    return (
      <>
        {mySection}
        <EmptyState
          icon="flag"
          title={mine.length > 0 ? 'Başka açık ilan yok' : 'Açık ilan yok'}
          body="Topluluk üyeleri açık ilan oluşturduğunda burada görünecek."
          action="İlan oluştur"
          onAction={() => router.push('/match/new/type' as never)}
        />
      </>
    );
  }

  return (
    <>
      {mySection}
      {listings.map((m) => {
        const fmtKey = toFormatKey(m.format);
        const creatorName = m.creator_profile
          ? `${m.creator_profile.first_name} ${m.creator_profile.last_name}`
          : 'Oyuncu';
        const catLabel = CATEGORY_LABELS[m.category] ?? m.category;
        // Window label: show day + time if proposed_date is set
        const windowLabel = m.proposed_date
          ? formatRequestDateTime(m.proposed_date, m.proposed_time)
          : 'Esnek';

        const applyVars = applyMutation.variables as { requestId: string } | undefined;
        const isApplying =
          applyMutation.isPending && applyVars?.requestId === m.id;
        const applied = appliedIds.has(m.id);

        const creatorElo = ratingOf(m.creator_id, m.category);
        const creatorLevel = creatorElo !== null ? levelForElo(creatorElo) : null;

        return (
          <View
            key={m.id}
            className="rounded-lg border-base border-border-strong bg-surface"
            style={{ padding: 16 }}
          >
            <View
              className="flex-row items-center"
              style={{ gap: 12, marginBottom: 12 }}
            >
              <Avatar name={creatorName} size={42} />
              <View style={{ flex: 1 }}>
                <View
                  className="flex-row items-center"
                  style={{ gap: 7 }}
                >
                  <Text
                    className="font-sans font-bold text-text"
                    style={{ fontSize: 15 }}
                  >
                    {creatorName}
                  </Text>
                  {creatorElo !== null && creatorLevel !== null && (
                    <View
                      className="rounded-pill"
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        backgroundColor: `${creatorLevel.color}22`,
                      }}
                    >
                      <Text
                        className="font-num font-extrabold"
                        style={{ fontSize: 11, color: creatorLevel.color }}
                      >
                        {creatorElo}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  className="font-sans text-text-3"
                  style={{ fontSize: 12.5, marginTop: 1 }}
                >
                  {catLabel}
                </Text>
              </View>
            </View>
            <View
              className="flex-row items-center"
              style={{ gap: 12, marginBottom: 13, flexWrap: 'wrap' }}
            >
              <FormatChip fmtKey={fmtKey} />
              <View className="flex-row items-center" style={{ gap: 5 }}>
                <Icon name="clock" size={14} color={colors.text3} />
                <Text
                  className="font-sans font-semibold text-text-2"
                  style={{ fontSize: 12.5 }}
                >
                  {windowLabel}
                </Text>
              </View>
            </View>
            <Button
              full
              size="sm"
              variant="primary"
              icon={
                <Icon
                  name="flag"
                  size={15}
                  color={colors.onLime}
                />
              }
              onPress={() =>
                applyMutation.mutate(
                  { requestId: m.id },
                  {
                    onSuccess: () => toast.show('Başvurun gönderildi'),
                    onError: (e) =>
                      toast.show(
                        e instanceof Error ? e.message : 'Başvuru gönderilemedi',
                        'error',
                      ),
                  },
                )
              }
              disabled={isApplying || applied}
            >
              {applied
                ? 'Başvuruldu ✓'
                : isApplying
                  ? 'Başvuruluyor…'
                  : 'İlana başvur'}
            </Button>
          </View>
        );
      })}
    </>
  );
}
