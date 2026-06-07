# Plan 4b: Match Play + Score + Confirm + ELO + Dispute Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mobile UI for the second half of the match flow — after a request is accepted (Plan 4a), Alice and Bob can see the resulting active match, start play, enter scores el-by-el per format, see live mismatch detection when their inputs differ, confirm the final score (triggering ELO update server-side), and either raise a dispute mid-flow. Match history also lands in this plan so users can browse their past matches. End-to-end verifiable in iOS Simulator against the local Plan 2 backend.

**Architecture:** Active matches surface as a new section in the existing Maçlar tab via a TanStack Query hook (`useActiveMatches`). The match detail screen for `awaiting_confirmation` status replaces the request-detail screen and routes to a format-specific score entry screen (BÜ Klasik, Hızlı Tiebreak, Pro Set 8, 3 Set Klasik — each with its own component). A Zustand store (`score-entry-store`) keeps local play state per match (current el, running counts) so the user can leave + come back. Score submission goes through the Plan 2 `submit-match-score` Edge Function; when both players' submissions match, the match moves forward; when they differ, a mismatch banner appears in both detail screens. Confirm flow calls `confirm-match` and reads the resulting `matches.rating_after_*` to show ELO delta. Dispute flow calls `raise-dispute`. Match history is a paginated TanStack Query against the `matches` table joined to profiles + courts. UI continues with NativeWind placeholder per Plan 8 design redo agreement.

**Tech Stack:** Expo Router 4, TanStack Query v5, Zustand 5, NativeWind 4, `@tennis/shared` schemas reused where applicable, bun:test for store + helper unit tests.

**Spec reference:** `docs/superpowers/specs/2026-06-06-tennis-challenger-design.md` sections 4.4 (maç günü + skor giriş), 4.5 (maç sonu onay), 4.6 (ELO hesap), 4.7 (itiraz akışı), 5.7 (ELO geçmişi — chart deferred to Plan 5).

**Plan dependencies:** Plan 4a (matches inbox + 4 tabs + detail navigation), Plan 2 (Edge Functions: submit-match-score, confirm-match, raise-dispute — all live and tested).

**Plan 4b NOT in scope:**
- ELO history chart (line chart) on profile — **Plan 5** (rozetler + chart fazı)
- Badge unlock animations after match — **Plan 5**
- Realtime push notifications when other player submits — **Plan 7**
- UI polish (animations, haptic feedback, share screens, success animations) — **Plan 8**
- Doubles score entry (4-player teams) — supported by data model but UI is singles-only this plan; doubles UI = **Plan 8 polish**
- Auto-confirm cron ELO application — known limitation, see spec **Plan 5 cleanup**

**Known limitations (documented in code, fixed later):**
- Mismatch detection requires manual re-pull (pull-to-refresh) since realtime subscriptions land in Plan 7
- 48-hour auto-confirm cron does NOT apply ELO (Plan 2 limitation); user must manually confirm in-app for ELO to apply
- "Match Voided" (3-3 BÜ Klasik) flow allows both players to mutually exit, but no shared "tap-to-void" coordination — both must press finish button in their own UI
- All formats trust the user to count points (15/30/40/advantage). UI shows running el count, NOT live point count — keeping it dumb on purpose per spec "amateur match, no per-point tracking"

---

## Dosya Yapısı

```
apps/mobile/
├── app/
│   ├── (app)/
│   │   └── matches.tsx                   # MODIFY: add active matches section
│   ├── match/
│   │   └── [id].tsx                      # MODIFY: branch on status (request vs active vs confirmed)
│   ├── play/
│   │   ├── [matchId].tsx                 # NEW: format-router score entry
│   │   ├── _layout.tsx                   # NEW: modal stack
│   │   └── confirm/[matchId].tsx         # NEW: match summary + confirm
│   └── dispute/
│       └── [matchId].tsx                 # NEW: dispute form
├── components/
│   └── matches/
│       ├── ActiveMatchCard.tsx           # NEW: card for awaiting_confirmation / disputed matches
│       ├── FormatRulesModal.tsx          # NEW: format kuralları (mandatory read)
│       ├── MismatchBanner.tsx            # NEW: "skorlar uyuşmuyor" banner
│       ├── EloDeltaDisplay.tsx           # NEW: shows rating before → after
│       └── score-entry/
│           ├── BuKlasikScoreEntry.tsx    # NEW: el-by-el winner picker (max 7 els)
│           ├── HizliTiebreakScoreEntry.tsx # NEW: 10-point counter
│           ├── ProSet8ScoreEntry.tsx     # NEW: game-by-game counter
│           └── ThreeSetKlasikScoreEntry.tsx # NEW: 2-3 set games input
├── hooks/
│   ├── use-active-matches.ts             # NEW: query — confirmed-by-me-pending matches
│   ├── use-match-detail.ts               # NEW: full match row + nested join
│   ├── use-match-history.ts              # NEW: query — confirmed/voided matches paginated
│   ├── use-submit-match-score.ts         # NEW: mutation
│   ├── use-confirm-match.ts              # NEW: mutation
│   └── use-raise-dispute.ts              # NEW: mutation
├── stores/
│   └── score-entry-store.ts              # NEW: per-match draft state (els / sets / etc.)
└── tests/
    └── stores/
        └── score-entry-store.test.ts     # NEW
```

**Phase outline:**
- **Phase A — Active matches surface (Tasks 1-3):** query, card, integrate into Maçlar tab
- **Phase B — Match detail routing (Tasks 4-5):** detail screen branches on status (request → active → confirmed/voided)
- **Phase C — Format rules + score entry foundation (Tasks 6-8):** modal, store, router screen
- **Phase D — Format-specific score entry (Tasks 9-12):** 4 format components + submit hook
- **Phase E — Mismatch + confirm + ELO (Tasks 13-15):** banner, confirm mutation, ELO delta display
- **Phase F — Dispute (Tasks 16-17):** form screen + raise mutation
- **Phase G — Match history (Tasks 18-19):** history hook + screen on Profil tab
- **Phase H — E2E verification (Task 20):** Simulator manual run-through

---

## Phase A — Active matches surface

### Task 1: useActiveMatches query

**Files:**
- Create: `apps/mobile/hooks/use-active-matches.ts`

- [ ] **Step 1: Add a new query key path**

Edit `apps/mobile/lib/query-keys.ts`. Find the `matchRequests` block. AFTER it, ADD inside the same const definition:

```typescript
  activeMatches: {
    all: ['active-matches'] as const,
    list: () => [...queryKeys.activeMatches.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.activeMatches.all, 'detail', id] as const,
  },
  matchHistory: {
    all: ['match-history'] as const,
    mine: () => [...queryKeys.matchHistory.all, 'mine'] as const,
  },
```

(Place these between `applications` and `players` or anywhere consistent with the existing alphabetical-ish order. Final file structure should still be a single object literal.)

- [ ] **Step 2: Create use-active-matches.ts**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export type MatchStatus = 'awaiting_confirmation' | 'confirmed' | 'disputed' | 'voided';

export interface ActiveMatchRow {
  id: string;
  match_request_id: string | null;
  category: string;
  format: string;
  is_rated: boolean;
  played_at: string;
  status: MatchStatus;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  score_team_a: number;
  score_team_b: number;
  winner_team: 'a' | 'b' | 'void' | null;
  score_details: unknown;
  confirmed_by: string[];
  rating_before_team_a: number | null;
  rating_after_team_a: number | null;
  rating_before_team_b: number | null;
  rating_after_team_b: number | null;
  created_at: string;
  court?: { name: string } | null;
}

export function useActiveMatches() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<ActiveMatchRow[]>({
    queryKey: queryKeys.activeMatches.list(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, match_request_id, category, format, is_rated, played_at, status,
          team_a_player_ids, team_b_player_ids,
          score_team_a, score_team_b, winner_team, score_details, confirmed_by,
          rating_before_team_a, rating_after_team_a,
          rating_before_team_b, rating_after_team_b,
          created_at,
          court:courts(name)
        `)
        .in('status', ['awaiting_confirmation', 'disputed'])
        .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`)
        .order('played_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ActiveMatchRow[];
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-active-matches.ts apps/mobile/lib/query-keys.ts
git commit -m "feat(mobile): add useActiveMatches query + query keys for matches/history"
```

---

### Task 2: ActiveMatchCard component

**Files:**
- Create: `apps/mobile/components/matches/ActiveMatchCard.tsx`

- [ ] **Step 1: Create the card**

```typescript
import { Pressable, Text, View } from 'react-native';
import type { ActiveMatchRow } from '../../hooks/use-active-matches';

interface Props {
  match: ActiveMatchRow;
  myUserId: string;
  onPress: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  bu_klasik: 'BÜ Klasik',
  hizli_tiebreak: 'Hızlı Tiebreak',
  pro_set_8: 'Pro Set 8',
  '3set_klasik': '3 Set Klasik',
};

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek', kadin_tek: 'Kadın Tek', open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift', kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift', open_cift: 'Open Çift',
};

export function ActiveMatchCard({ match, myUserId, onPress }: Props) {
  const onTeamA = match.team_a_player_ids.includes(myUserId);
  const myConfirmed = match.confirmed_by.includes(myUserId);
  const winnerSet = match.winner_team !== null;

  let stateLabel = '';
  if (match.status === 'disputed') stateLabel = '⚠️ İtirazda';
  else if (winnerSet && myConfirmed) stateLabel = '✓ Onayladın, karşı taraf bekleniyor';
  else if (winnerSet && !myConfirmed) stateLabel = '✏️ Onayını bekliyor';
  else stateLabel = '🎾 Maçı oyna';

  const playedAt = new Date(match.played_at);
  const dateStr = playedAt.toLocaleDateString('tr-TR');
  const timeStr = playedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 rounded-lg border border-primary bg-blue-50 p-3 active:opacity-80"
    >
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900">
          {CATEGORY_LABELS[match.category] ?? match.category}
        </Text>
        <Text className="text-xs text-gray-600">
          {match.is_rated ? '🏆 Sıralama' : '🤝 Dostluk'}
        </Text>
      </View>
      <Text className="text-sm text-gray-700">
        {FORMAT_LABELS[match.format] ?? match.format} · {dateStr} {timeStr} · {match.court?.name ?? '—'}
      </Text>
      <Text className="mt-2 text-sm font-medium text-primary">{stateLabel}</Text>
      {winnerSet && (
        <Text className="mt-1 text-sm text-gray-600">
          Skor: {onTeamA ? `${match.score_team_a} - ${match.score_team_b}` : `${match.score_team_b} - ${match.score_team_a}`}
        </Text>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/matches/ActiveMatchCard.tsx
git commit -m "feat(mobile): add ActiveMatchCard component"
```

---

### Task 3: Integrate active matches into Maçlar tab

**Files:**
- Modify: `apps/mobile/app/(app)/matches.tsx`

- [ ] **Step 1: Update matches.tsx with active section**

Replace the entire file contents with:

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { ActiveMatchCard } from '../../components/matches/ActiveMatchCard';
import { EmptyState } from '../../components/matches/EmptyState';
import { RequestCard } from '../../components/matches/RequestCard';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useActiveMatches } from '../../hooks/use-active-matches';
import {
  useIncomingMatchRequests,
  useOutgoingMatchRequests,
  type MatchRequestRow,
} from '../../hooks/use-match-requests';
import { useAuthStore } from '../../stores/auth-store';

type Tab = 'active' | 'incoming' | 'outgoing';

export default function MatchesScreen() {
  const myUserId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<Tab>('active');

  const active = useActiveMatches();
  const incoming = useIncomingMatchRequests();
  const outgoing = useOutgoingMatchRequests();

  const activeData = active.data ?? [];
  const incomingData: MatchRequestRow[] = incoming.data ?? [];
  const outgoingData: MatchRequestRow[] = outgoing.data ?? [];

  const renderActive = () => (
    <FlatList
      data={activeData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ActiveMatchCard
          match={item}
          myUserId={myUserId ?? ''}
          onPress={() => router.push(`/match/${item.id}`)}
        />
      )}
      refreshControl={<RefreshControl refreshing={active.isRefetching} onRefresh={() => active.refetch()} />}
      ListEmptyComponent={
        <EmptyState title="Aktif maçın yok" message="Bir maç teklifi kabul edildiğinde burada görünür." icon="🎾" />
      }
    />
  );

  const renderIncoming = () => (
    <FlatList
      data={incomingData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RequestCard
          request={item}
          myUserId={myUserId ?? ''}
          onPress={() => router.push(`/match/${item.id}`)}
        />
      )}
      refreshControl={<RefreshControl refreshing={incoming.isRefetching} onRefresh={() => incoming.refetch()} />}
      ListEmptyComponent={
        <EmptyState title="Gelen teklif yok" message="Birisi sana meydan okuduğunda burada görünecek." />
      }
    />
  );

  const renderOutgoing = () => (
    <FlatList
      data={outgoingData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RequestCard
          request={item}
          myUserId={myUserId ?? ''}
          onPress={() => router.push(`/match/${item.id}`)}
        />
      )}
      refreshControl={<RefreshControl refreshing={outgoing.isRefetching} onRefresh={() => outgoing.refetch()} />}
      ListEmptyComponent={
        <EmptyState title="Atılan teklif yok" message="Maç oluşturmak için sağ alttaki + butonuna bas." />
      }
    />
  );

  return (
    <ScreenContainer>
      <View className="mb-3 flex-row border-b border-gray-200">
        <Pressable
          onPress={() => setTab('active')}
          className={`flex-1 items-center py-3 ${tab === 'active' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={tab === 'active' ? 'font-semibold text-primary' : 'text-gray-600'}>
            Aktif ({activeData.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('incoming')}
          className={`flex-1 items-center py-3 ${tab === 'incoming' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={tab === 'incoming' ? 'font-semibold text-primary' : 'text-gray-600'}>
            Gelen ({incomingData.filter((r) => r.status === 'pending').length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('outgoing')}
          className={`flex-1 items-center py-3 ${tab === 'outgoing' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={tab === 'outgoing' ? 'font-semibold text-primary' : 'text-gray-600'}>
            Atılan ({outgoingData.filter((r) => r.status === 'pending').length})
          </Text>
        </Pressable>
      </View>

      {myUserId ? (
        tab === 'active' ? renderActive() : tab === 'incoming' ? renderIncoming() : renderOutgoing()
      ) : null}

      <Pressable
        onPress={() => router.push('/create-match')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
      >
        <Text className="text-3xl text-white">+</Text>
      </Pressable>
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add 'apps/mobile/app/(app)/matches.tsx'
git commit -m "feat(mobile): add Aktif tab to Maçlar screen"
```

---

## Phase B — Match detail routing

### Task 4: useMatchDetail query (for accepted matches)

**Files:**
- Create: `apps/mobile/hooks/use-match-detail.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import type { ActiveMatchRow } from './use-active-matches';

export function useMatchDetail(id: string | undefined) {
  return useQuery<ActiveMatchRow | null>({
    queryKey: queryKeys.activeMatches.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, match_request_id, category, format, is_rated, played_at, status,
          team_a_player_ids, team_b_player_ids,
          score_team_a, score_team_b, winner_team, score_details, confirmed_by,
          rating_before_team_a, rating_after_team_a,
          rating_before_team_b, rating_after_team_b,
          created_at,
          court:courts(name)
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ActiveMatchRow | null;
    },
    enabled: !!id,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/use-match-detail.ts
git commit -m "feat(mobile): add useMatchDetail query for active matches"
```

---

### Task 5: Match detail screen branches on (request vs match)

**Files:**
- Modify: `apps/mobile/app/match/[id].tsx`

The current implementation only handles match REQUESTS. We need to also handle MATCHES (post-acceptance, status awaiting_confirmation / confirmed / disputed / voided). Match IDs and Request IDs are distinct UUIDs from different tables.

- [ ] **Step 1: Update detail screen with both queries**

Replace `apps/mobile/app/match/[id].tsx` ENTIRELY with:

```typescript
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
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

  // Try both — only one will match (match_requests vs matches)
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

  // Active match takes precedence (post-acceptance)
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
          </View>
        </ScreenContainer>
      </>
    );
  }

  // Otherwise render request detail (unchanged)
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/match/\[id\].tsx
git commit -m "feat(mobile): match detail screen handles both requests and active matches"
```

---

## Phase C — Format rules + score entry foundation

### Task 6: FormatRulesModal component

**Files:**
- Create: `apps/mobile/components/matches/FormatRulesModal.tsx`

- [ ] **Step 1: Create the modal**

```typescript
import { Modal, ScrollView, Text, View } from 'react-native';
import { Button } from '../ui/Button';

interface Props {
  visible: boolean;
  format: string;
  onAcknowledge: () => void;
}

const RULES: Record<string, { title: string; bullets: string[] }> = {
  bu_klasik: {
    title: 'BÜ Klasik (~60 dk)',
    bullets: [
      'Maç en fazla 1 saat sürer.',
      'İlk 4 eli kazanan maçı alır.',
      'Sayılar 15 / 30 / 40 / avantaj olarak sayılır (klasik tenis sayımı).',
      '3-3 olursa "Maçı Bitir" butonuna basın — maç yapılmamış sayılır, ELO etkilenmez.',
      'Her el sonunda her iki oyuncu da aynı skoru girmek zorundadır.',
    ],
  },
  hizli_tiebreak: {
    title: 'Hızlı Tiebreak (~20 dk)',
    bullets: [
      'Sadece bir adet 10 sayılık match tiebreak oynanır.',
      '10 sayıya ilk ulaşan ve en az 2 sayı farkı olan kazanır.',
      '9-9 olursa 2 sayı farkı sağlanana kadar uzar.',
    ],
  },
  pro_set_8: {
    title: 'Pro Set 8 (~75 dk)',
    bullets: [
      'Game bazında oynanır (klasik tenis sayımı).',
      'İlk 8 game alan kazanır (8-6 veya daha fazla fark).',
      '6-6 olursa kim 8\'e gelirse maçı alır.',
      '8-8 olursa 7 sayılık tiebreak oynanır.',
    ],
  },
  '3set_klasik': {
    title: '3 Set Klasik (~2 saat)',
    bullets: [
      'ATP standardı: ilk 2 seti alan maçı alır.',
      'Her set 6 game (2 game farkla).',
      '6-6 olursa tiebreak (7 sayılık).',
      'Sayılar 15 / 30 / 40 / avantaj olarak sayılır.',
    ],
  },
};

export function FormatRulesModal({ visible, format, onAcknowledge }: Props) {
  const rules = RULES[format] ?? { title: 'Bilinmeyen format', bullets: ['Format kuralları tanımlı değil.'] };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white p-6">
        <Text className="mb-4 text-2xl font-bold text-gray-900">{rules.title}</Text>
        <ScrollView className="flex-1">
          {rules.bullets.map((b, i) => (
            <View key={i} className="mb-3 flex-row gap-2">
              <Text className="text-base text-primary">•</Text>
              <Text className="flex-1 text-base text-gray-800">{b}</Text>
            </View>
          ))}
        </ScrollView>
        <View className="mt-4">
          <Button onPress={onAcknowledge}>Anladım, başla</Button>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/matches/FormatRulesModal.tsx
git commit -m "feat(mobile): add FormatRulesModal for all 4 formats"
```

---

### Task 7: score-entry-store (Zustand)

**Files:**
- Create: `apps/mobile/stores/score-entry-store.ts`
- Create: `apps/mobile/tests/stores/score-entry-store.test.ts`

- [ ] **Step 1: Create the store**

```typescript
import { create } from 'zustand';

export type ElWinner = 'a' | 'b';

export interface BuKlasikDraft {
  els: { el: number; winner: ElWinner }[];
}

export interface HizliTiebreakDraft {
  points: { a: number; b: number };
}

export interface ProSet8Draft {
  games: { a: number; b: number };
  tiebreakScore?: { a: number; b: number };
}

export interface ThreeSetKlasikDraft {
  sets: { set: number; a: number; b: number }[];
}

export type DraftByFormat = {
  bu_klasik: BuKlasikDraft;
  hizli_tiebreak: HizliTiebreakDraft;
  pro_set_8: ProSet8Draft;
  '3set_klasik': ThreeSetKlasikDraft;
};

interface State {
  drafts: Record<string, BuKlasikDraft | HizliTiebreakDraft | ProSet8Draft | ThreeSetKlasikDraft>;
  setBuKlasik: (matchId: string, draft: BuKlasikDraft) => void;
  setHizliTiebreak: (matchId: string, draft: HizliTiebreakDraft) => void;
  setProSet8: (matchId: string, draft: ProSet8Draft) => void;
  setThreeSetKlasik: (matchId: string, draft: ThreeSetKlasikDraft) => void;
  clear: (matchId: string) => void;
  getBuKlasik: (matchId: string) => BuKlasikDraft;
  getHizliTiebreak: (matchId: string) => HizliTiebreakDraft;
  getProSet8: (matchId: string) => ProSet8Draft;
  getThreeSetKlasik: (matchId: string) => ThreeSetKlasikDraft;
}

const initialBuKlasik: BuKlasikDraft = { els: [] };
const initialTiebreak: HizliTiebreakDraft = { points: { a: 0, b: 0 } };
const initialProSet: ProSet8Draft = { games: { a: 0, b: 0 } };
const initialThreeSet: ThreeSetKlasikDraft = { sets: [] };

export const useScoreEntryStore = create<State>((set, get) => ({
  drafts: {},
  setBuKlasik: (matchId, draft) => set((s) => ({ drafts: { ...s.drafts, [matchId]: draft } })),
  setHizliTiebreak: (matchId, draft) => set((s) => ({ drafts: { ...s.drafts, [matchId]: draft } })),
  setProSet8: (matchId, draft) => set((s) => ({ drafts: { ...s.drafts, [matchId]: draft } })),
  setThreeSetKlasik: (matchId, draft) => set((s) => ({ drafts: { ...s.drafts, [matchId]: draft } })),
  clear: (matchId) =>
    set((s) => {
      const next = { ...s.drafts };
      delete next[matchId];
      return { drafts: next };
    }),
  getBuKlasik: (matchId) => (get().drafts[matchId] as BuKlasikDraft | undefined) ?? initialBuKlasik,
  getHizliTiebreak: (matchId) => (get().drafts[matchId] as HizliTiebreakDraft | undefined) ?? initialTiebreak,
  getProSet8: (matchId) => (get().drafts[matchId] as ProSet8Draft | undefined) ?? initialProSet,
  getThreeSetKlasik: (matchId) => (get().drafts[matchId] as ThreeSetKlasikDraft | undefined) ?? initialThreeSet,
}));
```

- [ ] **Step 2: Tests**

```typescript
import { beforeEach, describe, expect, test } from 'bun:test';
import { useScoreEntryStore } from '../../stores/score-entry-store';

describe('score-entry-store', () => {
  beforeEach(() => {
    useScoreEntryStore.setState({ drafts: {} });
  });

  test('bu_klasik draft starts empty', () => {
    const d = useScoreEntryStore.getState().getBuKlasik('m1');
    expect(d.els).toEqual([]);
  });

  test('setBuKlasik persists by match id', () => {
    useScoreEntryStore.getState().setBuKlasik('m1', { els: [{ el: 1, winner: 'a' }] });
    expect(useScoreEntryStore.getState().getBuKlasik('m1').els).toEqual([{ el: 1, winner: 'a' }]);
    expect(useScoreEntryStore.getState().getBuKlasik('m2').els).toEqual([]);
  });

  test('hizli_tiebreak default points 0-0', () => {
    const d = useScoreEntryStore.getState().getHizliTiebreak('m1');
    expect(d.points).toEqual({ a: 0, b: 0 });
  });

  test('clear removes specific match draft only', () => {
    useScoreEntryStore.getState().setBuKlasik('m1', { els: [{ el: 1, winner: 'a' }] });
    useScoreEntryStore.getState().setBuKlasik('m2', { els: [{ el: 1, winner: 'b' }] });
    useScoreEntryStore.getState().clear('m1');
    expect(useScoreEntryStore.getState().getBuKlasik('m1').els).toEqual([]);
    expect(useScoreEntryStore.getState().getBuKlasik('m2').els).toEqual([{ el: 1, winner: 'b' }]);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
/Users/hazarustun/.bun/bin/bun test tests/stores/score-entry-store.test.ts 2>&1 | tail -3
```

Expected: 4 pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/stores/score-entry-store.ts apps/mobile/tests/stores/score-entry-store.test.ts
git commit -m "feat(mobile): add score-entry-store (Zustand)"
```

---

### Task 8: useSubmitMatchScore mutation

**Files:**
- Create: `apps/mobile/hooks/use-submit-match-score.ts`

- [ ] **Step 1: Create the mutation**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

type WinnerTeam = 'a' | 'b' | 'void';

export interface SubmitMatchScoreInput {
  matchId: string;
  scoreTeamA: number;
  scoreTeamB: number;
  winnerTeam: WinnerTeam;
  els?: { el: number; winner: 'a' | 'b' }[];
  sets?: { set: number; a: number; b: number }[];
  games?: { a: number; b: number };
  tiebreakScore?: { a: number; b: number };
  points?: { a: number; b: number };
}

export interface SubmitMatchScoreResponse {
  matched: boolean;
}

export function useSubmitMatchScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitMatchScoreInput) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<SubmitMatchScoreResponse>('submit-match-score', input, token);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.detail(variables.matchId) });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/use-submit-match-score.ts
git commit -m "feat(mobile): add useSubmitMatchScore mutation"
```

---

## Phase D — Format-specific score entry

### Task 9: BÜ Klasik score entry component + screen

**Files:**
- Create: `apps/mobile/components/matches/score-entry/BuKlasikScoreEntry.tsx`
- Create: `apps/mobile/app/play/_layout.tsx`
- Create: `apps/mobile/app/play/[matchId].tsx`

- [ ] **Step 1: BuKlasikScoreEntry component**

```typescript
import { Alert, Pressable, Text, View } from 'react-native';
import { Button } from '../../ui/Button';
import {
  useScoreEntryStore,
  type BuKlasikDraft,
} from '../../../stores/score-entry-store';

interface Props {
  matchId: string;
  myLetter: 'a' | 'b';
  onSubmit: (draft: BuKlasikDraft, winnerTeam: 'a' | 'b' | 'void', scoreA: number, scoreB: number) => void;
  submitting: boolean;
}

const TARGET = 4;
const MAX_ELS = 7; // 4 + 3 since at 3-3 a 7th decides per spec? actually 3-3 ends as void

export function BuKlasikScoreEntry({ matchId, myLetter, onSubmit, submitting }: Props) {
  const draft = useScoreEntryStore((s) => s.getBuKlasik(matchId));
  const setDraft = useScoreEntryStore((s) => s.setBuKlasik);

  const scoreA = draft.els.filter((e) => e.winner === 'a').length;
  const scoreB = draft.els.filter((e) => e.winner === 'b').length;
  const currentEl = draft.els.length + 1;

  const matchComplete = scoreA >= TARGET || scoreB >= TARGET;
  const isThreeThree = scoreA === 3 && scoreB === 3;
  const canVoid = isThreeThree && !matchComplete;

  const recordEl = (winner: 'a' | 'b') => {
    if (matchComplete) return;
    if (draft.els.length >= MAX_ELS) return;
    setDraft(matchId, { els: [...draft.els, { el: currentEl, winner }] });
  };

  const undoLast = () => {
    if (draft.els.length === 0) return;
    setDraft(matchId, { els: draft.els.slice(0, -1) });
  };

  const submitVoid = () => {
    Alert.alert('Maçı bitir', '3-3 — maç yapılmamış sayılacak. Onaylıyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Evet, bitir', onPress: () => onSubmit(draft, 'void', scoreA, scoreB) },
    ]);
  };

  const submitFinal = () => {
    const winnerTeam: 'a' | 'b' = scoreA > scoreB ? 'a' : 'b';
    onSubmit(draft, winnerTeam, scoreA, scoreB);
  };

  return (
    <View className="flex-1 gap-4">
      <View className="rounded-lg bg-gray-100 p-4">
        <Text className="mb-2 text-center text-sm text-gray-600">El {Math.min(currentEl, MAX_ELS)}</Text>
        <View className="flex-row items-center justify-center gap-6">
          <View className="items-center">
            <Text className="text-xs text-gray-500">{myLetter === 'a' ? 'Sen' : 'Rakip'}</Text>
            <Text className="text-5xl font-bold text-gray-900">{scoreA}</Text>
          </View>
          <Text className="text-3xl text-gray-400">-</Text>
          <View className="items-center">
            <Text className="text-xs text-gray-500">{myLetter === 'b' ? 'Sen' : 'Rakip'}</Text>
            <Text className="text-5xl font-bold text-gray-900">{scoreB}</Text>
          </View>
        </View>
      </View>

      <Text className="text-sm text-gray-700">
        Bu eli kim kazandı?
      </Text>
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => recordEl('a')}
          disabled={matchComplete}
          className={`flex-1 items-center rounded-lg border border-primary py-4 ${matchComplete ? 'opacity-50' : 'active:bg-blue-50'}`}
        >
          <Text className="text-lg font-semibold text-primary">{myLetter === 'a' ? 'Ben' : 'Rakip'}</Text>
        </Pressable>
        <Pressable
          onPress={() => recordEl('b')}
          disabled={matchComplete}
          className={`flex-1 items-center rounded-lg border border-primary py-4 ${matchComplete ? 'opacity-50' : 'active:bg-blue-50'}`}
        >
          <Text className="text-lg font-semibold text-primary">{myLetter === 'b' ? 'Ben' : 'Rakip'}</Text>
        </Pressable>
      </View>

      <Pressable onPress={undoLast} disabled={draft.els.length === 0} className="items-center py-2">
        <Text className={draft.els.length === 0 ? 'text-gray-400' : 'text-primary'}>↩ Son eli geri al</Text>
      </Pressable>

      {matchComplete && (
        <View className="rounded-lg bg-green-50 p-3">
          <Text className="text-base font-medium text-green-900">
            Maç bitti: {scoreA} - {scoreB}
          </Text>
        </View>
      )}

      <View className="mt-auto gap-3">
        {canVoid && (
          <Button onPress={submitVoid} variant="ghost">Maçı bitir (3-3 voided)</Button>
        )}
        {matchComplete && (
          <Button onPress={submitFinal} loading={submitting}>Skoru gönder</Button>
        )}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: play/_layout.tsx**

```typescript
import { Stack } from 'expo-router';

export default function PlayLayout() {
  return <Stack screenOptions={{ headerShown: true }} />;
}
```

- [ ] **Step 3: play/[matchId].tsx — format router**

```typescript
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';
import { BuKlasikScoreEntry } from '../../components/matches/score-entry/BuKlasikScoreEntry';
import { FormatRulesModal } from '../../components/matches/FormatRulesModal';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useMatchDetail } from '../../hooks/use-match-detail';
import { useSubmitMatchScore } from '../../hooks/use-submit-match-score';
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

  const onBuKlasikSubmit = async (
    draft: { els: { el: number; winner: 'a' | 'b' }[] },
    winnerTeam: 'a' | 'b' | 'void',
    scoreA: number,
    scoreB: number,
  ) => {
    try {
      const res = await submit.mutateAsync({
        matchId,
        scoreTeamA: scoreA,
        scoreTeamB: scoreB,
        winnerTeam,
        els: draft.els,
      });
      clearDraft(matchId);
      if (res.matched) {
        Alert.alert('Eşleşti', 'Karşı taraftan onay bekleniyor. Onaylama ekranına yönlendiriliyorsun.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      } else {
        Alert.alert('Gönderildi', 'Rakip henüz aynı skoru girmedi. Eşleşince devam edebileceksin.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      }
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
              onSubmit={onBuKlasikSubmit}
              submitting={submit.isPending}
            />
          )}
          {/* Other formats added in Tasks 10-12 */}
          {m.format !== 'bu_klasik' && (
            <View className="flex-1 items-center justify-center">
              <View className="rounded-lg bg-yellow-50 p-4">
                <Text className="text-yellow-900">
                  Bu format için skor girişi henüz hazır değil (Task 10-12'de gelecek).
                </Text>
              </View>
            </View>
          )}
        </ScreenContainer>
      )}
    </>
  );
}
```

Wait — `Text` is not imported. Add `Text` import.

Replace `import { Alert, ActivityIndicator, View } from 'react-native';` with:

```typescript
import { Alert, ActivityIndicator, Text, View } from 'react-native';
```

- [ ] **Step 4: Commit**

```bash
mkdir -p /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile/app/play
mkdir -p /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile/components/matches/score-entry
git add apps/mobile/app/play/ apps/mobile/components/matches/score-entry/
git commit -m "feat(mobile): BÜ Klasik el-by-el score entry"
```

---

### Task 10: Hızlı Tiebreak score entry

**Files:**
- Create: `apps/mobile/components/matches/score-entry/HizliTiebreakScoreEntry.tsx`
- Modify: `apps/mobile/app/play/[matchId].tsx`

- [ ] **Step 1: HizliTiebreakScoreEntry**

```typescript
import { Text, View } from 'react-native';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import {
  useScoreEntryStore,
  type HizliTiebreakDraft,
} from '../../../stores/score-entry-store';
import { useState } from 'react';

interface Props {
  matchId: string;
  myLetter: 'a' | 'b';
  onSubmit: (draft: HizliTiebreakDraft, winnerTeam: 'a' | 'b' | 'void', scoreA: number, scoreB: number) => void;
  submitting: boolean;
}

export function HizliTiebreakScoreEntry({ matchId, myLetter, onSubmit, submitting }: Props) {
  const draft = useScoreEntryStore((s) => s.getHizliTiebreak(matchId));
  const setDraft = useScoreEntryStore((s) => s.setHizliTiebreak);
  const [aStr, setAStr] = useState(String(draft.points.a));
  const [bStr, setBStr] = useState(String(draft.points.b));
  const [err, setErr] = useState<string>();

  const onPersist = () => {
    setDraft(matchId, { points: { a: Number(aStr) || 0, b: Number(bStr) || 0 } });
  };

  const onSubmitTap = () => {
    const a = Number(aStr);
    const b = Number(bStr);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      setErr('Geçerli sayı gir');
      return;
    }
    if (a === b) {
      setErr('Tiebreakte beraberlik olmaz, kazanan en az 2 fark olmalı');
      return;
    }
    const diff = Math.abs(a - b);
    const max = Math.max(a, b);
    if (max < 10 || diff < 2) {
      setErr('Kazanan ≥10 ve ≥2 fark olmalı');
      return;
    }
    const winner: 'a' | 'b' = a > b ? 'a' : 'b';
    onPersist();
    onSubmit({ points: { a, b } }, winner, a, b);
  };

  return (
    <View className="flex-1 gap-4">
      <Text className="text-sm text-gray-700">
        Maç sonu skorunu gir (örn. 10-7).
      </Text>
      <TextField
        label={myLetter === 'a' ? 'Senin sayın' : 'Rakibin sayısı'}
        keyboardType="number-pad"
        value={aStr}
        onChangeText={(v) => { setAStr(v); setErr(undefined); }}
      />
      <TextField
        label={myLetter === 'b' ? 'Senin sayın' : 'Rakibin sayısı'}
        keyboardType="number-pad"
        value={bStr}
        onChangeText={(v) => { setBStr(v); setErr(undefined); }}
        error={err}
      />
      <View className="mt-auto">
        <Button onPress={onSubmitTap} loading={submitting}>Skoru gönder</Button>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Update play/[matchId].tsx to support hizli_tiebreak**

In `apps/mobile/app/play/[matchId].tsx`, add import after existing imports:

```typescript
import { HizliTiebreakScoreEntry } from '../../components/matches/score-entry/HizliTiebreakScoreEntry';
```

Add handler before the return:

```typescript
  const onHizliTiebreakSubmit = async (
    draft: { points: { a: number; b: number } },
    winnerTeam: 'a' | 'b' | 'void',
    scoreA: number,
    scoreB: number,
  ) => {
    try {
      const res = await submit.mutateAsync({
        matchId,
        scoreTeamA: scoreA,
        scoreTeamB: scoreB,
        winnerTeam,
        points: draft.points,
      });
      clearDraft(matchId);
      if (res.matched) {
        Alert.alert('Eşleşti', 'Karşı taraftan onay bekleniyor.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      } else {
        Alert.alert('Gönderildi', 'Rakip henüz aynı skoru girmedi.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      }
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Gönderilemedi');
    }
  };
```

Replace the `{m.format !== 'bu_klasik' && ...}` block with:

```typescript
          {m.format === 'hizli_tiebreak' && (
            <HizliTiebreakScoreEntry
              matchId={matchId}
              myLetter={myLetter}
              onSubmit={onHizliTiebreakSubmit}
              submitting={submit.isPending}
            />
          )}
          {(m.format === 'pro_set_8' || m.format === '3set_klasik') && (
            <View className="flex-1 items-center justify-center">
              <View className="rounded-lg bg-yellow-50 p-4">
                <Text className="text-yellow-900">
                  Bu format için skor girişi henüz hazır değil (sonraki task'larda gelecek).
                </Text>
              </View>
            </View>
          )}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/matches/score-entry/HizliTiebreakScoreEntry.tsx apps/mobile/app/play/\[matchId\].tsx
git commit -m "feat(mobile): Hızlı Tiebreak score entry"
```

---

### Task 11: Pro Set 8 score entry

**Files:**
- Create: `apps/mobile/components/matches/score-entry/ProSet8ScoreEntry.tsx`
- Modify: `apps/mobile/app/play/[matchId].tsx`

- [ ] **Step 1: ProSet8ScoreEntry**

```typescript
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import {
  useScoreEntryStore,
  type ProSet8Draft,
} from '../../../stores/score-entry-store';

interface Props {
  matchId: string;
  myLetter: 'a' | 'b';
  onSubmit: (draft: ProSet8Draft, winnerTeam: 'a' | 'b' | 'void', scoreA: number, scoreB: number) => void;
  submitting: boolean;
}

export function ProSet8ScoreEntry({ matchId, myLetter, onSubmit, submitting }: Props) {
  const draft = useScoreEntryStore((s) => s.getProSet8(matchId));
  const setDraft = useScoreEntryStore((s) => s.setProSet8);

  const [gamesA, setGamesA] = useState(String(draft.games.a));
  const [gamesB, setGamesB] = useState(String(draft.games.b));
  const [hasTiebreak, setHasTiebreak] = useState(!!draft.tiebreakScore);
  const [tbA, setTbA] = useState(String(draft.tiebreakScore?.a ?? 0));
  const [tbB, setTbB] = useState(String(draft.tiebreakScore?.b ?? 0));
  const [err, setErr] = useState<string>();

  const onSubmitTap = () => {
    const a = Number(gamesA);
    const b = Number(gamesB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      setErr('Geçerli game sayısı gir');
      return;
    }
    const max = Math.max(a, b);
    const diff = Math.abs(a - b);
    if (max < 8) {
      setErr('Kazanan en az 8 game almalı');
      return;
    }
    // 8-6 or 8-5 or higher with ≥2 diff — OR 8-8 with tiebreak
    let winner: 'a' | 'b';
    let tb: { a: number; b: number } | undefined;
    if (a === 8 && b === 8) {
      if (!hasTiebreak) {
        setErr('8-8 olduğunda tiebreak skoru gir');
        return;
      }
      const ta = Number(tbA);
      const tb_ = Number(tbB);
      if (!Number.isInteger(ta) || !Number.isInteger(tb_) || ta < 0 || tb_ < 0 || Math.abs(ta - tb_) < 2) {
        setErr('Tiebreak skoru geçersiz (en az 2 fark)');
        return;
      }
      winner = ta > tb_ ? 'a' : 'b';
      tb = { a: ta, b: tb_ };
    } else if (diff >= 2) {
      winner = a > b ? 'a' : 'b';
    } else {
      setErr('Skor geçersiz (örn. 8-6, 8-5, 8-4, 9-7, 9-8 tiebreak)');
      return;
    }

    const persisted: ProSet8Draft = { games: { a, b }, tiebreakScore: tb };
    setDraft(matchId, persisted);
    const scoreA = a;
    const scoreB = b;
    onSubmit(persisted, winner, scoreA, scoreB);
  };

  return (
    <View className="flex-1 gap-3">
      <Text className="text-sm text-gray-700">Maç sonu game skorunu gir.</Text>
      <TextField
        label={myLetter === 'a' ? 'Senin game' : 'Rakibin game'}
        keyboardType="number-pad"
        value={gamesA}
        onChangeText={(v) => { setGamesA(v); setErr(undefined); }}
      />
      <TextField
        label={myLetter === 'b' ? 'Senin game' : 'Rakibin game'}
        keyboardType="number-pad"
        value={gamesB}
        onChangeText={(v) => { setGamesB(v); setErr(undefined); }}
      />
      <View className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
        <Text className="text-base text-gray-900">8-8 oldu, tiebreak oynandı</Text>
        <Switch value={hasTiebreak} onValueChange={setHasTiebreak} />
      </View>
      {hasTiebreak && (
        <>
          <TextField
            label={`Tiebreak — ${myLetter === 'a' ? 'sen' : 'rakip'}`}
            keyboardType="number-pad"
            value={tbA}
            onChangeText={(v) => { setTbA(v); setErr(undefined); }}
          />
          <TextField
            label={`Tiebreak — ${myLetter === 'b' ? 'sen' : 'rakip'}`}
            keyboardType="number-pad"
            value={tbB}
            onChangeText={(v) => { setTbB(v); setErr(undefined); }}
          />
        </>
      )}
      {err && <Text className="text-sm text-red-500">{err}</Text>}
      <View className="mt-auto">
        <Button onPress={onSubmitTap} loading={submitting}>Skoru gönder</Button>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Wire ProSet8 into play/[matchId].tsx**

Add import:

```typescript
import { ProSet8ScoreEntry } from '../../components/matches/score-entry/ProSet8ScoreEntry';
```

Add handler:

```typescript
  const onProSet8Submit = async (
    draft: { games: { a: number; b: number }; tiebreakScore?: { a: number; b: number } },
    winnerTeam: 'a' | 'b' | 'void',
    scoreA: number,
    scoreB: number,
  ) => {
    try {
      const res = await submit.mutateAsync({
        matchId,
        scoreTeamA: scoreA,
        scoreTeamB: scoreB,
        winnerTeam,
        games: draft.games,
        tiebreakScore: draft.tiebreakScore,
      });
      clearDraft(matchId);
      Alert.alert(res.matched ? 'Eşleşti' : 'Gönderildi', res.matched ? 'Karşı taraftan onay bekleniyor.' : 'Rakip henüz aynı skoru girmedi.', [
        { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
      ]);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Gönderilemedi');
    }
  };
```

Replace the placeholder `{(m.format === 'pro_set_8' || m.format === '3set_klasik') && (...)}` block. Change to handle pro_set_8:

```typescript
          {m.format === 'pro_set_8' && (
            <ProSet8ScoreEntry
              matchId={matchId}
              myLetter={myLetter}
              onSubmit={onProSet8Submit}
              submitting={submit.isPending}
            />
          )}
          {m.format === '3set_klasik' && (
            <View className="flex-1 items-center justify-center">
              <View className="rounded-lg bg-yellow-50 p-4">
                <Text className="text-yellow-900">
                  3 Set Klasik skor girişi Task 12'de gelecek.
                </Text>
              </View>
            </View>
          )}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/matches/score-entry/ProSet8ScoreEntry.tsx apps/mobile/app/play/\[matchId\].tsx
git commit -m "feat(mobile): Pro Set 8 score entry"
```

---

### Task 12: 3 Set Klasik score entry

**Files:**
- Create: `apps/mobile/components/matches/score-entry/ThreeSetKlasikScoreEntry.tsx`
- Modify: `apps/mobile/app/play/[matchId].tsx`

- [ ] **Step 1: ThreeSetKlasikScoreEntry**

```typescript
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import {
  useScoreEntryStore,
  type ThreeSetKlasikDraft,
} from '../../../stores/score-entry-store';

interface Props {
  matchId: string;
  myLetter: 'a' | 'b';
  onSubmit: (draft: ThreeSetKlasikDraft, winnerTeam: 'a' | 'b' | 'void', scoreA: number, scoreB: number) => void;
  submitting: boolean;
}

interface SetInput {
  a: string;
  b: string;
}

export function ThreeSetKlasikScoreEntry({ matchId, myLetter, onSubmit, submitting }: Props) {
  const draft = useScoreEntryStore((s) => s.getThreeSetKlasik(matchId));
  const setDraft = useScoreEntryStore((s) => s.setThreeSetKlasik);

  const initialSets: SetInput[] = draft.sets.length
    ? draft.sets.map((s) => ({ a: String(s.a), b: String(s.b) }))
    : [{ a: '', b: '' }, { a: '', b: '' }];

  const [sets, setSets] = useState<SetInput[]>(initialSets);
  const [err, setErr] = useState<string>();

  const addSet = () => {
    if (sets.length < 3) setSets([...sets, { a: '', b: '' }]);
  };

  const updateSet = (i: number, key: 'a' | 'b', value: string) => {
    const next = [...sets];
    next[i] = { ...next[i], [key]: value };
    setSets(next);
    setErr(undefined);
  };

  const onSubmitTap = () => {
    const parsed: { set: number; a: number; b: number }[] = [];
    let setsA = 0;
    let setsB = 0;
    for (let i = 0; i < sets.length; i++) {
      const a = Number(sets[i].a);
      const b = Number(sets[i].b);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 7 || b > 7) {
        setErr(`${i + 1}. set skoru geçersiz`);
        return;
      }
      if (a === b) {
        setErr(`${i + 1}. sette beraberlik olamaz`);
        return;
      }
      parsed.push({ set: i + 1, a, b });
      if (a > b) setsA++;
      else setsB++;
    }
    if (setsA < 2 && setsB < 2) {
      setErr('Maç bitmemiş (kimsenin 2 seti yok)');
      return;
    }
    const winner: 'a' | 'b' = setsA >= 2 ? 'a' : 'b';
    setDraft(matchId, { sets: parsed });
    onSubmit({ sets: parsed }, winner, setsA, setsB);
  };

  return (
    <View className="flex-1 gap-3">
      <Text className="text-sm text-gray-700">Her set için sayıyı gir.</Text>
      {sets.map((s, i) => (
        <View key={i} className="rounded-lg bg-gray-50 p-3">
          <Text className="mb-2 text-sm font-medium text-gray-700">{i + 1}. Set</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label={myLetter === 'a' ? 'Sen' : 'Rakip'}
                keyboardType="number-pad"
                value={s.a}
                onChangeText={(v) => updateSet(i, 'a', v)}
              />
            </View>
            <View className="flex-1">
              <TextField
                label={myLetter === 'b' ? 'Sen' : 'Rakip'}
                keyboardType="number-pad"
                value={s.b}
                onChangeText={(v) => updateSet(i, 'b', v)}
              />
            </View>
          </View>
        </View>
      ))}
      {sets.length < 3 && (
        <Pressable onPress={addSet} className="items-center py-2">
          <Text className="text-primary">+ 3. seti ekle</Text>
        </Pressable>
      )}
      {err && <Text className="text-sm text-red-500">{err}</Text>}
      <View className="mt-auto">
        <Button onPress={onSubmitTap} loading={submitting}>Skoru gönder</Button>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Wire into play/[matchId].tsx**

Add import:

```typescript
import { ThreeSetKlasikScoreEntry } from '../../components/matches/score-entry/ThreeSetKlasikScoreEntry';
```

Add handler:

```typescript
  const onThreeSetSubmit = async (
    draft: { sets: { set: number; a: number; b: number }[] },
    winnerTeam: 'a' | 'b' | 'void',
    setsA: number,
    setsB: number,
  ) => {
    try {
      const res = await submit.mutateAsync({
        matchId,
        scoreTeamA: setsA,
        scoreTeamB: setsB,
        winnerTeam,
        sets: draft.sets,
      });
      clearDraft(matchId);
      Alert.alert(res.matched ? 'Eşleşti' : 'Gönderildi', res.matched ? 'Karşı taraftan onay bekleniyor.' : 'Rakip henüz aynı skoru girmedi.', [
        { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
      ]);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Gönderilemedi');
    }
  };
```

Replace the placeholder `{m.format === '3set_klasik' && (...)}` block with:

```typescript
          {m.format === '3set_klasik' && (
            <ThreeSetKlasikScoreEntry
              matchId={matchId}
              myLetter={myLetter}
              onSubmit={onThreeSetSubmit}
              submitting={submit.isPending}
            />
          )}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/matches/score-entry/ThreeSetKlasikScoreEntry.tsx apps/mobile/app/play/\[matchId\].tsx
git commit -m "feat(mobile): 3 Set Klasik score entry"
```

---

## Phase E — Mismatch + confirm + ELO

### Task 13: MismatchBanner + show on match detail when score_team_* set but other player still pending

**Files:**
- Create: `apps/mobile/components/matches/MismatchBanner.tsx`
- Modify: `apps/mobile/app/match/[id].tsx` (add banner check)

- [ ] **Step 1: MismatchBanner**

```typescript
import { Text, View } from 'react-native';

interface Props {
  message: string;
}

export function MismatchBanner({ message }: Props) {
  return (
    <View className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3">
      <Text className="text-sm font-medium text-red-900">⚠️ {message}</Text>
    </View>
  );
}
```

- [ ] **Step 2: Use it in match detail**

In `apps/mobile/app/match/[id].tsx`, in the active match branch (where `matchQuery.data` is rendered), add the banner right after `<Text className="text-2xl ...">`:

Before the line `<Text className="text-2xl font-bold text-gray-900">`, INSERT this code AFTER the variable declarations (after `const onDispute = ...;`):

The banner shows when: a score was submitted (`winnerSet`) but you haven't submitted (you're not in `confirmed_by` AND you should re-check that your local draft does not match the server's score).

Simpler logic for this MVP: show banner when `score_details` is set AND you're a participant who hasn't confirmed AND you've submitted at least once before. Without per-submission tracking we just show "skor uyuşmazlığı olabilir" hint if status remains awaiting_confirmation AND `winnerSet` AND not confirmed.

For Plan 4b we'll show a SIMPLE info banner instead — explicit mismatch detection is realtime which lands in Plan 7. Add inside the wrapper:

```typescript
            {m.status === 'awaiting_confirmation' && winnerSet && !myConfirmed && (
              <MismatchBanner message="Skor girildi. Aynı skoru sen de girdiysen onaylayabilirsin; uyuşmazlık varsa skoru tekrar gir." />
            )}
```

Add import at top of file:

```typescript
import { MismatchBanner } from '../../components/matches/MismatchBanner';
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/matches/MismatchBanner.tsx apps/mobile/app/match/\[id\].tsx
git commit -m "feat(mobile): MismatchBanner on active match detail"
```

---

### Task 14: useConfirmMatch mutation + Confirm screen

**Files:**
- Create: `apps/mobile/hooks/use-confirm-match.ts`
- Create: `apps/mobile/app/play/confirm/[matchId].tsx`

- [ ] **Step 1: useConfirmMatch hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface ConfirmMatchResponse {
  confirmed: boolean;
  status?: string;
  alreadyConfirmed?: boolean;
}

export function useConfirmMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<ConfirmMatchResponse>('confirm-match', input, token);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.detail(variables.matchId) });
      qc.invalidateQueries({ queryKey: queryKeys.matchHistory.all });
    },
  });
}
```

- [ ] **Step 2: Confirm screen**

```typescript
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { useConfirmMatch } from '../../../hooks/use-confirm-match';
import { useMatchDetail } from '../../../hooks/use-match-detail';
import { useAuthStore } from '../../../stores/auth-store';

const FORMAT_LABELS: Record<string, string> = {
  bu_klasik: 'BÜ Klasik', hizli_tiebreak: 'Hızlı Tiebreak',
  pro_set_8: 'Pro Set 8', '3set_klasik': '3 Set Klasik',
};

export default function ConfirmMatchScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { data: m, isLoading } = useMatchDetail(matchId);
  const userId = useAuthStore((s) => s.user?.id);
  const confirm = useConfirmMatch();

  if (isLoading || !m || !matchId || !userId) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1e3a8a" />
        </View>
      </ScreenContainer>
    );
  }

  const onTeamA = m.team_a_player_ids.includes(userId);
  const myScore = onTeamA ? m.score_team_a : m.score_team_b;
  const oppScore = onTeamA ? m.score_team_b : m.score_team_a;
  const iWon = (onTeamA && m.winner_team === 'a') || (!onTeamA && m.winner_team === 'b');
  const voided = m.winner_team === 'void';

  const onConfirm = async () => {
    try {
      const res = await confirm.mutateAsync({ matchId });
      if (res.confirmed) {
        Alert.alert('Maç onaylandı', res.status === 'confirmed' ? 'ELO güncellendi.' : 'Maç voided sayıldı.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      } else if (res.alreadyConfirmed) {
        Alert.alert('Zaten onaylamıştın', 'Karşı tarafın onayı bekleniyor.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      } else {
        Alert.alert('Onayın kaydedildi', 'Karşı tarafın onayı bekleniyor.', [
          { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
        ]);
      }
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Onaylanamadı');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Onayla', headerShown: true }} />
      <ScreenContainer>
        <View className="flex-1 gap-4">
          <View className="rounded-lg bg-gray-100 p-4">
            <Text className="mb-2 text-center text-sm text-gray-600">
              {FORMAT_LABELS[m.format] ?? m.format}
            </Text>
            <View className="items-center">
              {voided ? (
                <Text className="text-2xl font-bold text-gray-700">⚠️ Maç yapılmamış sayıldı (3-3)</Text>
              ) : (
                <>
                  <Text className="mb-1 text-base text-gray-600">{iWon ? 'Kazandın 🏆' : 'Kaybettin'}</Text>
                  <Text className="text-5xl font-bold text-gray-900">
                    {myScore} - {oppScore}
                  </Text>
                </>
              )}
            </View>
          </View>

          {m.is_rated && !voided && (
            <View className="rounded-lg bg-blue-50 p-3">
              <Text className="text-sm text-blue-900">
                Bu sıralama maçı. Onayladığında ELO puanın güncellenecek.
              </Text>
            </View>
          )}

          <View className="mt-auto">
            <Button onPress={onConfirm} loading={confirm.isPending}>
              Skoru onayla
            </Button>
          </View>
        </View>
      </ScreenContainer>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
mkdir -p /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile/app/play/confirm
git add apps/mobile/hooks/use-confirm-match.ts apps/mobile/app/play/confirm/
git commit -m "feat(mobile): confirm-match screen + mutation"
```

---

### Task 15: EloDeltaDisplay on confirmed match detail

**Files:**
- Create: `apps/mobile/components/matches/EloDeltaDisplay.tsx`
- Modify: `apps/mobile/app/match/[id].tsx` (add ELO section when confirmed)

- [ ] **Step 1: EloDeltaDisplay component**

```typescript
import { Text, View } from 'react-native';

interface Props {
  before: number;
  after: number;
  myLetter: 'a' | 'b';
}

export function EloDeltaDisplay({ before, after }: Props) {
  const delta = after - before;
  const sign = delta > 0 ? '+' : '';
  const color = delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-gray-700';
  return (
    <View className="rounded-lg border border-gray-200 bg-white p-4">
      <Text className="mb-2 text-sm text-gray-500">ELO değişimi</Text>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs text-gray-500">Önce</Text>
          <Text className="text-2xl font-semibold text-gray-900">{before}</Text>
        </View>
        <Text className={`text-2xl font-bold ${color}`}>{sign}{delta}</Text>
        <View>
          <Text className="text-xs text-gray-500">Sonra</Text>
          <Text className="text-2xl font-semibold text-gray-900">{after}</Text>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Show in match detail when confirmed AND rated**

In `apps/mobile/app/match/[id].tsx`, in the active-match branch, ADD just before the closing `</View>` of `<View className="gap-3">`:

```typescript
            {m.status === 'confirmed' && m.is_rated && m.rating_before_team_a !== null && m.rating_after_team_a !== null && (
              <EloDeltaDisplay
                before={onTeamA ? m.rating_before_team_a : (m.rating_before_team_b ?? m.rating_before_team_a)}
                after={onTeamA ? m.rating_after_team_a : (m.rating_after_team_b ?? m.rating_after_team_a)}
                myLetter={myLetter}
              />
            )}
```

Add `myLetter` declaration where it's accessible — it's already declared inside the active-match block (we use it for myScore). Make sure `myLetter` is computed; if not, add:

```typescript
    const myLetter: 'a' | 'b' = onTeamA ? 'a' : 'b';
```

Right after the `onTeamA` declaration.

Add import:

```typescript
import { EloDeltaDisplay } from '../../components/matches/EloDeltaDisplay';
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/matches/EloDeltaDisplay.tsx apps/mobile/app/match/\[id\].tsx
git commit -m "feat(mobile): EloDeltaDisplay on confirmed match detail"
```

---

## Phase F — Dispute

### Task 16: useRaiseDispute mutation

**Files:**
- Create: `apps/mobile/hooks/use-raise-dispute.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface RaiseDisputeResponse {
  disputeId: string;
  status: string;
}

export function useRaiseDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; reason: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<RaiseDisputeResponse>('raise-dispute', input, token);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.detail(variables.matchId) });
    },
  });
}
```

- [ ] Commit:

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-raise-dispute.ts
git commit -m "feat(mobile): add useRaiseDispute mutation"
```

---

### Task 17: Dispute form screen

**Files:**
- Create: `apps/mobile/app/dispute/[matchId].tsx`

```typescript
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { useRaiseDispute } from '../../hooks/use-raise-dispute';

export default function DisputeScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string>();
  const raise = useRaiseDispute();

  const onSubmit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setErr('Lütfen kısa bir açıklama gir (en az 5 karakter)');
      return;
    }
    if (trimmed.length > 500) {
      setErr('Açıklama 500 karakteri aşmamalı');
      return;
    }
    if (!matchId) return;
    try {
      await raise.mutateAsync({ matchId, reason: trimmed });
      Alert.alert('İtiraz açıldı', 'Admin karar verene kadar maç beklemede.', [
        { text: 'Tamam', onPress: () => router.replace(`/match/${matchId}`) },
      ]);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'İtiraz açılamadı');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'İtiraz et', headerShown: true }} />
      <ScreenContainer scrollable>
        <View className="flex-1 gap-4">
          <View className="rounded-lg bg-yellow-50 p-3">
            <Text className="text-sm text-yellow-900">
              İtirazını kısaca açıkla. Admin maçı inceler ve karar verir. Bu işlem geri alınamaz.
            </Text>
          </View>
          <TextField
            label="Açıklama (5-500 karakter)"
            placeholder="Örn: Bob girdiği skor yanlış, ben 4-2 kazandım ama o 4-1 girmiş..."
            multiline
            numberOfLines={5}
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            value={reason}
            onChangeText={(v) => { setReason(v); setErr(undefined); }}
            error={err}
          />
          <View className="mt-auto">
            <Button onPress={onSubmit} loading={raise.isPending}>İtirazı gönder</Button>
          </View>
        </View>
      </ScreenContainer>
    </>
  );
}
```

- [ ] Commit:

```bash
mkdir -p /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile/app/dispute
git add apps/mobile/app/dispute/
git commit -m "feat(mobile): dispute form screen"
```

---

## Phase G — Match history

### Task 18: useMatchHistory query

**Files:**
- Create: `apps/mobile/hooks/use-match-history.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import type { ActiveMatchRow } from './use-active-matches';

export function useMyMatchHistory() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<ActiveMatchRow[]>({
    queryKey: queryKeys.matchHistory.mine(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, match_request_id, category, format, is_rated, played_at, status,
          team_a_player_ids, team_b_player_ids,
          score_team_a, score_team_b, winner_team, score_details, confirmed_by,
          rating_before_team_a, rating_after_team_a,
          rating_before_team_b, rating_after_team_b,
          created_at,
          court:courts(name)
        `)
        .in('status', ['confirmed', 'voided'])
        .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`)
        .order('played_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ActiveMatchRow[];
    },
    enabled: !!userId,
  });
}
```

- [ ] Commit:

```bash
git add apps/mobile/hooks/use-match-history.ts
git commit -m "feat(mobile): add useMyMatchHistory query"
```

---

### Task 19: Match history section on Profile screen

**Files:**
- Modify: `apps/mobile/app/(app)/profile.tsx`

Add a "Geçmiş Maçlar" section at the bottom.

- [ ] **Step 1: Update profile.tsx**

In `apps/mobile/app/(app)/profile.tsx`, add the imports:

```typescript
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useMyMatchHistory } from '../../hooks/use-match-history';
import type { ActiveMatchRow } from '../../hooks/use-active-matches';
import { useAuthStore } from '../../stores/auth-store';
```

(Some of these may already be imported — keep just one of each.)

Add after the closing `</View>` of the last existing info Row section but BEFORE the final closing `</ScreenContainer>`:

```typescript
      <MatchHistorySection />
```

Add the new component function at the bottom of the file (after the existing helper functions):

```typescript
function MatchHistorySection() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: matches } = useMyMatchHistory();
  const list = matches ?? [];

  if (!userId) return null;

  return (
    <View className="mt-8">
      <Text className="mb-2 text-lg font-semibold text-gray-900">Geçmiş Maçlar</Text>
      {list.length === 0 ? (
        <Text className="text-sm text-gray-500">Henüz oynanmış maç yok.</Text>
      ) : (
        list.slice(0, 20).map((m) => <HistoryRow key={m.id} match={m} myUserId={userId} />)
      )}
    </View>
  );
}

function HistoryRow({ match, myUserId }: { match: ActiveMatchRow; myUserId: string }) {
  const onTeamA = match.team_a_player_ids.includes(myUserId);
  const my = onTeamA ? match.score_team_a : match.score_team_b;
  const opp = onTeamA ? match.score_team_b : match.score_team_a;
  const iWon = (onTeamA && match.winner_team === 'a') || (!onTeamA && match.winner_team === 'b');
  const voided = match.winner_team === 'void';
  const ratingBefore = onTeamA ? match.rating_before_team_a : match.rating_before_team_b;
  const ratingAfter = onTeamA ? match.rating_after_team_a : match.rating_after_team_b;
  const delta = ratingBefore !== null && ratingAfter !== null ? ratingAfter - ratingBefore : null;
  const playedAt = new Date(match.played_at).toLocaleDateString('tr-TR');

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      className="mb-2 rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-600">{playedAt}</Text>
        <Text className={`text-sm font-semibold ${voided ? 'text-gray-700' : iWon ? 'text-green-700' : 'text-red-700'}`}>
          {voided ? '⚠️ Voided' : iWon ? '🏆 Kazandın' : 'Kaybettin'}
        </Text>
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-base text-gray-900">
          {voided ? '— — —' : `${my} - ${opp}`}
        </Text>
        {delta !== null && match.is_rated && (
          <Text className={delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-gray-700'}>
            {delta > 0 ? '+' : ''}{delta} ELO
          </Text>
        )}
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add 'apps/mobile/app/(app)/profile.tsx'
git commit -m "feat(mobile): match history section on Profile"
```

---

## Phase H — Verification

### Task 20: End-to-end manual verification in iOS Simulator

This task is verification only.

- [ ] **Step 1: Start backend stack**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase functions serve --no-verify-jwt &
```

- [ ] **Step 2: Update .env.local with current Supabase keys**

```bash
KEYS=$(supabase status --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321'); print(f'EXPO_PUBLIC_SUPABASE_ANON_KEY={d[\"ANON_KEY\"]}')")
echo "$KEYS" > /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile/.env.local
```

- [ ] **Step 3: Start Expo + open in Simulator**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bunx expo start --host lan &
sleep 25
IP=$(ifconfig en0 | grep "inet " | awk '{print $2}' | head -1)
open -a /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app
xcrun simctl openurl booted "exp://$IP:8081"
```

- [ ] **Step 4: Manual verification (assumes Plan 4a flow already gave Alice + Bob a match in awaiting_confirmation)**

If no awaiting_confirmation match exists, repeat Plan 4a's create+accept flow first.

As Alice:
1. ✅ Maçlar → Aktif tab shows the match
2. ✅ Tap card → detail screen, status "Onay bekliyor", "Maça başla / Skor gir" button
3. ✅ Tap button → format rules modal appears, read, "Anladım, başla"
4. ✅ BÜ Klasik el-by-el entry — tap "Ben" / "Rakip" for each el
5. ✅ Submit at 4 els → returns to detail, "skor uyuşmazlığı olabilir" hint if Bob hasn't submitted

As Bob (sign out + in):
6. ✅ Aktif tab shows same match
7. ✅ Same flow, submit matching score
8. ✅ Both submissions match → detail shows "Skoru onayla" button on each side

As Alice + Bob (each individually):
9. ✅ Tap "Skoru onayla" → confirm screen with score recap
10. ✅ Tap "Skoru onayla" → success
11. ✅ When BOTH confirmed, detail shows ELO change (rated match)
12. ✅ Profile → "Geçmiş Maçlar" shows the match with W/L + ELO delta

Dispute flow:
13. ✅ Repeat with new match, after score submission tap "İtiraz et"
14. ✅ Enter reason → submit → match goes to disputed status
15. ✅ Detail shows "⚠️ Bu maç itiraz altında" banner

Verify backend:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select status, count(*) from public.matches group by status;"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select profile_id, category, rating, matches_played from public.elo_ratings;"
```

Expected: At least one `confirmed` match exists, ELO ratings != 1200 for participants, matches_played >= 1.

- [ ] **Step 5: Stop services + verification marker commit**

```bash
pkill -f "expo start" || true
pkill -f "supabase functions serve" || true
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase stop
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git commit --allow-empty -m "test(mobile): verified Plan 4b end-to-end in iOS Simulator"
```

---

## Plan 4b Sonu

Bu plan tamamlandığında:

- **Aktif maçlar tab'i** Maçlar ekranında — awaiting_confirmation / disputed maçlar görünür
- **Maç detay ekranı** match request + active match için tek bileşen — status'a göre branch
- **Format kuralları modal'ı** her formatta zorunlu okuma
- **4 format için skor giriş ekranı** — BÜ Klasik el-by-el, Hızlı Tiebreak point input, Pro Set 8 game + tiebreak input, 3 Set Klasik per-set input
- **Skor gönderim** Plan 2 `submit-match-score` Edge Function'a — mismatch detection backend tarafında
- **Onay ekranı** ayrı route + ELO delta display sonrasında
- **İtiraz formu** kısa açıklama ile
- **Maç geçmişi** profilde — W/L + ELO delta listesi (chart Plan 5'te)

**Bilinen sınırlamalar (sonraki planlara):**
- Realtime mismatch detection — Plan 7 (push integration)
- Maç sonrası badge bildirimleri — Plan 5
- ELO geçmişi line chart — Plan 5
- Doubles UI (4 oyuncu için skor entry) — Plan 8

**Sonraki plan: Plan 5 — Profile + Gamification.** Rozet sistemi, ELO history chart, leaderboard.
