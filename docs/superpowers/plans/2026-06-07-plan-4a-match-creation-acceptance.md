# Plan 4a: Match Creation + Acceptance Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the mobile UI for the full match-request lifecycle except the score/confirm half. After Plan 4a, a user can: see their incoming + outgoing match requests, browse other players, create a direct challenge with a chosen rakip, create an open call, browse the open calls feed and apply, and (as creator) accept/reject a direct challenge or select one applicant from open call applications. End-to-end verifiable in iOS Simulator against the local Plan 2 backend.

**Architecture:** Expo Router file-based routes under `app/(app)/` for the tab content and modal-style sub-routes for create/detail flows. TanStack Query for all reads (queries) + writes (mutations) — backend Edge Functions from Plan 2 are the only write surface. Zustand untouched (auth-store + onboarding-store stay). Forms continue using react-hook-form + zod with schemas mirroring Edge Function inputs. UI placeholder NativeWind classes (functional only; full design + UX polish — animations, haptics, share screens — lands in Plan 8). 4 bottom tabs: Maçlar (inbox), İlanlar (open calls feed), Profil, Ayarlar. Floating Action Button on Maçlar tab opens "create match" modal.

**Tech Stack:** Expo Router 4, TanStack Query v5, react-hook-form 7, zod 3, NativeWind 4, Supabase JS client (`packages/shared` schemas reused where applicable), bun:test for unit tests.

**Spec reference:** `docs/superpowers/specs/2026-06-06-tennis-challenger-design.md` sections 4.1 (maç oluşturma yolları), 4.2 (kabul/red akışı), 4.3 (limitler — 3 pending rated, dostluk muaf), section 6 (gamification — only badge display deferred to Plan 5).

**Plan dependencies:** Plan 3 (mobile skeleton + auth + onboarding), Plan 2 (5 Edge Functions: create-match-request, accept-match-request, reject-match-request, apply-to-open-call, select-open-call-application — all live).

**Plan 4a NOT in scope:**
- Score submission UI + confirm + ELO change display — **Plan 4b**
- Match history / past matches list — **Plan 4b** (or Plan 5)
- Dispute UI — **Plan 4b**
- Badge granting / display — **Plan 5**
- Realtime live updates (e.g. instant notification of new request) — **Plan 7** (push integration)
- UI polish + animations + haptic feedback + share screens — **Plan 8**
- Doubles partner selection UI — basic singles-only flow; doubles partner field stubbed in form

**Known limitations (documented in code comments, fixed in later plans):**
- Same-status race conditions (covered in Plan 8 hardening)
- "Cannot challenge yourself" already enforced server-side (Plan 2 fix), UI doesn't pre-filter — error surfaces if you try
- No keyboard avoiding view yet — screens use ScrollView so usable but not polished

---

## Dosya Yapısı

```
apps/mobile/
├── app/
│   ├── (app)/
│   │   ├── _layout.tsx               # MODIFY: 4 tabs (Maçlar, İlanlar, Profil, Ayarlar)
│   │   ├── home.tsx                  # REPLACE: redirects to /(app)/matches
│   │   ├── matches.tsx               # NEW: inbox tab — Gelen / Atılan inner tabs
│   │   ├── open-calls.tsx            # NEW: open calls feed tab
│   │   ├── profile.tsx               # unchanged
│   │   └── settings.tsx              # unchanged
│   ├── create-match.tsx              # NEW: modal-style create flow
│   ├── match/
│   │   └── [id].tsx                  # NEW: match request detail
│   └── applications/
│       └── [requestId].tsx           # NEW: applications list (creators view)
├── components/
│   └── matches/
│       ├── RequestCard.tsx           # NEW: list row component
│       ├── StatusBadge.tsx           # NEW: pending/accepted/rejected/expired badge
│       ├── PlayerPicker.tsx          # NEW: searchable player list
│       ├── FormatPicker.tsx          # NEW: 4 format radio with descriptions
│       ├── CourtPicker.tsx           # NEW: 3 court radio
│       ├── DateTimePicker.tsx        # NEW: date + time wrapper (uses RN DateTimePicker)
│       └── EmptyState.tsx            # NEW: empty list placeholder
├── hooks/
│   ├── use-match-requests.ts         # NEW: queries — incoming, outgoing
│   ├── use-open-calls.ts             # NEW: query — open calls feed
│   ├── use-applications.ts           # NEW: queries — my apps, apps for a request
│   ├── use-players.ts                # NEW: query — browse players for picker
│   ├── use-courts.ts                 # NEW: query — 3 courts (cached)
│   ├── use-create-match-request.ts   # NEW: mutation
│   ├── use-accept-match-request.ts   # NEW: mutation
│   ├── use-reject-match-request.ts   # NEW: mutation
│   ├── use-apply-to-open-call.ts     # NEW: mutation
│   └── use-select-application.ts     # NEW: mutation
└── lib/
    └── invoke-function.ts            # NEW: typed Edge Function caller (replaces inline fetch in settings.tsx etc.)
```

**Phase outline:**
- **Phase A — Backend integration helpers (Tasks 1-3):** typed function invoker, base query keys, error handling
- **Phase B — Inbox + tabs (Tasks 4-8):** queries, list screen with 2 inner tabs, status badges, empty states, 4-tab navigation update
- **Phase C — Player picker + create direct challenge (Tasks 9-13):** players query, picker UI, create form (rakip, format, court, date, time), submit flow
- **Phase D — Open call flow (Tasks 14-17):** open calls query + feed screen, "create open call" toggle in form, apply mutation + UI
- **Phase E — Detail + accept/reject (Tasks 18-19):** match request detail screen, accept/reject mutations + buttons
- **Phase F — Applications management (Tasks 20-21):** applications list + select mutation + flow

---

## Phase A — Backend integration helpers

### Task 1: Typed Edge Function invoker

**Files:**
- Create: `apps/mobile/lib/invoke-function.ts`
- Create: `apps/mobile/tests/lib/invoke-function.test.ts`
- Modify: `apps/mobile/app/(app)/settings.tsx` (use new helper instead of inline fetch)

This consolidates the inline fetch pattern used in `settings.tsx` (Plan 3 Task 24) into a reusable helper.

- [ ] **Step 1: Write failing test**

Create `apps/mobile/tests/lib/invoke-function.test.ts`:

```typescript
import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { EdgeFunctionError } from '../../lib/invoke-function';

describe('invoke-function', () => {
  test('EdgeFunctionError carries status and parsed error body', () => {
    const e = new EdgeFunctionError('Conflict', 409, { detail: 'limit reached' });
    expect(e.status).toBe(409);
    expect(e.message).toBe('Conflict');
    expect(e.details).toEqual({ detail: 'limit reached' });
  });

  test('invokeFunction throws on non-2xx', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key-aaaaaaaaaaaaaaaaaaaaa';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => new Response(
      JSON.stringify({ error: { message: 'Forbidden' } }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )) as unknown as typeof fetch;

    const { invokeFunction } = await import('../../lib/invoke-function');
    let caught: unknown;
    try {
      await invokeFunction('test-fn', { foo: 'bar' }, 'fake-token');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(EdgeFunctionError);
    expect((caught as EdgeFunctionError).status).toBe(403);
    expect((caught as EdgeFunctionError).message).toBe('Forbidden');

    globalThis.fetch = originalFetch;
  });

  test('invokeFunction returns parsed JSON on 2xx', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key-aaaaaaaaaaaaaaaaaaaaa';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => new Response(
      JSON.stringify({ id: 'req-1', status: 'pending' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as unknown as typeof fetch;

    const { invokeFunction } = await import('../../lib/invoke-function');
    const result = await invokeFunction<{ id: string; status: string }>('test-fn', {}, 'token');
    expect(result.id).toBe('req-1');
    expect(result.status).toBe('pending');

    globalThis.fetch = originalFetch;
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
/Users/hazarustun/.bun/bin/bun test tests/lib/invoke-function.test.ts 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create invoke-function.ts**

```typescript
import { env } from './env';

export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

export async function invokeFunction<TResponse = unknown>(
  name: string,
  body: unknown,
  accessToken: string,
): Promise<TResponse> {
  const res = await fetch(`${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get('content-type') ?? '';
  const parsed = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text();

  if (!res.ok) {
    const errorMsg = typeof parsed === 'object' && parsed && 'error' in parsed
      ? (parsed as { error: { message: string } }).error?.message ?? 'Request failed'
      : `Request failed: ${res.status}`;
    const details = typeof parsed === 'object' && parsed && 'error' in parsed
      ? (parsed as { error: unknown }).error
      : parsed;
    throw new EdgeFunctionError(errorMsg, res.status, details);
  }

  return parsed as TResponse;
}
```

- [ ] **Step 4: Run test, verify PASS**

```bash
/Users/hazarustun/.bun/bin/bun test tests/lib/invoke-function.test.ts 2>&1 | tail -5
```

Expected: 3 pass.

- [ ] **Step 5: Refactor settings.tsx to use it**

In `apps/mobile/app/(app)/settings.tsx`, find the `doDelete` function:

```typescript
  const doDelete = async () => {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/anonymize-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error?.message ?? 'Silme başarısız');
      }
      await supabase.auth.signOut();
      signOutStore();
      router.replace('/(auth)/sign-in');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi');
    }
  };
```

Replace with:

```typescript
  const doDelete = async () => {
    if (!session?.access_token) {
      Alert.alert('Hata', 'Oturum bulunamadı');
      return;
    }
    try {
      await invokeFunction('anonymize-account', {}, session.access_token);
      await supabase.auth.signOut();
      signOutStore();
      router.replace('/(auth)/sign-in');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi');
    }
  };
```

Add import at top of `settings.tsx`:

```typescript
import { invokeFunction } from '../../lib/invoke-function';
```

- [ ] **Step 6: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/lib/invoke-function.ts apps/mobile/tests/lib/invoke-function.test.ts 'apps/mobile/app/(app)/settings.tsx'
git commit -m "feat(mobile): add typed Edge Function invoker, refactor settings"
```

---

### Task 2: Shared query keys + cache invalidation pattern

**Files:**
- Create: `apps/mobile/lib/query-keys.ts`

This centralizes query key definitions so mutations can invalidate consistently.

- [ ] **Step 1: Create query-keys.ts**

```typescript
export const queryKeys = {
  matchRequests: {
    all: ['match-requests'] as const,
    incoming: () => [...queryKeys.matchRequests.all, 'incoming'] as const,
    outgoing: () => [...queryKeys.matchRequests.all, 'outgoing'] as const,
    detail: (id: string) => [...queryKeys.matchRequests.all, 'detail', id] as const,
  },
  openCalls: {
    all: ['open-calls'] as const,
    feed: () => [...queryKeys.openCalls.all, 'feed'] as const,
    detail: (id: string) => [...queryKeys.openCalls.all, 'detail', id] as const,
  },
  applications: {
    all: ['applications'] as const,
    forRequest: (requestId: string) => [...queryKeys.applications.all, 'request', requestId] as const,
    mine: () => [...queryKeys.applications.all, 'mine'] as const,
  },
  players: {
    all: ['players'] as const,
    list: (filters?: { gender?: string }) => [...queryKeys.players.all, 'list', filters] as const,
  },
  courts: ['courts'] as const,
  departments: ['departments'] as const,
  profile: (userId: string) => ['profile', userId] as const,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/query-keys.ts
git commit -m "feat(mobile): centralize TanStack Query keys"
```

---

### Task 3: useCourts hook (cached list)

**Files:**
- Create: `apps/mobile/hooks/use-courts.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface Court {
  id: string;
  name: string;
  display_order: number;
}

export function useCourts() {
  return useQuery<Court[]>({
    queryKey: queryKeys.courts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courts')
        .select('id, name, display_order')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24h — courts rarely change
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/use-courts.ts
git commit -m "feat(mobile): add useCourts hook"
```

---

## Phase B — Inbox + tabs

### Task 4: Match request queries (incoming + outgoing)

**Files:**
- Create: `apps/mobile/hooks/use-match-requests.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'completed';
export type RequestType = 'direct_challenge' | 'open_call';

export interface MatchRequestRow {
  id: string;
  creator_id: string;
  target_id: string | null;
  type: RequestType;
  category: string;
  format: string;
  is_rated: boolean;
  proposed_date: string;
  proposed_time: string;
  court_id: string;
  status: RequestStatus;
  expires_at: string;
  created_at: string;
  creator_profile?: { first_name: string; last_name: string; avatar_url: string | null } | null;
  target_profile?: { first_name: string; last_name: string; avatar_url: string | null } | null;
  court?: { name: string } | null;
}

function selectQuery() {
  return supabase.from('match_requests').select(`
    id, creator_id, target_id, type, category, format, is_rated,
    proposed_date, proposed_time, court_id, status, expires_at, created_at,
    creator_profile:profiles!match_requests_creator_id_fkey(first_name, last_name, avatar_url),
    target_profile:profiles!match_requests_target_id_fkey(first_name, last_name, avatar_url),
    court:courts(name)
  `);
}

export function useIncomingMatchRequests() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<MatchRequestRow[]>({
    queryKey: queryKeys.matchRequests.incoming(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await selectQuery()
        .eq('target_id', userId)
        .eq('type', 'direct_challenge')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MatchRequestRow[];
    },
    enabled: !!userId,
  });
}

export function useOutgoingMatchRequests() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<MatchRequestRow[]>({
    queryKey: queryKeys.matchRequests.outgoing(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await selectQuery()
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MatchRequestRow[];
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/use-match-requests.ts
git commit -m "feat(mobile): add useMatchRequests queries (incoming + outgoing)"
```

---

### Task 5: StatusBadge + RequestCard + EmptyState components

**Files:**
- Create: `apps/mobile/components/matches/StatusBadge.tsx`
- Create: `apps/mobile/components/matches/RequestCard.tsx`
- Create: `apps/mobile/components/matches/EmptyState.tsx`

- [ ] **Step 1: StatusBadge.tsx**

```typescript
import { Text, View } from 'react-native';
import type { RequestStatus } from '../../hooks/use-match-requests';

const COLORS: Record<RequestStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Bekliyor' },
  accepted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Kabul edildi' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Reddedildi' },
  expired: { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Süresi doldu' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Tamamlandı' },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const c = COLORS[status];
  return (
    <View className={`${c.bg} self-start rounded-full px-2 py-0.5`}>
      <Text className={`${c.text} text-xs font-medium`}>{c.label}</Text>
    </View>
  );
}
```

- [ ] **Step 2: RequestCard.tsx**

```typescript
import { Pressable, Text, View } from 'react-native';
import type { MatchRequestRow } from '../../hooks/use-match-requests';
import { StatusBadge } from './StatusBadge';

interface Props {
  request: MatchRequestRow;
  myUserId: string;
  onPress: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  bu_klasik: 'Klasik',
  hizli_tiebreak: 'Hızlı Tiebreak',
  pro_set_8: 'Pro Set 8',
  '3set_klasik': '3 Set Klasik',
};

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export function RequestCard({ request, myUserId, onPress }: Props) {
  const isOutgoing = request.creator_id === myUserId;
  const counterpart = isOutgoing ? request.target_profile : request.creator_profile;
  const counterpartName = counterpart
    ? `${counterpart.first_name} ${counterpart.last_name}`
    : request.type === 'open_call'
      ? 'Açık ilan'
      : 'Bilinmiyor';

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50"
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900">{counterpartName}</Text>
        <StatusBadge status={request.status} />
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Text className="text-sm text-gray-600">
          {CATEGORY_LABELS[request.category] ?? request.category}
        </Text>
        <Text className="text-sm text-gray-400">•</Text>
        <Text className="text-sm text-gray-600">
          {FORMAT_LABELS[request.format] ?? request.format}
        </Text>
        <Text className="text-sm text-gray-400">•</Text>
        <Text className="text-sm text-gray-600">
          {request.is_rated ? '🏆 Sıralama' : '🤝 Dostluk'}
        </Text>
      </View>
      <Text className="mt-1 text-sm text-gray-500">
        {request.proposed_date} · {request.proposed_time.slice(0, 5)} · {request.court?.name ?? '—'}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 3: EmptyState.tsx**

```typescript
import { Text, View } from 'react-native';

interface Props {
  title: string;
  message: string;
  icon?: string;
}

export function EmptyState({ title, message, icon = '🎾' }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="mb-4 text-5xl">{icon}</Text>
      <Text className="mb-2 text-center text-lg font-semibold text-gray-900">{title}</Text>
      <Text className="text-center text-base text-gray-600">{message}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/matches/
git commit -m "feat(mobile): add RequestCard, StatusBadge, EmptyState components"
```

---

### Task 6: Matches tab — inbox screen with inner tabs

**Files:**
- Create: `apps/mobile/app/(app)/matches.tsx`

- [ ] **Step 1: Create matches.tsx**

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { EmptyState } from '../../components/matches/EmptyState';
import { RequestCard } from '../../components/matches/RequestCard';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import {
  useIncomingMatchRequests,
  useOutgoingMatchRequests,
  type MatchRequestRow,
} from '../../hooks/use-match-requests';
import { useAuthStore } from '../../stores/auth-store';

type Tab = 'incoming' | 'outgoing';

export default function MatchesScreen() {
  const myUserId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<Tab>('incoming');

  const incoming = useIncomingMatchRequests();
  const outgoing = useOutgoingMatchRequests();
  const active = tab === 'incoming' ? incoming : outgoing;

  const data: MatchRequestRow[] = active.data ?? [];

  return (
    <ScreenContainer>
      {/* Inner tabs */}
      <View className="mb-3 flex-row border-b border-gray-200">
        <Pressable
          onPress={() => setTab('incoming')}
          className={`flex-1 items-center py-3 ${tab === 'incoming' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={tab === 'incoming' ? 'font-semibold text-primary' : 'text-gray-600'}>
            Gelen ({incoming.data?.filter((r) => r.status === 'pending').length ?? 0})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('outgoing')}
          className={`flex-1 items-center py-3 ${tab === 'outgoing' ? 'border-b-2 border-primary' : ''}`}
        >
          <Text className={tab === 'outgoing' ? 'font-semibold text-primary' : 'text-gray-600'}>
            Atılan ({outgoing.data?.filter((r) => r.status === 'pending').length ?? 0})
          </Text>
        </Pressable>
      </View>

      {/* List */}
      {myUserId ? (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              myUserId={myUserId}
              onPress={() => router.push(`/match/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={active.isRefetching}
              onRefresh={() => active.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={tab === 'incoming' ? 'Gelen teklif yok' : 'Atılan teklif yok'}
              message={
                tab === 'incoming'
                  ? 'Birisi sana meydan okuduğunda burada görünecek.'
                  : 'Maç oluşturmak için sağ alttaki + butonuna bas.'
              }
            />
          }
        />
      ) : null}

      {/* FAB */}
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
git commit -m "feat(mobile): matches inbox screen with Gelen/Atılan tabs + FAB"
```

---

### Task 7: Update tab layout — 4 tabs (matches becomes first)

**Files:**
- Modify: `apps/mobile/app/(app)/_layout.tsx`
- Modify: `apps/mobile/app/(app)/home.tsx` (becomes redirect)

- [ ] **Step 1: Update _layout.tsx**

```typescript
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1e3a8a' }}>
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Maçlar',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎾</Text>,
        }}
      />
      <Tabs.Screen
        name="open-calls"
        options={{
          title: 'İlanlar',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📢</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>,
        }}
      />
      <Tabs.Screen name="home" options={{ href: null }} />
    </Tabs>
  );
}
```

The `href: null` keeps `home.tsx` as a valid file but hides it from the tab bar.

- [ ] **Step 2: Update home.tsx to redirect**

```typescript
import { Redirect } from 'expo-router';

export default function HomeRedirect() {
  return <Redirect href="/(app)/matches" />;
}
```

- [ ] **Step 3: Commit**

```bash
git add 'apps/mobile/app/(app)/_layout.tsx' 'apps/mobile/app/(app)/home.tsx'
git commit -m "feat(mobile): switch to 4 tabs — Maçlar, İlanlar, Profil, Ayarlar"
```

---

### Task 8: Placeholder open-calls tab

**Files:**
- Create: `apps/mobile/app/(app)/open-calls.tsx`

Placeholder for now — implemented properly in Task 15.

- [ ] **Step 1: Create stub**

```typescript
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { EmptyState } from '../../components/matches/EmptyState';

export default function OpenCallsScreen() {
  return (
    <ScreenContainer>
      <EmptyState
        title="Açık ilan akışı"
        message="Yakında — Task 15'te eklenecek."
        icon="📢"
      />
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add 'apps/mobile/app/(app)/open-calls.tsx'
git commit -m "feat(mobile): open-calls tab placeholder"
```

---

## Phase C — Player picker + create direct challenge

### Task 9: usePlayers hook

**Files:**
- Create: `apps/mobile/hooks/use-players.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface PlayerRow {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  gender_category: 'erkek' | 'kadin' | 'open_only';
  status: string;
}

export function usePlayers(opts?: { gender?: 'erkek' | 'kadin' | 'open_only' }) {
  const myUserId = useAuthStore((s) => s.user?.id);
  return useQuery<PlayerRow[]>({
    queryKey: queryKeys.players.list(opts),
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url, gender_category, status')
        .eq('role', 'player')
        .neq('status', 'anonymized')
        .order('first_name');
      if (opts?.gender) q = q.eq('gender_category', opts.gender);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).filter((p) => p.user_id !== myUserId) as PlayerRow[];
    },
    enabled: !!myUserId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/use-players.ts
git commit -m "feat(mobile): add usePlayers hook (excludes self + anonymized)"
```

---

### Task 10: PlayerPicker component (searchable list)

**Files:**
- Create: `apps/mobile/components/matches/PlayerPicker.tsx`

- [ ] **Step 1: Create component**

```typescript
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { TextField } from '../ui/TextField';
import { type PlayerRow, usePlayers } from '../../hooks/use-players';

interface Props {
  selectedId: string | undefined;
  onSelect: (player: PlayerRow) => void;
  genderFilter?: 'erkek' | 'kadin' | 'open_only';
}

export function PlayerPicker({ selectedId, onSelect, genderFilter }: Props) {
  const { data: players, isLoading } = usePlayers({ gender: genderFilter });
  const [search, setSearch] = useState('');

  const filtered = (players ?? []).filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase().trim()),
  );

  if (isLoading) {
    return (
      <View className="items-center py-6">
        <ActivityIndicator color="#1e3a8a" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <TextField
        label="Oyuncu ara"
        placeholder="İsim veya soyisim"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => {
          const isSelected = item.user_id === selectedId;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              className={`mb-1 flex-row items-center rounded-lg border p-3 ${
                isSelected ? 'border-primary bg-blue-50' : 'border-gray-300 bg-white'
              }`}
            >
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                  isSelected ? 'border-primary' : 'border-gray-400'
                }`}
              >
                {isSelected && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </View>
              <Text className="text-base text-gray-900">
                {item.first_name} {item.last_name}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text className="py-6 text-center text-gray-500">Oyuncu bulunamadı</Text>
        }
      />
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/matches/PlayerPicker.tsx
git commit -m "feat(mobile): add PlayerPicker with search"
```

---

### Task 11: FormatPicker + CourtPicker components

**Files:**
- Create: `apps/mobile/components/matches/FormatPicker.tsx`
- Create: `apps/mobile/components/matches/CourtPicker.tsx`

- [ ] **Step 1: FormatPicker.tsx**

```typescript
import { Pressable, Text, View } from 'react-native';

export type MatchFormat = 'bu_klasik' | 'hizli_tiebreak' | 'pro_set_8' | '3set_klasik';

const FORMATS: { value: MatchFormat; label: string; duration: string; description: string }[] = [
  {
    value: 'bu_klasik',
    label: 'Klasik',
    duration: '~60 dk',
    description: '4 el alan kazanır. 3-3 olursa maç yapılmamış sayılır.',
  },
  {
    value: 'hizli_tiebreak',
    label: 'Hızlı Tiebreak',
    duration: '~20 dk',
    description: '10 sayılık match tiebreak.',
  },
  {
    value: 'pro_set_8',
    label: 'Pro Set 8',
    duration: '~75 dk',
    description: '8 game alan kazanır.',
  },
  {
    value: '3set_klasik',
    label: '3 Set Klasik',
    duration: '~2 saat',
    description: 'ATP standardı.',
  },
];

interface Props {
  value: MatchFormat | undefined;
  onChange: (v: MatchFormat) => void;
  error?: string;
}

export function FormatPicker({ value, onChange, error }: Props) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-gray-700">Format</Text>
      {FORMATS.map((f) => {
        const selected = value === f.value;
        return (
          <Pressable
            key={f.value}
            onPress={() => onChange(f.value)}
            className={`mb-2 rounded-lg border p-3 ${
              selected ? 'border-primary bg-blue-50' : 'border-gray-300 bg-white'
            }`}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900">{f.label}</Text>
              <Text className="text-sm text-gray-600">{f.duration}</Text>
            </View>
            <Text className="mt-1 text-sm text-gray-600">{f.description}</Text>
          </Pressable>
        );
      })}
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
```

- [ ] **Step 2: CourtPicker.tsx**

```typescript
import { ActivityIndicator, View } from 'react-native';
import { RadioGroup } from '../ui/RadioGroup';
import { useCourts } from '../../hooks/use-courts';

interface Props {
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
}

export function CourtPicker({ value, onChange, error }: Props) {
  const { data: courts, isLoading } = useCourts();

  if (isLoading) {
    return (
      <View className="items-center py-4">
        <ActivityIndicator color="#1e3a8a" />
      </View>
    );
  }

  return (
    <RadioGroup
      label="Kort"
      options={(courts ?? []).map((c) => ({ value: c.id, label: c.name }))}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/matches/FormatPicker.tsx apps/mobile/components/matches/CourtPicker.tsx
git commit -m "feat(mobile): add FormatPicker and CourtPicker components"
```

---

### Task 12: DateTimePicker wrapper

**Files:**
- Create: `apps/mobile/components/matches/DateTimePicker.tsx`

- [ ] **Step 1: Install package**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bunx expo install @react-native-community/datetimepicker
```

- [ ] **Step 2: Create wrapper**

```typescript
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';
import { useState } from 'react';

interface Props {
  label: string;
  date: Date | undefined;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
  error?: string;
  minimumDate?: Date;
}

export function DateTimeField({ label, date, onChange, mode, error, minimumDate }: Props) {
  const [show, setShow] = useState(false);

  const display = date
    ? mode === 'date'
      ? date.toISOString().slice(0, 10)
      : date.toTimeString().slice(0, 5)
    : 'Seç';

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) onChange(selected);
  };

  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>
      <Pressable
        onPress={() => setShow(true)}
        className={`h-12 justify-center rounded-lg border bg-white px-3 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <Text className="text-base text-gray-900">{display}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date ?? new Date()}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      )}
      {Platform.OS === 'ios' && show && (
        <Pressable onPress={() => setShow(false)} className="mt-2 items-end">
          <Text className="text-primary">Tamam</Text>
        </Pressable>
      )}
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/components/matches/DateTimePicker.tsx apps/mobile/package.json bun.lock
git commit -m "feat(mobile): add DateTimeField wrapper around @react-native-community/datetimepicker"
```

---

### Task 13: useCreateMatchRequest mutation + create-match screen

**Files:**
- Create: `apps/mobile/hooks/use-create-match-request.ts`
- Create: `apps/mobile/app/create-match.tsx`

- [ ] **Step 1: Create mutation hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import type { MatchFormat } from '../components/matches/FormatPicker';

export interface CreateMatchRequestInput {
  type: 'direct_challenge' | 'open_call';
  targetId?: string;
  category: string;
  format: MatchFormat;
  isRated: boolean;
  proposedDate: string; // YYYY-MM-DD
  proposedTime: string; // HH:MM
  courtId: string;
  creatorPartnerId?: string;
  targetPartnerId?: string;
}

export interface CreateMatchRequestResponse {
  id: string;
  status: string;
  expiresAt: string;
}

export function useCreateMatchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMatchRequestInput) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<CreateMatchRequestResponse>(
        'create-match-request',
        input,
        token,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
    },
  });
}
```

- [ ] **Step 2: Create create-match.tsx**

```typescript
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { CourtPicker } from '../components/matches/CourtPicker';
import { DateTimeField } from '../components/matches/DateTimePicker';
import { FormatPicker, type MatchFormat } from '../components/matches/FormatPicker';
import { PlayerPicker } from '../components/matches/PlayerPicker';
import { Button } from '../components/ui/Button';
import { RadioGroup } from '../components/ui/RadioGroup';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useCreateMatchRequest } from '../hooks/use-create-match-request';

type RequestType = 'direct_challenge' | 'open_call';

const CATEGORIES = [
  { value: 'erkek_tek', label: 'Erkek Tek' },
  { value: 'kadin_tek', label: 'Kadın Tek' },
  { value: 'open_tek', label: 'Open Tek' },
  { value: 'erkek_cift', label: 'Erkek Çift' },
  { value: 'kadin_cift', label: 'Kadın Çift' },
  { value: 'karma_cift', label: 'Karma Çift' },
  { value: 'open_cift', label: 'Open Çift' },
];

export default function CreateMatchScreen() {
  const [type, setType] = useState<RequestType>('direct_challenge');
  const [targetId, setTargetId] = useState<string>();
  const [category, setCategory] = useState<string>();
  const [format, setFormat] = useState<MatchFormat>();
  const [isRated, setIsRated] = useState(true);
  const [court, setCourt] = useState<string>();
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<Date>();

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const create = useCreateMatchRequest();

  const validate = () => {
    const errs: Record<string, string | undefined> = {};
    if (type === 'direct_challenge' && !targetId) errs.target = 'Rakip seç';
    if (!category) errs.category = 'Kategori seç';
    if (!format) errs.format = 'Format seç';
    if (!court) errs.court = 'Kort seç';
    if (!date) errs.date = 'Tarih seç';
    if (!time) errs.time = 'Saat seç';
    setErrors(errs);
    return Object.values(errs).every((e) => !e);
  };

  const onSubmit = () => {
    if (!validate()) return;
    if (!category || !format || !court || !date || !time) return;

    const proposedDate = date.toISOString().slice(0, 10);
    const proposedTime = time.toTimeString().slice(0, 5);

    create.mutate(
      {
        type,
        targetId: type === 'direct_challenge' ? targetId : undefined,
        category,
        format,
        isRated,
        proposedDate,
        proposedTime,
        courtId: court,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (e) => {
          Alert.alert('Hata', e instanceof Error ? e.message : 'Oluşturulamadı');
        },
      },
    );
  };

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', title: 'Maç oluştur', headerShown: true }} />
      <ScreenContainer scrollable>
        <ScrollView keyboardShouldPersistTaps="handled">
          {/* Type toggle */}
          <View className="mb-4 flex-row rounded-lg bg-gray-100 p-1">
            <Pressable
              onPress={() => setType('direct_challenge')}
              className={`flex-1 items-center rounded-md py-2 ${
                type === 'direct_challenge' ? 'bg-white' : ''
              }`}
            >
              <Text className={type === 'direct_challenge' ? 'font-semibold text-primary' : 'text-gray-600'}>
                Meydan oku
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setType('open_call')}
              className={`flex-1 items-center rounded-md py-2 ${
                type === 'open_call' ? 'bg-white' : ''
              }`}
            >
              <Text className={type === 'open_call' ? 'font-semibold text-primary' : 'text-gray-600'}>
                Açık ilan
              </Text>
            </Pressable>
          </View>

          {/* Rated toggle */}
          <View className="mb-4 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900">
                {isRated ? '🏆 Sıralama maçı' : '🤝 Dostluk maçı'}
              </Text>
              <Text className="mt-1 text-sm text-gray-600">
                {isRated ? 'ELO etkilenir' : 'ELO etkilenmez'}
              </Text>
            </View>
            <Switch value={isRated} onValueChange={setIsRated} />
          </View>

          {/* Rakip picker (direct only) */}
          {type === 'direct_challenge' && (
            <View className="mb-4">
              <Text className="mb-2 text-base font-semibold text-gray-900">Rakip</Text>
              <View className="max-h-64">
                <PlayerPicker selectedId={targetId} onSelect={(p) => setTargetId(p.user_id)} />
              </View>
              {errors.target && <Text className="mt-1 text-sm text-red-500">{errors.target}</Text>}
            </View>
          )}

          {/* Category */}
          <RadioGroup
            label="Kategori"
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
            error={errors.category}
          />

          {/* Format */}
          <FormatPicker value={format} onChange={setFormat} error={errors.format} />

          {/* Court */}
          <CourtPicker value={court} onChange={setCourt} error={errors.court} />

          {/* Date & Time */}
          <DateTimeField label="Tarih" mode="date" date={date} onChange={setDate} minimumDate={minDate} error={errors.date} />
          <DateTimeField label="Saat" mode="time" date={time} onChange={setTime} error={errors.time} />

          {/* Submit */}
          <View className="mt-2">
            <Button onPress={onSubmit} loading={create.isPending}>
              {type === 'direct_challenge' ? 'Meydan oku' : 'İlanı yayınla'}
            </Button>
          </View>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-create-match-request.ts apps/mobile/app/create-match.tsx
git commit -m "feat(mobile): create-match modal screen (direct + open call)"
```

---

## Phase D — Open call flow

### Task 14: useOpenCalls hook

**Files:**
- Create: `apps/mobile/hooks/use-open-calls.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import type { MatchRequestRow } from './use-match-requests';

export function useOpenCallsFeed() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<MatchRequestRow[]>({
    queryKey: queryKeys.openCalls.feed(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('match_requests')
        .select(`
          id, creator_id, target_id, type, category, format, is_rated,
          proposed_date, proposed_time, court_id, status, expires_at, created_at,
          creator_profile:profiles!match_requests_creator_id_fkey(first_name, last_name, avatar_url),
          court:courts(name)
        `)
        .eq('type', 'open_call')
        .eq('status', 'pending')
        .neq('creator_id', userId ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MatchRequestRow[];
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/use-open-calls.ts
git commit -m "feat(mobile): add useOpenCallsFeed hook"
```

---

### Task 15: Open calls feed screen (real)

**Files:**
- Modify: `apps/mobile/app/(app)/open-calls.tsx`

- [ ] **Step 1: Replace stub**

```typescript
import { router } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';
import { EmptyState } from '../../components/matches/EmptyState';
import { RequestCard } from '../../components/matches/RequestCard';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useOpenCallsFeed } from '../../hooks/use-open-calls';
import { useAuthStore } from '../../stores/auth-store';

export default function OpenCallsScreen() {
  const myUserId = useAuthStore((s) => s.user?.id);
  const q = useOpenCallsFeed();

  return (
    <ScreenContainer>
      {myUserId ? (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              myUserId={myUserId}
              onPress={() => router.push(`/match/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} />
          }
          ListEmptyComponent={
            <EmptyState
              title="Açık ilan yok"
              message="Birisi açık ilan yayınladığında burada görünecek."
              icon="📢"
            />
          }
        />
      ) : null}
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add 'apps/mobile/app/(app)/open-calls.tsx'
git commit -m "feat(mobile): real open-calls feed screen"
```

---

### Task 16: useApplyToOpenCall mutation

**Files:**
- Create: `apps/mobile/hooks/use-apply-to-open-call.ts`

- [ ] **Step 1: Create hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function useApplyToOpenCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; applicantPartnerId?: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction('apply-to-open-call', input, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.all });
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/use-apply-to-open-call.ts
git commit -m "feat(mobile): add useApplyToOpenCall mutation"
```

---

### Task 17: useApplications hooks

**Files:**
- Create: `apps/mobile/hooks/use-applications.ts`

- [ ] **Step 1: Create hooks**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface ApplicationRow {
  id: string;
  match_request_id: string;
  applicant_id: string;
  applicant_partner_id: string | null;
  status: 'pending' | 'selected' | 'declined';
  created_at: string;
  applicant?: { first_name: string; last_name: string; avatar_url: string | null };
}

export function useApplicationsForRequest(requestId: string | undefined) {
  return useQuery<ApplicationRow[]>({
    queryKey: queryKeys.applications.forRequest(requestId ?? ''),
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from('open_call_applications')
        .select(`
          id, match_request_id, applicant_id, applicant_partner_id, status, created_at,
          applicant:profiles!open_call_applications_applicant_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('match_request_id', requestId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ApplicationRow[];
    },
    enabled: !!requestId,
  });
}

export function useMyApplications() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<ApplicationRow[]>({
    queryKey: queryKeys.applications.mine(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('open_call_applications')
        .select('id, match_request_id, applicant_id, applicant_partner_id, status, created_at')
        .eq('applicant_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicationRow[];
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/use-applications.ts
git commit -m "feat(mobile): add useApplicationsForRequest + useMyApplications"
```

---

## Phase E — Detail + accept/reject

### Task 18: useAccept + useReject mutations

**Files:**
- Create: `apps/mobile/hooks/use-accept-match-request.ts`
- Create: `apps/mobile/hooks/use-reject-match-request.ts`

- [ ] **Step 1: useAcceptMatchRequest**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface AcceptResponse {
  matchId: string;
  requestStatus: string;
}

export function useAcceptMatchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<AcceptResponse>('accept-match-request', input, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
    },
  });
}
```

- [ ] **Step 2: useRejectMatchRequest**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function useRejectMatchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction('reject-match-request', input, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/use-accept-match-request.ts apps/mobile/hooks/use-reject-match-request.ts
git commit -m "feat(mobile): add accept + reject match request mutations"
```

---

### Task 19: Match request detail screen

**Files:**
- Create: `apps/mobile/app/match/[id].tsx`
- Create: `apps/mobile/hooks/use-match-request-detail.ts`

- [ ] **Step 1: Detail query hook**

Create `apps/mobile/hooks/use-match-request-detail.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import type { MatchRequestRow } from './use-match-requests';

export function useMatchRequestDetail(id: string | undefined) {
  return useQuery<MatchRequestRow | null>({
    queryKey: queryKeys.matchRequests.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('match_requests')
        .select(`
          id, creator_id, target_id, type, category, format, is_rated,
          proposed_date, proposed_time, court_id, status, expires_at, created_at,
          creator_profile:profiles!match_requests_creator_id_fkey(first_name, last_name, avatar_url),
          target_profile:profiles!match_requests_target_id_fkey(first_name, last_name, avatar_url),
          court:courts(name)
        `)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MatchRequestRow | null;
    },
    enabled: !!id,
  });
}
```

- [ ] **Step 2: Detail screen**

Create `apps/mobile/app/match/[id].tsx`:

```typescript
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
  bu_klasik: 'Klasik', hizli_tiebreak: 'Hızlı Tiebreak',
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
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/use-match-request-detail.ts apps/mobile/app/match/
git commit -m "feat(mobile): match request detail screen with accept/reject/apply actions"
```

---

## Phase F — Applications management

### Task 20: useSelectApplication mutation + applications list screen

**Files:**
- Create: `apps/mobile/hooks/use-select-application.ts`
- Create: `apps/mobile/app/applications/[requestId].tsx`

- [ ] **Step 1: useSelectApplication hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function useSelectApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { applicationId: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<{ matchId: string; requestStatus: string }>(
        'select-open-call-application',
        input,
        token,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.applications.all });
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
    },
  });
}
```

- [ ] **Step 2: applications/[requestId].tsx**

```typescript
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { EmptyState } from '../../components/matches/EmptyState';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useApplicationsForRequest, type ApplicationRow } from '../../hooks/use-applications';
import { useSelectApplication } from '../../hooks/use-select-application';

export default function ApplicationsListScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const { data: apps, isLoading } = useApplicationsForRequest(requestId);
  const select = useSelectApplication();

  const onSelect = (app: ApplicationRow) => {
    Alert.alert(
      'Seç',
      `${app.applicant?.first_name ?? 'Bu oyuncu'} ile maç oluşturulacak. Diğer başvurular otomatik kapanır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Seç',
          onPress: () =>
            select.mutate(
              { applicationId: app.id },
              {
                onSuccess: () => {
                  Alert.alert('Başarılı', 'Maç oluşturuldu.');
                  router.back();
                },
                onError: (e) =>
                  Alert.alert('Hata', e instanceof Error ? e.message : 'Seçilemedi'),
              },
            ),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Başvurular', headerShown: true }} />
        <ScreenContainer>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1e3a8a" />
          </View>
        </ScreenContainer>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Başvurular', headerShown: true }} />
      <ScreenContainer>
        <FlatList
          data={apps ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              disabled={item.status !== 'pending' || select.isPending}
              className={`mb-2 rounded-lg border p-3 ${
                item.status === 'selected' ? 'border-green-500 bg-green-50' :
                item.status === 'declined' ? 'border-gray-300 bg-gray-50' :
                'border-gray-300 bg-white active:bg-gray-50'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-gray-900">
                  {item.applicant?.first_name} {item.applicant?.last_name}
                </Text>
                <Text className="text-xs text-gray-500">
                  {item.status === 'pending' ? 'Bekliyor' :
                   item.status === 'selected' ? '✓ Seçildi' : '✗ Kapandı'}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Henüz başvuru yok"
              message="İnsanlar ilanını gördükçe başvurular burada görünecek."
              icon="📨"
            />
          }
        />
      </ScreenContainer>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/use-select-application.ts apps/mobile/app/applications/
git commit -m "feat(mobile): applications list screen for open call creators"
```

---

### Task 21: End-to-end manual verification in iOS Simulator

This task is verification only. No code changes.

**Files:** None.

- [ ] **Step 1: Start backend stack**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase functions serve --no-verify-jwt &
```

- [ ] **Step 2: Update mobile env**

```bash
KEYS=$(supabase status --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321'); print(f'EXPO_PUBLIC_SUPABASE_ANON_KEY={d[\"ANON_KEY\"]}')")
echo "$KEYS" > /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile/.env.local
```

- [ ] **Step 3: Start Expo + Simulator**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bunx expo start --host lan &
sleep 25
open -a /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app
xcrun simctl openurl booted "exp://192.168.1.7:8081"
```

(Adjust IP via `ifconfig en0 | grep "inet "` if 192.168.1.7 isn't current LAN.)

- [ ] **Step 4: Manual verification on Simulator**

Two test accounts needed. Create both via the in-app sign-up flow:
1. Sign up `alice@example.edu.tr` → onboarding → home
2. Sign out → sign up `bob@example.edu.tr` → onboarding → home

Now test the full Plan 4a flow:

**As Bob:**
1. ✅ Maçlar tab opens, "Gelen teklif yok" empty state
2. ✅ Tap + FAB → create-match modal opens
3. ✅ Select "Meydan oku", search "Alice", select Alice
4. ✅ Pick category (erkek_tek), format (Klasik), court (Kort 1), tomorrow date, 19:00 time
5. ✅ Submit → returns to inbox, "Atılan" tab shows pending request

**Sign out, sign in as Alice:**

6. ✅ Maçlar → "Gelen" tab shows Bob's challenge
7. ✅ Tap card → detail screen with Accept/Reject buttons
8. ✅ Tap "Kabul et" → success, returns to inbox, status badge "Kabul edildi"

**Test open call as Alice:**

9. ✅ Tap + FAB → toggle "Açık ilan"
10. ✅ Pick category/format/court/date/time → submit
11. ✅ Atılan tab shows the open call

**Sign out, sign in as Bob:**

12. ✅ İlanlar tab shows Alice's open call
13. ✅ Tap card → detail → "İlana başvur" → success
14. ✅ Sign out

**Sign in as Alice:**

15. ✅ Tap her open call in Atılan → "Başvuruları gör" → see Bob
16. ✅ Tap Bob's row → confirmation alert → tap "Seç" → success
17. ✅ Open call status flips to "Kabul edildi"

- [ ] **Step 5: Verify backend state via psql**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select status, count(*) from public.match_requests group by status;"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select status, count(*) from public.matches group by status;"
```

Expected:
- match_requests: 1 accepted (Bob's direct) + 1 accepted (Alice's open call)
- matches: 2 awaiting_confirmation (one from each accepted request)

- [ ] **Step 6: Stop services + empty commit**

```bash
pkill -f "expo start" || true
pkill -f "supabase functions serve" || true
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase stop
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git commit --allow-empty -m "test(mobile): verified Plan 4a end-to-end in iOS Simulator"
```

---

## Plan 4a Sonu

Bu plan tamamlandığında elde:

- **4 alt tab**: Maçlar (inbox + outbox), İlanlar (feed), Profil, Ayarlar
- **Maç oluşturma akışı**: direkt meydan okuma + açık ilan; her ikisi de rated/unrated toggle
- **Detail ekranı**: gelen meydan okumalar için kabul/red, açık ilanlar için başvur
- **Başvurular yönetimi**: ilan sahibi başvuranları görür, birini seçer → maç oluşur
- **TanStack Query** cache + invalidation tüm CRUD'lar için
- **Edge Function entegrasyonu**: 5 Plan 2 Edge Function'ı (create / accept / reject / apply / select) tüketildi
- **iOS Simulator end-to-end** test edildi

**Sonraki plan: Plan 4b — Skor giriş + onay + ELO + dispute.** Maç awaiting_confirmation'a düştükten sonra Alice + Bob skor girer, onaylar, ELO uygulanır, mesh + dispute akışları test edilir.
