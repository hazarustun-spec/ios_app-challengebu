# Plan 7: Admin Paneli + Push Notification + Realtime + In-App Notification Center

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full operator surface and the live notification layer on top of the backend that Plan 1/2 already migrated. The work delivers: (1) Expo push token registration + per-category preference UI, (2) an in-app notification center with realtime badge, (3) a generic `useRealtimeChannel` helper + three concrete realtime wirings (matches, score submissions, match requests), (4) an `(admin)` route group gated by `profile.role`, (5) six admin screens (Bekleyen İtirazlar, Sezon Yönetimi, Finale Bracket Yönetimi, Kullanıcı Yönetimi, Topluluk Duyurusu, Sistem Sağlığı), (6) two new Edge Functions (`publish-announcement`, `admin-update-profile`) with deno tests, (7) an initial-admin migration placeholder, and (8) a manual iOS E2E that exercises the full round trip (push → bell → admin action → realtime UI update).

**Architecture:** Push registration happens once during auth bootstrap and reuses the existing `register-push-token` Edge Function. The notification center is a thin Supabase Postgres reader over the `notifications` table (already in `supabase_realtime` per migration `20260607000001_realtime_publications.sql`); a single `<NotificationListener />` mounted at `(app)/_layout.tsx` invalidates query keys when new rows arrive — no separate state library. Realtime for matches / score submissions / match requests piggybacks the same Plan 1 publication; the new `useRealtimeChannel` helper standardises subscribe-and-invalidate lifecycle. The `(admin)` route group is a parallel sibling to `(app)`; the Tabs layout reveals an extra "Admin" tab when `profile.role === 'admin'` via `href: null` for non-admins. Admin actions that mutate `profiles.role` or `profiles.status` go through a new `admin-update-profile` Edge Function (column-level RLS revokes those fields from clients per `20260608000006_profiles_column_rls.sql`); admin actions on disputes reuse the existing `resolve-dispute` function. Announcements flow through a new `publish-announcement` function that inserts a row into `announcements`, fans out into `notifications` for the matched audience, and (optionally) calls `send-push-notification` for each recipient. Every admin mutation writes to `audit_log` (the function does this server-side; the Sistem Sağlığı screen surfaces the tail).

**Tech Stack:** Expo SDK 56 (`expo-notifications` newly installed via `bunx expo install`), `@supabase/supabase-js` realtime channels, TanStack Query v5, Expo Router 4 (typed routes — every new route is declared as a file before being referenced), NativeWind 4, Deno 1.x for the two new Edge Functions, `bun:test` not used in this plan (no new shared package code), `deno test` for backend.

**Spec reference:** `docs/superpowers/specs/2026-06-06-tennis-challenger-design.md`
- Section 7.1 — Admin yapısı (tek admin, role-based, BÜ mail istisnası)
- Section 7.2 — Admin paneli (6 ekran)
- Section 7.3 — Bildirim kategorileri (8 kategori, default ON/OFF)
- Section 7.4 — In-app bildirim merkezi
- Section 7.5 — Realtime subscription gerektiren 5 tablo
- Section 7.6 — Cron job listesi (cleanup_notifications, season_lifecycle_check — Plan 1'de zaten var; bu plan sadece tüketir)
- Section 7.8 — Audit log

**Plan dependencies:**
- Plan 1 migrations: `20260606000008_notifications.sql`, `20260606000009_audit_announcements.sql`, `20260607000001_realtime_publications.sql`, `20260608000006_profiles_column_rls.sql`
- Plan 2 Edge Functions: `send-push-notification`, `register-push-token`, `resolve-dispute`
- Plan 3 mobile shell: auth bootstrap, `get_my_profile` RPC, `(app)` Tabs layout
- Plan 4b: `confirm-match` + match detail screen + MismatchBanner
- Plan 5: `useOtherPlayerProfile` (over `public_profiles` view), badge plumbing
- Plan 6: `useTournamentBracket` + `BracketView` component (admin Finale Bracket Yönetimi reuses both), `useCurrentSeason`, `start-season-finale` + `close-season`

**Plan 7 NOT in scope:**
- Web admin dashboard (Faz 2)
- Bracket "withdraw → replace with 9th seed" — Plan 7 admin can VOID an individual bracket slot/match, but auto-promoting a substitute is deferred to a follow-up sprint
- Push token TTL refresh on every cold start beyond `last_active_at` upsert (Plan 1 already has the `cleanup_push_tokens` weekly cron)
- Notification grouping / channels (iOS notification categories with action buttons) — MVP shows a single category
- Localised content for announcements — admin types in Turkish, app shows Turkish

**Known limitations (documented in code, fixed later):**
- The admin "Kullanıcı Yönetimi" detail screen reads from the base `profiles` table (admins have implicit SELECT via the `Admins can view all profiles` policy in `20260608000006_profiles_column_rls.sql`); non-admins continue to use `public_profiles` view and `useOtherPlayerProfile`
- The realtime helper invalidates the query key on EVERY event; chatty channels could over-refetch. We mitigate with a 250ms debounce inside the helper
- `publish-announcement` fans out synchronously; for >500 recipients we should move to a batched job — out of scope for MVP (300 active users target)
- `admin-update-profile` writes a single audit row per call; bulk operations are not exposed in the UI

---

## Dosya Yapısı

```
apps/mobile/
├── app.json                                          # MODIFY: add expo-notifications plugin + iOS notification permission text
├── app/
│   ├── _layout.tsx                                   # MODIFY: register notifications + (admin) stack
│   ├── (app)/
│   │   ├── _layout.tsx                               # MODIFY: 5th Admin tab gated by role + mount NotificationListener
│   │   ├── matches.tsx                               # MODIFY: bell button in header area + realtime wire
│   │   └── settings.tsx                              # MODIFY: link to notification-preferences + admin-panel entry
│   ├── (admin)/
│   │   ├── _layout.tsx                               # NEW: admin route guard + Stack
│   │   ├── index.tsx                                 # NEW: admin home hub (6 tiles)
│   │   ├── disputes.tsx                              # NEW: pending disputes list
│   │   ├── disputes/[id].tsx                         # NEW: dispute resolution detail
│   │   ├── seasons.tsx                               # NEW: season management
│   │   ├── tournaments.tsx                           # NEW: finale bracket management
│   │   ├── users.tsx                                 # NEW: user list + search
│   │   ├── users/[userId].tsx                        # NEW: user admin detail
│   │   ├── announcements.tsx                         # NEW: announcement list + composer entry
│   │   ├── announcements/new.tsx                     # NEW: new announcement form
│   │   └── health.tsx                                # NEW: system health + audit log tail
│   ├── notifications.tsx                             # NEW: in-app notification center list
│   └── notification-preferences.tsx                  # NEW: 8 toggles for notification categories
├── components/
│   ├── admin/
│   │   ├── AdminCard.tsx                             # NEW: 6-tile hub button
│   │   ├── DisputeRow.tsx                            # NEW: open-disputes list row
│   │   ├── UserRow.tsx                               # NEW: paginated user list row
│   │   └── AnnouncementCard.tsx                      # NEW: past announcement row
│   └── notifications/
│       ├── NotificationBell.tsx                      # NEW: bell button + unread badge
│       ├── NotificationListener.tsx                  # NEW: realtime subscription mount
│       └── NotificationRow.tsx                       # NEW: list row with timestamp + read state
├── hooks/
│   ├── use-push-registration.ts                      # NEW: request permission + register token
│   ├── use-notification-preferences.ts               # NEW: query + mutation over notification_preferences
│   ├── use-notifications.ts                          # NEW: paginated list
│   ├── use-unread-count.ts                           # NEW: count of read_at IS NULL
│   ├── use-mark-notification-read.ts                 # NEW: mutation
│   ├── use-mark-all-read.ts                          # NEW: mutation
│   ├── use-realtime-channel.ts                       # NEW: generic subscribe + invalidate helper
│   ├── use-pending-disputes.ts                       # NEW: admin disputes list
│   ├── use-dispute-detail.ts                         # NEW: admin dispute detail with both submissions
│   ├── use-resolve-dispute.ts                        # NEW: mutation calling resolve-dispute Edge Function
│   ├── use-admin-seasons.ts                          # NEW: list seasons + lifecycle CTAs
│   ├── use-admin-tournaments.ts                      # NEW: list current season tournaments
│   ├── use-admin-users.ts                            # NEW: paginated profile list + search
│   ├── use-admin-user-detail.ts                      # NEW: full profile read (admin RLS)
│   ├── use-admin-update-profile.ts                   # NEW: mutation calling admin-update-profile Edge Function
│   ├── use-admin-announcements.ts                    # NEW: published announcements list
│   ├── use-publish-announcement.ts                   # NEW: mutation
│   ├── use-admin-health.ts                           # NEW: dashboard stats
│   └── use-audit-log.ts                              # NEW: recent audit_log rows
├── lib/
│   ├── auth-bootstrap.ts                             # MODIFY: kick off push registration after profile loads
│   └── query-keys.ts                                 # MODIFY: add notifications/admin/announcements/audit namespaces
└── stores/
    └── auth-store.ts                                 # MODIFY: expose `isAdmin` selector helper

packages/supabase/
├── migrations/
│   └── 20260609000005_initial_admin_seed.sql         # NEW: placeholder admin seed (user fills email before deploy)
├── functions/
│   ├── publish-announcement/
│   │   └── index.ts                                  # NEW: insert + fan out + optional push
│   └── admin-update-profile/
│       └── index.ts                                  # NEW: role/status updates with audit
└── tests/functions/
    ├── publish-announcement.deno-test.ts             # NEW: 3 tests
    └── admin-update-profile.deno-test.ts             # NEW: 3 tests
```

**Phase outline:**
- **Phase A — Push onboarding + preferences (Tasks 1-2):** `expo-notifications` install + token register + 8-toggle UI
- **Phase B — In-app notification center (Tasks 3-5):** query/unread hooks + bell + center screen + realtime listener mount
- **Phase C — Realtime helpers + wiring (Tasks 6-9):** generic hook + matches + score submissions + match requests
- **Phase D — Admin route group + role gating (Tasks 10-11):** `(admin)` Stack, tab visibility, initial admin seed
- **Phase E — Disputes + Seasons screens (Tasks 12-13)**
- **Phase F — Bracket + Users + admin-update-profile Edge Function (Tasks 14-15)**
- **Phase G — Announcements + Health + Audit log (Tasks 16-18)**
- **Phase H — Backend tests + iOS E2E (Tasks 19-20)**

---

## Phase A — Mobile push notification onboarding + token registration

### Task 1: Install `expo-notifications` + push registration hook

**Files:**
- Modify: `apps/mobile/app.json`
- Create: `apps/mobile/hooks/use-push-registration.ts`
- Modify: `apps/mobile/lib/auth-bootstrap.ts`

- [ ] **Step 1: Install the package via the Expo CLI**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bunx expo install expo-notifications expo-device
```

The Plan repo uses Expo SDK 56 — `bunx expo install` resolves the versions compatible with that SDK (currently `expo-notifications ~0.32.x` and `expo-device ~8.0.x`). Do not pin a version manually.

- [ ] **Step 2: Update `apps/mobile/app.json` — add the notifications plugin and iOS permission string**

Open the file. The current `plugins` array is:

```json
"plugins": [
  "expo-router",
  "expo-secure-store",
  "@react-native-community/datetimepicker",
  [
    "expo-image-picker",
    {
      "photosPermission": "Profil fotoğrafını seçmek için galeri erişimi gerekli."
    }
  ]
]
```

Replace it with:

```json
"plugins": [
  "expo-router",
  "expo-secure-store",
  "@react-native-community/datetimepicker",
  [
    "expo-image-picker",
    {
      "photosPermission": "Profil fotoğrafını seçmek için galeri erişimi gerekli."
    }
  ],
  [
    "expo-notifications",
    {
      "icon": "./assets/icon.png",
      "color": "#1e3a8a"
    }
  ]
]
```

Also, inside the `ios` object (currently `{ "supportsTablet": false, "bundleIdentifier": "tr.edu.boun.tennischallenger" }`), add `infoPlist` keys + `usesAppleSignIn: false` is unrelated. Replace the `ios` object with:

```json
"ios": {
  "supportsTablet": false,
  "bundleIdentifier": "tr.edu.boun.tennischallenger",
  "infoPlist": {
    "UIBackgroundModes": ["remote-notification"]
  }
}
```

- [ ] **Step 3: Create `apps/mobile/hooks/use-push-registration.ts`**

The hook is called once after the profile loads. It asks for permission, fetches the Expo push token, and posts it to the `register-push-token` Edge Function. On simulator + when permission is denied, it silently no-ops — push is best-effort.

```typescript
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { invokeFunction } from '../lib/invoke-function';
import { useAuthStore } from '../stores/auth-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushRegistration() {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const registered = useRef<string | null>(null);

  useEffect(() => {
    if (!profile?.userId || !session?.access_token) return;
    if (registered.current === profile.userId) return;
    registered.current = profile.userId;
    void registerForPushAsync(session.access_token);
  }, [profile?.userId, session?.access_token]);
}

async function registerForPushAsync(accessToken: string): Promise<void> {
  try {
    if (!Device.isDevice) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return;
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;
    if (!token) return;
    await invokeFunction(
      'register-push-token',
      { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
      accessToken,
    );
  } catch (err) {
    console.warn('[push] registration failed', err);
  }
}
```

- [ ] **Step 4: Kick off registration from `auth-bootstrap.ts`**

The hook itself is called by a component (so the React tree exists). Add a single line to `_layout.tsx` (Task 5 will wrap this with `NotificationListener`); for now, leave `auth-bootstrap.ts` UNCHANGED in this step — we will mount the hook from the root layout. Skip to Step 5.

- [ ] **Step 5: Mount the hook from `apps/mobile/app/_layout.tsx`**

Open `apps/mobile/app/_layout.tsx`. Add the import at the top with the other imports:

```typescript
import { usePushRegistration } from '../hooks/use-push-registration';
```

Then inside the `RootLayout` function, right after `useEffect(() => { bootstrapAuth(); }, []);`, add:

```typescript
  usePushRegistration();
```

- [ ] **Step 6: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/app.json apps/mobile/package.json apps/mobile/hooks/use-push-registration.ts apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): install expo-notifications + register Expo push token after auth"
```

---

### Task 2: Notification preferences screen + hook

**Files:**
- Modify: `apps/mobile/lib/query-keys.ts`
- Create: `apps/mobile/hooks/use-notification-preferences.ts`
- Create: `apps/mobile/app/notification-preferences.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (register the new Stack screen)
- Modify: `apps/mobile/app/(app)/settings.tsx` (link to the screen)

- [ ] **Step 1: Extend `apps/mobile/lib/query-keys.ts`**

Open the file. Right above the existing `seasons:` group, insert these three new groups:

```typescript
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
    preferences: () => [...queryKeys.notifications.all, 'preferences'] as const,
  },
  admin: {
    all: ['admin'] as const,
    pendingDisputes: () => [...queryKeys.admin.all, 'pending-disputes'] as const,
    disputeDetail: (id: string) => [...queryKeys.admin.all, 'dispute', id] as const,
    seasons: () => [...queryKeys.admin.all, 'seasons'] as const,
    tournaments: (seasonId: string) => [...queryKeys.admin.all, 'tournaments', seasonId] as const,
    users: (search: string | null) => [...queryKeys.admin.all, 'users', search] as const,
    userDetail: (userId: string) => [...queryKeys.admin.all, 'user', userId] as const,
    health: () => [...queryKeys.admin.all, 'health'] as const,
    auditLog: () => [...queryKeys.admin.all, 'audit-log'] as const,
  },
  announcements: {
    all: ['announcements'] as const,
    published: () => [...queryKeys.announcements.all, 'published'] as const,
  },
```

- [ ] **Step 2: Create `apps/mobile/hooks/use-notification-preferences.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export type NotificationCategory =
  | 'match_proposals'
  | 'match_reminders'
  | 'score_confirmations'
  | 'elo_and_ranking'
  | 'badges'
  | 'season_and_tournament'
  | 'community_announcements'
  | 'inactivity_warning';

export interface NotificationPreference {
  category: NotificationCategory;
  enabled: boolean;
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  match_proposals: 'Maç teklifleri',
  match_reminders: 'Maç hatırlatma',
  score_confirmations: 'Skor onayları',
  elo_and_ranking: 'ELO ve sıralama',
  badges: 'Rozet',
  season_and_tournament: 'Sezon ve turnuva',
  community_announcements: 'Topluluk duyuruları',
  inactivity_warning: 'Pasiflik uyarısı',
};

export const ALL_CATEGORIES: NotificationCategory[] = [
  'match_proposals',
  'match_reminders',
  'score_confirmations',
  'elo_and_ranking',
  'badges',
  'season_and_tournament',
  'community_announcements',
  'inactivity_warning',
];

export function useNotificationPreferences() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<NotificationPreference[]>({
    queryKey: queryKeys.notifications.preferences(),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('category, enabled')
        .eq('profile_id', userId!);
      if (error) throw error;
      return (data ?? []) as NotificationPreference[];
    },
  });
}

export function useUpdateNotificationPreference() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { category: NotificationCategory; enabled: boolean }) => {
      if (!userId) throw new Error('not authenticated');
      const { error } = await supabase
        .from('notification_preferences')
        .update({ enabled: input.enabled })
        .eq('profile_id', userId)
        .eq('category', input.category);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
    },
  });
}
```

- [ ] **Step 3: Create `apps/mobile/app/notification-preferences.tsx`**

```typescript
import { Text, View } from 'react-native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { Toggle } from '../components/ui/Toggle';
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from '../hooks/use-notification-preferences';

export default function NotificationPreferencesScreen() {
  const { data, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreference();

  if (isLoading) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }

  const map = new Map((data ?? []).map((p) => [p.category, p.enabled]));

  return (
    <ScreenContainer scrollable>
      <Text className="mb-2 text-base font-semibold text-gray-900">Bildirim Tercihleri</Text>
      <Text className="mb-4 text-xs text-gray-500">
        Kategoriler kapalıysa o tür için push gönderilmez, in-app bildirim de görünmez.
      </Text>
      <View>
        {ALL_CATEGORIES.map((cat) => (
          <Toggle
            key={cat}
            label={CATEGORY_LABELS[cat]}
            value={map.get(cat) ?? false}
            onValueChange={(v) => update.mutate({ category: cat, enabled: v })}
          />
        ))}
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 4: Register the route in `apps/mobile/app/_layout.tsx`**

Open the root layout. Inside the `<Stack>` element, add a new `<Stack.Screen>` line right before `</Stack>` and the `<CelebrationMount />`:

```typescript
          <Stack.Screen
            name="notification-preferences"
            options={{ headerShown: true, title: 'Bildirim Tercihleri' }}
          />
          <Stack.Screen
            name="notifications"
            options={{ headerShown: true, title: 'Bildirimler' }}
          />
          <Stack.Screen name="(admin)" />
```

(The `notifications` and `(admin)` entries are added now to avoid touching the file later; their files are created in Task 4 and Task 10 respectively, but typed-routes accepts the registration as long as the file exists by the time the route is opened.)

- [ ] **Step 5: Link from `apps/mobile/app/(app)/settings.tsx`**

Replace the file with:

```typescript
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { invokeFunction } from '../../lib/invoke-function';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';

export default function SettingsScreen() {
  const signOutStore = useAuthStore((s) => s.signOut);
  const session = useAuthStore((s) => s.session);
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOutStore();
    router.replace('/(auth)/sign-in');
  };

  const confirmDelete = () => {
    Alert.alert(
      'Hesabını sil',
      'Bu işlem geri alınamaz. Profilin anonimleştirilir, maç geçmişin "Eski Üye" olarak korunur. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: secondConfirm },
      ],
    );
  };

  const secondConfirm = () => {
    Alert.alert('Son onay', 'Gerçekten silmek istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Evet, sil', style: 'destructive', onPress: doDelete },
    ]);
  };

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

  return (
    <ScreenContainer>
      <View className="flex-1 gap-3 pt-6">
        <Button onPress={() => router.push('/notification-preferences')} variant="secondary">
          Bildirim Tercihleri
        </Button>
        {isAdmin ? (
          <Button onPress={() => router.push('/(admin)')} variant="secondary">
            Admin Paneli
          </Button>
        ) : null}
        <Button onPress={handleLogout} variant="secondary">
          Çıkış yap
        </Button>
        <Text className="mt-6 text-sm text-gray-500">Hesabını kalıcı olarak sil:</Text>
        <Button onPress={confirmDelete} variant="ghost">
          Hesabımı sil
        </Button>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 6: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/lib/query-keys.ts apps/mobile/hooks/use-notification-preferences.ts apps/mobile/app/notification-preferences.tsx apps/mobile/app/_layout.tsx apps/mobile/app/\(app\)/settings.tsx
git commit -m "feat(mobile): add notification preferences screen (8 toggles) + settings entry"
```

---

## Phase B — In-app notification center

### Task 3: Notification list + unread count hooks

**Files:**
- Create: `apps/mobile/hooks/use-notifications.ts`
- Create: `apps/mobile/hooks/use-unread-count.ts`
- Create: `apps/mobile/hooks/use-mark-notification-read.ts`
- Create: `apps/mobile/hooks/use-mark-all-read.ts`

- [ ] **Step 1: Create `use-notifications.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import type { NotificationCategory } from './use-notification-preferences';

export interface NotificationRow {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<NotificationRow[]>({
    queryKey: queryKeys.notifications.list(),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, category, title, body, data, read_at, created_at')
        .eq('recipient_id', userId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return ((data ?? []) as unknown) as NotificationRow[];
    },
  });
}
```

- [ ] **Step 2: Create `use-unread-count.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function useUnreadCount() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<number>({
    queryKey: queryKeys.notifications.unreadCount(),
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId!)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 30,
  });
}
```

- [ ] **Step 3: Create `use-mark-notification-read.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
}
```

- [ ] **Step 4: Create `use-mark-all-read.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function useMarkAllRead() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('not authenticated');
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
  });
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-notifications.ts apps/mobile/hooks/use-unread-count.ts apps/mobile/hooks/use-mark-notification-read.ts apps/mobile/hooks/use-mark-all-read.ts
git commit -m "feat(mobile): add notifications list + unread count + mark-read hooks"
```

---

### Task 4: Notification bell + center screen

**Files:**
- Create: `apps/mobile/components/notifications/NotificationBell.tsx`
- Create: `apps/mobile/components/notifications/NotificationRow.tsx`
- Create: `apps/mobile/app/notifications.tsx`
- Modify: `apps/mobile/app/(app)/matches.tsx` (mount the bell)

- [ ] **Step 1: Create `NotificationBell.tsx`**

```typescript
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useUnreadCount } from '../../hooks/use-unread-count';

export function NotificationBell() {
  const { data } = useUnreadCount();
  const unread = data ?? 0;
  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      className="relative h-10 w-10 items-center justify-center"
      accessibilityLabel="Bildirimler"
    >
      <Text className="text-2xl">🔔</Text>
      {unread > 0 ? (
        <View className="absolute right-0 top-0 min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1">
          <Text className="text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : String(unread)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
```

- [ ] **Step 2: Create `NotificationRow.tsx`**

```typescript
import { Pressable, Text, View } from 'react-native';
import type { NotificationRow as Row } from '../../hooks/use-notifications';

interface Props {
  row: Row;
  onPress: () => void;
}

export function NotificationRow({ row, onPress }: Props) {
  const unread = row.read_at === null;
  const ts = new Date(row.created_at);
  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 rounded-lg border p-3 ${
        unread ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
      }`}
    >
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 text-sm font-semibold text-gray-900">{row.title}</Text>
        <Text className="ml-2 text-[10px] text-gray-500">{formatRelative(ts)}</Text>
      </View>
      <Text className="mt-1 text-xs text-gray-700">{row.body}</Text>
    </Pressable>
  );
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}g`;
  return d.toLocaleDateString('tr-TR');
}
```

- [ ] **Step 3: Create `apps/mobile/app/notifications.tsx`**

The screen handles tap-to-deep-link based on `row.data`. Known shapes:
- `{ matchRequestId }` → `/match-request/[id]`
- `{ matchId }` → `/match/[id]`
- `{ disputeId }` → admin only: `/(admin)/disputes/[id]`
- `{ tournamentId }` → `/tournament/[id]`
- `{ announcementId }` → no deep link, just mark read
- `{ action: 'open_admin_seasons' }` → `/(admin)/seasons`

```typescript
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { NotificationRow } from '../components/notifications/NotificationRow';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useMarkAllRead } from '../hooks/use-mark-all-read';
import { useMarkNotificationRead } from '../hooks/use-mark-notification-read';
import { useNotifications, type NotificationRow as Row } from '../hooks/use-notifications';
import { useAuthStore } from '../stores/auth-store';

export default function NotificationsScreen() {
  const list = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');

  const handlePress = (n: Row) => {
    if (n.read_at === null) markOne.mutate(n.id);
    const data = n.data ?? {};
    if (typeof data.matchRequestId === 'string') {
      router.push(`/match-request/${data.matchRequestId}`);
      return;
    }
    if (typeof data.matchId === 'string') {
      router.push(`/match/${data.matchId}`);
      return;
    }
    if (typeof data.tournamentId === 'string') {
      router.push(`/tournament/${data.tournamentId}`);
      return;
    }
    if (isAdmin && typeof data.disputeId === 'string') {
      router.push(`/(admin)/disputes/${data.disputeId}`);
      return;
    }
    if (data.action === 'open_admin_seasons' && isAdmin) {
      router.push('/(admin)/seasons');
      return;
    }
  };

  return (
    <ScreenContainer>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900">Bildirimler</Text>
        <Pressable onPress={() => markAll.mutate()}>
          <Text className="text-xs text-primary">Tümünü okundu işaretle</Text>
        </Pressable>
      </View>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow row={item} onPress={() => handlePress(item)} />}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />}
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-500">Bildirim yok.</Text>
        }
        ListFooterComponent={
          <Text className="mt-4 text-center text-[10px] text-gray-400">
            30 günden eski bildirimler otomatik silinir.
          </Text>
        }
      />
    </ScreenContainer>
  );
}
```

- [ ] **Step 4: Mount the bell on the Maçlar tab**

Open `apps/mobile/app/(app)/matches.tsx`. Add the import near the top:

```typescript
import { NotificationBell } from '../../components/notifications/NotificationBell';
```

Then inside the returned JSX, replace the `<SeasonBanner />` line with a wrapping header row:

```typescript
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">Maçlar</Text>
        <NotificationBell />
      </View>
      <SeasonBanner />
```

The screen already imports `View` and `Text` so no extra imports are needed.

- [ ] **Step 5: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/components/notifications/NotificationBell.tsx apps/mobile/components/notifications/NotificationRow.tsx apps/mobile/app/notifications.tsx apps/mobile/app/\(app\)/matches.tsx
git commit -m "feat(mobile): add notification bell + center screen with deep-link routing"
```

---

### Task 5: Realtime listener mount

**Files:**
- Create: `apps/mobile/components/notifications/NotificationListener.tsx`
- Modify: `apps/mobile/app/(app)/_layout.tsx`

- [ ] **Step 1: Create `NotificationListener.tsx`**

The listener subscribes to the `notifications` table filtered by `recipient_id=eq.<userId>` and invalidates two query keys on every INSERT. It also debounces invalidations at 250ms so a burst from a fan-out doesn't trigger N refetches.

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/query-keys';
import { useAuthStore } from '../../stores/auth-store';

export function NotificationListener() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    const scheduleInvalidate = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
        qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
      }, 250);
    };

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        scheduleInvalidate,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        scheduleInvalidate,
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return null;
}
```

- [ ] **Step 2: Mount the listener in `(app)/_layout.tsx`**

Replace `apps/mobile/app/(app)/_layout.tsx` with:

```typescript
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { NotificationListener } from '../../components/notifications/NotificationListener';
import { useAuthStore } from '../../stores/auth-store';

export default function AppLayout() {
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  return (
    <View className="flex-1">
      <NotificationListener />
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
    </View>
  );
}

void isAdmin;
```

The trailing `void isAdmin;` is a no-op that keeps the import live; Task 10 replaces the layout to actually expose an Admin entry.

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/components/notifications/NotificationListener.tsx apps/mobile/app/\(app\)/_layout.tsx
git commit -m "feat(mobile): mount NotificationListener realtime subscription at (app) layout"
```

---

## Phase C — Realtime subscription wiring for live UI updates

### Task 6: Generic `useRealtimeChannel` helper

**Files:**
- Create: `apps/mobile/hooks/use-realtime-channel.ts`

- [ ] **Step 1: Create the hook**

The hook accepts a channel name, a Postgres-changes config, and a list of query keys to invalidate (also debounced at 250ms). Returning nothing keeps it side-effect-only.

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface PostgresChangeConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
}

interface Params {
  channelName: string;
  enabled: boolean;
  configs: PostgresChangeConfig[];
  invalidateKeys: readonly (readonly unknown[])[];
  debounceMs?: number;
  onEvent?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

export function useRealtimeChannel({
  channelName,
  enabled,
  configs,
  invalidateKeys,
  debounceMs = 250,
  onEvent,
}: Params) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || configs.length === 0) return;
    const schedule = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      onEvent?.(payload);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        for (const k of invalidateKeys) {
          qc.invalidateQueries({ queryKey: k });
        }
      }, debounceMs);
    };

    let channel = supabase.channel(channelName);
    for (const cfg of configs) {
      channel = channel.on(
        'postgres_changes',
        {
          event: cfg.event,
          schema: cfg.schema ?? 'public',
          table: cfg.table,
          ...(cfg.filter ? { filter: cfg.filter } : {}),
        },
        schedule,
      );
    }
    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [channelName, enabled, JSON.stringify(configs), JSON.stringify(invalidateKeys), qc, debounceMs, onEvent]);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-realtime-channel.ts
git commit -m "feat(mobile): add generic useRealtimeChannel hook with debounced invalidation"
```

---

### Task 7: Live updates on the user's active matches

**Files:**
- Modify: `apps/mobile/hooks/use-active-matches.ts`
- Modify: `apps/mobile/hooks/use-match-detail.ts`

The goal: when the opposite player submits a score or confirms, the calling user's match view refetches automatically.

- [ ] **Step 1: Add a realtime hook variant alongside `useActiveMatches`**

Open `apps/mobile/hooks/use-active-matches.ts`. Append to the bottom (do NOT replace the existing export):

```typescript
import { useRealtimeChannel } from './use-realtime-channel';

export function useActiveMatchesRealtime() {
  const userId = useAuthStore((s) => s.user?.id);
  useRealtimeChannel({
    channelName: userId ? `matches:active:${userId}` : 'matches:active:none',
    enabled: !!userId,
    configs: [{ event: 'UPDATE', table: 'matches' }],
    invalidateKeys: [queryKeys.activeMatches.all],
  });
}
```

Note: the filter on `team_a_player_ids` / `team_b_player_ids` uses array containment which the Postgres-changes RLS filter syntax does not support. We subscribe to ALL matches UPDATEs and rely on the query key invalidation (the SELECT will only return the user's matches due to RLS) — chatty but correct. With 300 active players and a handful of in-flight matches at any moment, this is acceptable.

- [ ] **Step 2: Mount it in `matches.tsx`**

Open `apps/mobile/app/(app)/matches.tsx`. Add the import near the existing `useActiveMatches` import:

```typescript
import { useActiveMatches, useActiveMatchesRealtime } from '../../hooks/use-active-matches';
```

Inside `MatchesScreen()`, right after `const active = useActiveMatches();`, add:

```typescript
  useActiveMatchesRealtime();
```

- [ ] **Step 3: Add a realtime hook variant inside `use-match-detail.ts`**

Open `apps/mobile/hooks/use-match-detail.ts`. Append to the bottom:

```typescript
import { useRealtimeChannel } from './use-realtime-channel';

export function useMatchDetailRealtime(matchId: string | undefined) {
  useRealtimeChannel({
    channelName: matchId ? `match:detail:${matchId}` : 'match:detail:none',
    enabled: !!matchId,
    configs: [
      { event: 'UPDATE', table: 'matches', filter: matchId ? `id=eq.${matchId}` : undefined },
    ],
    invalidateKeys: matchId
      ? [queryKeys.activeMatches.detail(matchId), queryKeys.activeMatches.list()]
      : [],
  });
}
```

- [ ] **Step 4: Wire `useMatchDetailRealtime` inside the match detail screen**

Open `apps/mobile/app/match/[id].tsx`. Add the import:

```typescript
import { useMatchDetailRealtime } from '../../hooks/use-match-detail';
```

In the screen body next to `useMatchDetail(id)`, add:

```typescript
  useMatchDetailRealtime(id);
```

- [ ] **Step 5: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-active-matches.ts apps/mobile/hooks/use-match-detail.ts apps/mobile/app/\(app\)/matches.tsx apps/mobile/app/match/\[id\].tsx
git commit -m "feat(mobile): live-refresh active matches + match detail via realtime channel"
```

---

### Task 8: Realtime score submissions → mismatch refresh

**Files:**
- Modify: `apps/mobile/app/play/[matchId].tsx` (or the play-screen file that hosts MismatchBanner)

- [ ] **Step 1: Locate the play screen**

```bash
ls /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile/app/play/
```

Expected: `[matchId].tsx` and possibly `confirm/[matchId].tsx`. The mismatch banner lives on the score-entry screen `[matchId].tsx`.

- [ ] **Step 2: Add a realtime subscription that invalidates the match detail query when a new submission arrives**

Open `apps/mobile/app/play/[matchId].tsx`. Add the imports:

```typescript
import { useRealtimeChannel } from '../../hooks/use-realtime-channel';
import { queryKeys } from '../../lib/query-keys';
```

In the screen body (next to existing hook calls), add:

```typescript
  useRealtimeChannel({
    channelName: matchId ? `score-submissions:${matchId}` : 'score-submissions:none',
    enabled: !!matchId,
    configs: [
      { event: 'INSERT', table: 'match_score_submissions', filter: matchId ? `match_id=eq.${matchId}` : undefined },
    ],
    invalidateKeys: matchId
      ? [queryKeys.activeMatches.detail(matchId), queryKeys.activeMatches.list()]
      : [],
  });
```

Where `matchId` is the route param already resolved at the top of the screen (e.g., `const { matchId } = useLocalSearchParams<{ matchId: string }>()`). If the file uses a different variable name, adapt accordingly.

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/app/play/\[matchId\].tsx
git commit -m "feat(mobile): realtime refresh play screen on opposite-player score submission"
```

---

### Task 9: Realtime match requests feed

**Files:**
- Modify: `apps/mobile/hooks/use-match-requests.ts`

- [ ] **Step 1: Append a realtime hook**

Open `apps/mobile/hooks/use-match-requests.ts`. At the bottom of the file, append:

```typescript
import { useRealtimeChannel } from './use-realtime-channel';

export function useMatchRequestsRealtime() {
  const userId = useAuthStore((s) => s.user?.id);
  useRealtimeChannel({
    channelName: userId ? `match-requests:${userId}` : 'match-requests:none',
    enabled: !!userId,
    configs: [
      { event: 'INSERT', table: 'match_requests' },
      { event: 'UPDATE', table: 'match_requests' },
    ],
    invalidateKeys: [queryKeys.matchRequests.all],
  });
}
```

If `useAuthStore` and `queryKeys` are already imported at the top of the file, do not re-import. If they are NOT yet imported, add at the top:

```typescript
import { useAuthStore } from '../stores/auth-store';
import { queryKeys } from '../lib/query-keys';
```

- [ ] **Step 2: Wire `useMatchRequestsRealtime` into `matches.tsx`**

Open `apps/mobile/app/(app)/matches.tsx`. Update the existing match-requests import line:

```typescript
import {
  useIncomingMatchRequests,
  useMatchRequestsRealtime,
  useOutgoingMatchRequests,
  type MatchRequestRow,
} from '../../hooks/use-match-requests';
```

Inside the screen body next to `useActiveMatchesRealtime();`, add:

```typescript
  useMatchRequestsRealtime();
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-match-requests.ts apps/mobile/app/\(app\)/matches.tsx
git commit -m "feat(mobile): realtime refresh match requests feed on new/updated rows"
```

---

## Phase D — Admin role-based route guard + (admin) tab group

### Task 10: `(admin)` route group + hub + role gate

**Files:**
- Create: `apps/mobile/app/(admin)/_layout.tsx`
- Create: `apps/mobile/app/(admin)/index.tsx`
- Create: `apps/mobile/components/admin/AdminCard.tsx`

- [ ] **Step 1: Create `AdminCard.tsx`**

```typescript
import { Pressable, Text, View } from 'react-native';

interface Props {
  icon: string;
  label: string;
  onPress: () => void;
}

export function AdminCard({ icon, label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-lg border border-gray-200 bg-white p-4 active:opacity-80"
    >
      <Text className="mr-3 text-2xl">{icon}</Text>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900">{label}</Text>
      </View>
      <Text className="text-gray-400">›</Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Create `(admin)/_layout.tsx` — guards + Stack**

```typescript
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../stores/auth-store';

export default function AdminLayout() {
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  if (loading) return null;
  if (!profile || profile.role !== 'admin') {
    return <Redirect href="/" />;
  }
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Admin Paneli' }} />
      <Stack.Screen name="disputes" options={{ title: 'Bekleyen İtirazlar' }} />
      <Stack.Screen name="disputes/[id]" options={{ title: 'İtiraz' }} />
      <Stack.Screen name="seasons" options={{ title: 'Sezon Yönetimi' }} />
      <Stack.Screen name="tournaments" options={{ title: 'Bracket Yönetimi' }} />
      <Stack.Screen name="users" options={{ title: 'Kullanıcılar' }} />
      <Stack.Screen name="users/[userId]" options={{ title: 'Kullanıcı' }} />
      <Stack.Screen name="announcements" options={{ title: 'Duyurular' }} />
      <Stack.Screen name="announcements/new" options={{ title: 'Yeni Duyuru' }} />
      <Stack.Screen name="health" options={{ title: 'Sistem Sağlığı' }} />
    </Stack>
  );
}
```

- [ ] **Step 3: Create `(admin)/index.tsx` — 6-tile hub**

```typescript
import { router } from 'expo-router';
import { Text } from 'react-native';
import { AdminCard } from '../../components/admin/AdminCard';
import { ScreenContainer } from '../../components/ui/ScreenContainer';

export default function AdminHomeScreen() {
  return (
    <ScreenContainer scrollable>
      <Text className="mb-4 text-xs text-gray-500">
        Admin işlemlerin audit log'a kaydedilir.
      </Text>
      <AdminCard icon="⚠️" label="Bekleyen İtirazlar" onPress={() => router.push('/(admin)/disputes')} />
      <AdminCard icon="📅" label="Sezon Yönetimi" onPress={() => router.push('/(admin)/seasons')} />
      <AdminCard icon="🏆" label="Finale Bracket Yönetimi" onPress={() => router.push('/(admin)/tournaments')} />
      <AdminCard icon="👥" label="Kullanıcı Yönetimi" onPress={() => router.push('/(admin)/users')} />
      <AdminCard icon="📣" label="Topluluk Duyurusu" onPress={() => router.push('/(admin)/announcements')} />
      <AdminCard icon="📊" label="Sistem Sağlığı" onPress={() => router.push('/(admin)/health')} />
    </ScreenContainer>
  );
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/components/admin/AdminCard.tsx apps/mobile/app/\(admin\)
git commit -m "feat(mobile): add (admin) route group with role gate + 6-tile hub"
```

---

### Task 11: Initial admin seed migration

**Files:**
- Create: `packages/supabase/migrations/20260609000005_initial_admin_seed.sql`

- [ ] **Step 1: Write the migration**

The user will replace the placeholder email in a follow-up commit before pushing to staging/prod. The migration is idempotent (only updates if a profile with that email exists and is not already admin) so re-runs are harmless.

```sql
-- Initial admin seed.
--
-- Replace the placeholder email below with the operator's BÜ email or
-- personal email (admin accounts are exempt from the BÜ domain restriction
-- per spec 7.1) before deploying to staging or production.
--
-- Re-running this migration is safe: it only flips the role to 'admin'
-- if a profile with the target email exists and is currently 'player'.
--
-- The first time the operator signs up, this migration will be a no-op
-- (no profile yet). After the operator finishes onboarding, run:
--   supabase db push
-- or rerun this migration via `supabase migration up` on the staging branch
-- to flip the role.

do $$
declare
  target_email text := 'CHANGE_ME_BEFORE_DEPLOY@example.com';
begin
  if target_email = 'CHANGE_ME_BEFORE_DEPLOY@example.com' then
    raise notice 'initial-admin-seed: placeholder email not replaced, skipping';
    return;
  end if;

  update public.profiles
     set role = 'admin'
   where email = target_email
     and role <> 'admin';

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  select user_id, 'grant_admin_via_seed', 'profile', user_id, jsonb_build_object('email', target_email)
    from public.profiles
   where email = target_email
     and role = 'admin';
end
$$;
```

- [ ] **Step 2: Verify the migration parses (no apply needed yet)**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select 1;"
supabase stop
```

Expected: `supabase db reset` succeeds (the migration is parsed and emits the `notice` because the placeholder is still in place).

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/migrations/20260609000005_initial_admin_seed.sql
git commit -m "feat(supabase): add initial admin seed migration placeholder"
```

---

## Phase E — Admin Panel: Bekleyen İtirazlar + Sezon Yönetimi

### Task 12: Bekleyen İtirazlar (list + detail)

**Files:**
- Create: `apps/mobile/hooks/use-pending-disputes.ts`
- Create: `apps/mobile/hooks/use-dispute-detail.ts`
- Create: `apps/mobile/hooks/use-resolve-dispute.ts`
- Create: `apps/mobile/components/admin/DisputeRow.tsx`
- Create: `apps/mobile/app/(admin)/disputes.tsx`
- Create: `apps/mobile/app/(admin)/disputes/[id].tsx`

- [ ] **Step 1: Create `use-pending-disputes.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface PendingDispute {
  id: string;
  match_id: string;
  raised_by: string;
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
  raised_by_name: string;
  match_played_at: string;
  match_category: string;
}

interface Raw {
  id: string;
  match_id: string;
  raised_by: string;
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
  raised_by_profile: { first_name: string; last_name: string } | null;
  match: { played_at: string; category: string } | null;
}

export function usePendingDisputes() {
  return useQuery<PendingDispute[]>({
    queryKey: queryKeys.admin.pendingDisputes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          id, match_id, raised_by, reason, status, created_at,
          raised_by_profile:profiles!disputes_raised_by_fkey(first_name, last_name),
          match:matches(played_at, category)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Raw[]).map((r) => ({
        id: r.id,
        match_id: r.match_id,
        raised_by: r.raised_by,
        reason: r.reason,
        status: r.status,
        created_at: r.created_at,
        raised_by_name: r.raised_by_profile
          ? `${r.raised_by_profile.first_name} ${r.raised_by_profile.last_name}`
          : 'Bilinmeyen',
        match_played_at: r.match?.played_at ?? r.created_at,
        match_category: r.match?.category ?? '',
      }));
    },
  });
}
```

- [ ] **Step 2: Create `use-dispute-detail.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface DisputeDetail {
  id: string;
  match_id: string;
  reason: string;
  status: 'open' | 'resolved';
  resolution_notes: string | null;
  resolved_at: string | null;
  match: {
    id: string;
    category: string;
    format: string;
    played_at: string;
    team_a_player_ids: string[];
    team_b_player_ids: string[];
    score_team_a: number;
    score_team_b: number;
    score_details: unknown;
    winner_team: 'a' | 'b' | 'void' | null;
  };
  submissions: Array<{
    submitted_by: string;
    submitted_by_name: string;
    score_details: unknown;
    submitted_at: string;
  }>;
}

interface RawSub {
  submitted_by: string;
  score_details: unknown;
  submitted_at: string;
  submitter: { first_name: string; last_name: string } | null;
}

export function useDisputeDetail(disputeId: string | undefined) {
  return useQuery<DisputeDetail | null>({
    queryKey: disputeId ? queryKeys.admin.disputeDetail(disputeId) : queryKeys.admin.all,
    enabled: !!disputeId,
    queryFn: async () => {
      if (!disputeId) return null;
      const { data: d, error } = await supabase
        .from('disputes')
        .select(`
          id, match_id, reason, status, resolution_notes, resolved_at,
          match:matches(
            id, category, format, played_at, team_a_player_ids, team_b_player_ids,
            score_team_a, score_team_b, score_details, winner_team
          )
        `)
        .eq('id', disputeId)
        .single();
      if (error) throw error;
      if (!d) return null;

      const { data: subs } = await supabase
        .from('match_score_submissions')
        .select(`
          submitted_by, score_details, submitted_at,
          submitter:profiles!match_score_submissions_submitted_by_fkey(first_name, last_name)
        `)
        .eq('match_id', d.match_id)
        .order('submitted_at', { ascending: true });

      const submissions = ((subs ?? []) as unknown as RawSub[]).map((s) => ({
        submitted_by: s.submitted_by,
        score_details: s.score_details,
        submitted_at: s.submitted_at,
        submitted_by_name: s.submitter
          ? `${s.submitter.first_name} ${s.submitter.last_name}`
          : 'Bilinmeyen',
      }));

      return {
        id: d.id,
        match_id: d.match_id,
        reason: d.reason,
        status: d.status,
        resolution_notes: d.resolution_notes,
        resolved_at: d.resolved_at,
        match: d.match as DisputeDetail['match'],
        submissions,
      };
    },
  });
}
```

- [ ] **Step 3: Create `use-resolve-dispute.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export type DisputeOutcome = 'approve_a' | 'approve_b' | 'void' | 'replay';

export function useResolveDispute() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.session?.access_token);
  return useMutation({
    mutationFn: async (input: { disputeId: string; outcome: DisputeOutcome; notes?: string }) => {
      if (!accessToken) throw new Error('not authenticated');
      return invokeFunction('resolve-dispute', input, accessToken);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.pendingDisputes() });
      qc.invalidateQueries({ queryKey: queryKeys.admin.disputeDetail(variables.disputeId) });
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
    },
  });
}
```

- [ ] **Step 4: Create `DisputeRow.tsx`**

```typescript
import { Pressable, Text, View } from 'react-native';
import type { PendingDispute } from '../../hooks/use-pending-disputes';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

interface Props {
  dispute: PendingDispute;
  onPress: () => void;
}

export function DisputeRow({ dispute, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 rounded-lg border border-amber-300 bg-amber-50 p-3"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-amber-900">
          {dispute.raised_by_name} itiraz açtı
        </Text>
        <Text className="text-[10px] text-amber-800">
          {new Date(dispute.created_at).toLocaleDateString('tr-TR')}
        </Text>
      </View>
      <Text className="mt-1 text-xs text-amber-800">
        {CATEGORY_LABELS[dispute.match_category] ?? dispute.match_category}
      </Text>
      <Text className="mt-1 text-xs text-amber-900" numberOfLines={2}>
        {dispute.reason}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 5: Create `apps/mobile/app/(admin)/disputes.tsx`**

```typescript
import { router } from 'expo-router';
import { FlatList, RefreshControl, Text } from 'react-native';
import { DisputeRow } from '../../components/admin/DisputeRow';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { usePendingDisputes } from '../../hooks/use-pending-disputes';
import { useRealtimeChannel } from '../../hooks/use-realtime-channel';
import { queryKeys } from '../../lib/query-keys';

export default function AdminDisputesScreen() {
  const list = usePendingDisputes();
  useRealtimeChannel({
    channelName: 'admin:disputes',
    enabled: true,
    configs: [
      { event: 'INSERT', table: 'disputes' },
      { event: 'UPDATE', table: 'disputes' },
    ],
    invalidateKeys: [queryKeys.admin.pendingDisputes()],
  });

  return (
    <ScreenContainer>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DisputeRow dispute={item} onPress={() => router.push(`/(admin)/disputes/${item.id}`)} />
        )}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />
        }
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-500">
            Açık itiraz yok.
          </Text>
        }
      />
    </ScreenContainer>
  );
}
```

- [ ] **Step 6: Create `apps/mobile/app/(admin)/disputes/[id].tsx`**

```typescript
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { useDisputeDetail } from '../../../hooks/use-dispute-detail';
import { useResolveDispute, type DisputeOutcome } from '../../../hooks/use-resolve-dispute';

export default function DisputeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useDisputeDetail(id);
  const resolve = useResolveDispute();

  if (detail.isLoading) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }
  const d = detail.data;
  if (!d) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">İtiraz bulunamadı.</Text>
      </ScreenContainer>
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
              onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'İşlem başarısız'),
            },
          );
        },
      },
    ]);
  };

  return (
    <ScreenContainer scrollable>
      <Text className="text-base font-semibold text-gray-900">İtiraz gerekçesi</Text>
      <Text className="mt-1 mb-4 text-sm text-gray-700">{d.reason}</Text>

      <Text className="mb-2 text-base font-semibold text-gray-900">Maç özeti</Text>
      <View className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
        <Text className="text-xs text-gray-600">Kategori: {d.match.category}</Text>
        <Text className="text-xs text-gray-600">Format: {d.match.format}</Text>
        <Text className="mt-1 text-sm font-semibold text-gray-900">
          Skor: {d.match.score_team_a} - {d.match.score_team_b}
        </Text>
        <Text className="mt-1 text-xs text-gray-600">
          Kazanan: {d.match.winner_team ?? 'belirsiz'}
        </Text>
      </View>

      <Text className="mb-2 text-base font-semibold text-gray-900">Submissions</Text>
      {d.submissions.length === 0 ? (
        <Text className="mb-4 text-xs text-gray-500">Submission yok.</Text>
      ) : (
        d.submissions.map((s) => (
          <View key={`${s.submitted_by}-${s.submitted_at}`} className="mb-2 rounded-lg border border-gray-200 bg-white p-3">
            <Text className="text-xs font-semibold text-gray-900">{s.submitted_by_name}</Text>
            <Text className="mt-1 text-[10px] text-gray-500">
              {new Date(s.submitted_at).toLocaleString('tr-TR')}
            </Text>
            <Text className="mt-1 text-[10px] text-gray-700">{JSON.stringify(s.score_details)}</Text>
          </View>
        ))
      )}

      <View className="mt-4 gap-2">
        <Button onPress={() => submit('approve_a', 'Skor A')}>A lehine onayla</Button>
        <Button onPress={() => submit('approve_b', 'Skor B')} variant="secondary">
          B lehine onayla
        </Button>
        <Button onPress={() => submit('void', 'Voided')} variant="ghost">
          Maç voided
        </Button>
        <Button onPress={() => submit('replay', 'Tekrar oynat')} variant="ghost">
          Tekrar oynat
        </Button>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 7: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-pending-disputes.ts apps/mobile/hooks/use-dispute-detail.ts apps/mobile/hooks/use-resolve-dispute.ts apps/mobile/components/admin/DisputeRow.tsx apps/mobile/app/\(admin\)/disputes.tsx apps/mobile/app/\(admin\)/disputes
git commit -m "feat(mobile): admin Bekleyen İtirazlar list + detail with resolve-dispute mutation"
```

---

### Task 13: Sezon Yönetimi screen

**Files:**
- Create: `apps/mobile/hooks/use-admin-seasons.ts`
- Create: `apps/mobile/app/(admin)/seasons.tsx`

- [ ] **Step 1: Create `use-admin-seasons.ts`**

The hook returns the full list of seasons + per-season tournament readiness signals. It also exposes two mutations that call `start-season-finale` and `close-season` Edge Functions.

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export type SeasonStatus = 'upcoming' | 'active' | 'finale' | 'closed';
export type SeasonName = 'guz' | 'bahar' | 'yaz';

export interface AdminSeason {
  id: string;
  name: SeasonName;
  year: number;
  starts_at: string;
  ends_at: string;
  finale_starts_at: string;
  finale_ends_at: string;
  status: SeasonStatus;
  tournament_count: number;
}

export function useAdminSeasons() {
  return useQuery<AdminSeason[]>({
    queryKey: queryKeys.admin.seasons(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, year, starts_at, ends_at, finale_starts_at, finale_ends_at, status')
        .order('starts_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Omit<AdminSeason, 'tournament_count'>[];

      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return [];
      const { data: tourneys } = await supabase
        .from('tournaments')
        .select('season_id')
        .in('season_id', ids);
      const counts = new Map<string, number>();
      for (const t of tourneys ?? []) {
        counts.set(t.season_id, (counts.get(t.season_id) ?? 0) + 1);
      }
      return rows.map((r) => ({ ...r, tournament_count: counts.get(r.id) ?? 0 }));
    },
  });
}

export function useStartSeasonFinale() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.session?.access_token);
  return useMutation({
    mutationFn: async (seasonId: string) => {
      if (!accessToken) throw new Error('not authenticated');
      return invokeFunction('start-season-finale', { seasonId }, accessToken);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.seasons() });
      qc.invalidateQueries({ queryKey: queryKeys.seasons.all });
    },
  });
}

export function useCloseSeason() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.session?.access_token);
  return useMutation({
    mutationFn: async (seasonId: string) => {
      if (!accessToken) throw new Error('not authenticated');
      return invokeFunction('close-season', { seasonId }, accessToken);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.seasons() });
      qc.invalidateQueries({ queryKey: queryKeys.seasons.all });
    },
  });
}
```

- [ ] **Step 2: Create the screen**

```typescript
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { seasonDisplayName } from '@tennis/shared';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import {
  useAdminSeasons,
  useCloseSeason,
  useStartSeasonFinale,
  type AdminSeason,
} from '../../hooks/use-admin-seasons';

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
              onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Başlatılamadı'),
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
              onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Kapatılamadı'),
            }),
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mb-3 rounded-lg border border-gray-200 bg-white p-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900">
                {seasonDisplayName(item.name)} {item.year}
              </Text>
              <Text className="text-xs text-gray-500">{item.status}</Text>
            </View>
            <Text className="mt-1 text-[10px] text-gray-500">
              {new Date(item.starts_at).toLocaleDateString('tr-TR')} →{' '}
              {new Date(item.ends_at).toLocaleDateString('tr-TR')}
            </Text>
            <Text className="mt-1 text-[10px] text-gray-500">
              Finale: {new Date(item.finale_starts_at).toLocaleDateString('tr-TR')} →{' '}
              {new Date(item.finale_ends_at).toLocaleDateString('tr-TR')} · Turnuva: {item.tournament_count}
            </Text>
            <View className="mt-3 gap-2">
              {item.status === 'active' || item.status === 'finale' ? (
                <Button onPress={() => handleStart(item)} variant="secondary">
                  Finale başlat
                </Button>
              ) : null}
              {item.status === 'finale' ? (
                <Button onPress={() => handleClose(item)} variant="ghost">
                  Sezonu kapat
                </Button>
              ) : null}
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />
        }
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-500">Sezon kaydı yok.</Text>
        }
      />
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-admin-seasons.ts apps/mobile/app/\(admin\)/seasons.tsx
git commit -m "feat(mobile): admin Sezon Yönetimi screen with start-finale + close-season actions"
```

---

## Phase F — Admin Panel: Finale Bracket Yönetimi + Kullanıcı Yönetimi

### Task 14: Finale Bracket Yönetimi screen

**Files:**
- Create: `apps/mobile/hooks/use-admin-tournaments.ts`
- Create: `apps/mobile/app/(admin)/tournaments.tsx`

- [ ] **Step 1: Create `use-admin-tournaments.ts`**

The hook lists tournaments in the current season (or finale) and exposes a `useVoidBracketMatch` mutation that flips a `matches.status` to `voided` and writes an audit row via the `resolve-dispute` Edge Function (which already supports the `void` outcome). For bracket slots that have NO match row yet, we don't expose an action (admin can do nothing useful before the players generate a match).

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useCurrentSeason } from './use-current-season';

export interface AdminTournamentRow {
  id: string;
  category: string;
  bracket_size: number;
  status: 'seeded' | 'in_progress' | 'completed';
}

export function useAdminTournaments() {
  const season = useCurrentSeason();
  const seasonId = season.data?.id;
  return useQuery<AdminTournamentRow[]>({
    queryKey: seasonId ? queryKeys.admin.tournaments(seasonId) : queryKeys.admin.all,
    enabled: !!seasonId,
    queryFn: async () => {
      if (!seasonId) return [];
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, category, bracket_size, status')
        .eq('season_id', seasonId)
        .order('category', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown) as AdminTournamentRow[];
    },
  });
}

export function useVoidBracketMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; reason: string }) => {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'voided', voided_reason: input.reason })
        .eq('id', input.matchId);
      if (error) throw error;
      await supabase.from('audit_log').insert({
        action: 'void_bracket_match',
        entity_type: 'match',
        entity_id: input.matchId,
        details: { reason: input.reason },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tournaments.all });
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
```

- [ ] **Step 2: Create `apps/mobile/app/(admin)/tournaments.tsx`**

The screen reuses Plan 6 Faz E's `useTournamentBracket(id)` hook + `BracketView` component. We render a category selector that switches between tournaments inside the current season.

```typescript
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { BracketView } from '../../components/seasons/BracketView';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAdminTournaments, useVoidBracketMatch } from '../../hooks/use-admin-tournaments';
import { useTournamentBracket } from '../../hooks/use-tournament-bracket';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export default function AdminTournamentsScreen() {
  const list = useAdminTournaments();
  const [activeId, setActiveId] = useState<string | null>(null);
  const selected = activeId ?? list.data?.[0]?.id ?? null;
  const bracket = useTournamentBracket(selected ?? undefined);
  const voidMatch = useVoidBracketMatch();

  const handleVoid = (matchId: string | null) => {
    if (!matchId) return;
    Alert.alert(
      'Maçı voided yap',
      'Bu bracket maçı void edilecek ve advance pipeline durdurulacak. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Void et',
          style: 'destructive',
          onPress: () =>
            voidMatch.mutate(
              { matchId, reason: 'Admin tarafından bracket maçı voided' },
              {
                onError: (e) =>
                  Alert.alert('Hata', e instanceof Error ? e.message : 'Voided edilemedi'),
              },
            ),
        },
      ],
    );
  };

  if (list.isLoading) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }
  if ((list.data ?? []).length === 0) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Aktif turnuva yok.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {(list.data ?? []).map((t) => {
          const isActive = t.id === selected;
          return (
            <Pressable
              key={t.id}
              onPress={() => setActiveId(t.id)}
              className={`mr-2 rounded-full px-3 py-1 ${isActive ? 'bg-primary' : 'bg-gray-100'}`}
            >
              <Text className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-700'}`}>
                {CATEGORY_LABELS[t.category] ?? t.category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {bracket.data ? (
        <>
          <BracketView bracketSize={bracket.data.bracket_size} slots={bracket.data.slots} />
          <Text className="mt-4 mb-2 text-xs font-semibold text-gray-700">Admin aksiyonları</Text>
          <View className="gap-2">
            {bracket.data.slots
              .filter((s) => s.match_id !== null && s.match_status !== 'voided')
              .map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => handleVoid(s.match_id)}
                  className="rounded-lg border border-red-300 bg-red-50 p-2"
                >
                  <Text className="text-xs text-red-900">
                    Tur {s.round} pos {s.bracket_position}: {s.player_a_name ?? '—'} vs{' '}
                    {s.player_b_name ?? '—'} → voided yap
                  </Text>
                </Pressable>
              ))}
          </View>
        </>
      ) : (
        <Text className="text-sm text-gray-500">Bracket yükleniyor...</Text>
      )}
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-admin-tournaments.ts apps/mobile/app/\(admin\)/tournaments.tsx
git commit -m "feat(mobile): admin Finale Bracket Yönetimi screen with void-match action"
```

---

### Task 15: Kullanıcı Yönetimi screen + `admin-update-profile` Edge Function

**Files:**
- Create: `packages/supabase/functions/admin-update-profile/index.ts`
- Create: `packages/supabase/tests/functions/admin-update-profile.deno-test.ts`
- Create: `apps/mobile/hooks/use-admin-users.ts`
- Create: `apps/mobile/hooks/use-admin-user-detail.ts`
- Create: `apps/mobile/hooks/use-admin-update-profile.ts`
- Create: `apps/mobile/components/admin/UserRow.tsx`
- Create: `apps/mobile/app/(admin)/users.tsx`
- Create: `apps/mobile/app/(admin)/users/[userId].tsx`

- [ ] **Step 1: Create `admin-update-profile/index.ts`**

The function updates `role` (`player` / `admin`) and/or `status` (`active` / `suspended` / `banned`) and writes an audit row. The current data model uses `status` enum values `'active' | 'frozen_30' | 'hibernating_60' | 'inactive_90' | 'anonymized'`. We extend the application semantics: `suspended` and `banned` are stored as `status='suspended'` and `status='banned'`. To support this, we use a string column — verify the existing column type before extending the enum. If the column is the original `profile_status` enum, the function MUST be updated AFTER a migration that extends the enum. For now, write the function defensively and document the dependency.

NOTE: The status update in this MVP step is best-effort. If the DB rejects unknown enum values, the function returns 422 and the UI shows an error. A follow-up migration `20260610000001_extend_profile_status.sql` will add `'suspended'` and `'banned'` enum values — this is left to a follow-up commit, NOT part of this plan; the role update path works regardless.

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  targetUserId: z.string().uuid(),
  role: z.enum(['player', 'admin']).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  notes: z.string().max(500).optional(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const input = parsed.data;
    if (input.role === undefined && input.status === undefined) {
      return errorResponse('Provide at least one of role or status', 400);
    }
    if (input.targetUserId === auth.userId && input.role === 'player') {
      return errorResponse('Admin cannot demote self', 409);
    }

    const patch: Record<string, unknown> = {};
    if (input.role !== undefined) patch.role = input.role;
    if (input.status !== undefined) patch.status = input.status;

    const { data: updated, error } = await supa
      .from('profiles')
      .update(patch)
      .eq('user_id', input.targetUserId)
      .select('user_id, role, status')
      .single();
    if (error) {
      return errorResponse(error.message, 422, error);
    }
    if (!updated) return errorResponse('Profile not found', 404);

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'admin_update_profile',
      entity_type: 'profile',
      entity_id: input.targetUserId,
      details: { patch, notes: input.notes ?? null },
    });

    return jsonResponse({
      userId: updated.user_id,
      role: updated.role,
      status: updated.status,
    });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] **Step 2: Create `admin-update-profile.deno-test.ts`**

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('admin-update-profile: promotes player to admin', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

  const { status, body } = await invokeFunction(
    'admin-update-profile',
    { targetUserId: alice.userId, role: 'admin', notes: 'co-admin' },
    admin.accessToken,
  );
  assertEquals(status, 200);
  const result = body as { role: string };
  assertEquals(result.role, 'admin');

  const supa = adminClient();
  const { data: prof } = await supa.from('profiles').select('role').eq('user_id', alice.userId).single();
  assertEquals(prof!.role, 'admin');

  const { data: audit } = await supa
    .from('audit_log')
    .select('action, entity_id')
    .eq('action', 'admin_update_profile')
    .eq('entity_id', alice.userId)
    .single();
  assertEquals(audit!.action, 'admin_update_profile');
});

Deno.test('admin-update-profile: non-admin forbidden', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });

  const { status } = await invokeFunction(
    'admin-update-profile',
    { targetUserId: bob.userId, role: 'admin' },
    alice.accessToken,
  );
  assertEquals(status, 403);
});

Deno.test('admin-update-profile: admin cannot demote self', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });

  const { status } = await invokeFunction(
    'admin-update-profile',
    { targetUserId: admin.userId, role: 'player' },
    admin.accessToken,
  );
  assertEquals(status, 409);
});
```

- [ ] **Step 3: Create the mobile hooks**

`apps/mobile/hooks/use-admin-users.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface AdminUserRow {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: 'player' | 'admin';
  status: string | null;
}

export function useAdminUsers(search: string | null) {
  return useQuery<AdminUserRow[]>({
    queryKey: queryKeys.admin.users(search),
    queryFn: async () => {
      let q = supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, role, status')
        .order('first_name', { ascending: true })
        .limit(50);
      if (search && search.length > 0) {
        const pattern = `%${search}%`;
        q = q.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as unknown) as AdminUserRow[];
    },
  });
}
```

`apps/mobile/hooks/use-admin-user-detail.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface AdminUserDetail {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: 'player' | 'admin';
  status: string | null;
  gender_category: string | null;
  last_match_at: string | null;
  created_at: string;
}

export function useAdminUserDetail(userId: string | undefined) {
  return useQuery<AdminUserDetail | null>({
    queryKey: userId ? queryKeys.admin.userDetail(userId) : queryKeys.admin.all,
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone, role, status, gender_category, last_match_at, created_at')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return (data ?? null) as AdminUserDetail | null;
    },
  });
}
```

`apps/mobile/hooks/use-admin-update-profile.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface AdminUpdateProfileInput {
  targetUserId: string;
  role?: 'player' | 'admin';
  status?: 'active' | 'suspended' | 'banned';
  notes?: string;
}

export function useAdminUpdateProfile() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.session?.access_token);
  return useMutation({
    mutationFn: async (input: AdminUpdateProfileInput) => {
      if (!accessToken) throw new Error('not authenticated');
      return invokeFunction('admin-update-profile', input, accessToken);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.userDetail(variables.targetUserId) });
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
```

- [ ] **Step 4: Create `UserRow.tsx`**

```typescript
import { Pressable, Text, View } from 'react-native';
import type { AdminUserRow } from '../../hooks/use-admin-users';

interface Props {
  user: AdminUserRow;
  onPress: () => void;
}

export function UserRow({ user, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900">
          {user.first_name} {user.last_name}
        </Text>
        <Text className="text-[10px] text-gray-500">{user.email ?? '—'}</Text>
      </View>
      <View>
        {user.role === 'admin' ? (
          <Text className="text-[10px] font-bold text-amber-700">ADMIN</Text>
        ) : null}
        {user.status && user.status !== 'active' ? (
          <Text className="text-[10px] text-gray-500">{user.status}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 5: Create `apps/mobile/app/(admin)/users.tsx`**

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { UserRow } from '../../components/admin/UserRow';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { useAdminUsers } from '../../hooks/use-admin-users';

export default function AdminUsersScreen() {
  const [search, setSearch] = useState('');
  const list = useAdminUsers(search.trim().length > 0 ? search.trim() : null);

  return (
    <ScreenContainer>
      <View className="mb-3">
        <TextField placeholder="Ad, soyad, email ile ara" value={search} onChangeText={setSearch} />
      </View>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => (
          <UserRow user={item} onPress={() => router.push(`/(admin)/users/${item.user_id}`)} />
        )}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />
        }
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-500">Kullanıcı bulunamadı.</Text>
        }
      />
    </ScreenContainer>
  );
}
```

- [ ] **Step 6: Create `apps/mobile/app/(admin)/users/[userId].tsx`**

```typescript
import { useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { useAdminUpdateProfile } from '../../../hooks/use-admin-update-profile';
import { useAdminUserDetail } from '../../../hooks/use-admin-user-detail';

export default function AdminUserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const detail = useAdminUserDetail(userId);
  const update = useAdminUpdateProfile();

  if (detail.isLoading) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }
  const u = detail.data;
  if (!u) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Kullanıcı bulunamadı.</Text>
      </ScreenContainer>
    );
  }

  const apply = (
    label: string,
    patch: { role?: 'player' | 'admin'; status?: 'active' | 'suspended' | 'banned' },
  ) => {
    Alert.alert(`${label} uygulanacak`, 'Devam etmek istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Uygula',
        onPress: () =>
          update.mutate(
            { targetUserId: u.user_id, ...patch },
            {
              onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Başarısız'),
            },
          ),
      },
    ]);
  };

  return (
    <ScreenContainer scrollable>
      <View className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
        <Text className="text-base font-semibold text-gray-900">
          {u.first_name} {u.last_name}
        </Text>
        <Text className="mt-1 text-xs text-gray-500">Email: {u.email ?? '—'}</Text>
        <Text className="text-xs text-gray-500">Telefon: {u.phone ?? '—'}</Text>
        <Text className="mt-1 text-xs text-gray-500">Rol: {u.role}</Text>
        <Text className="text-xs text-gray-500">Durum: {u.status ?? '—'}</Text>
        <Text className="mt-1 text-[10px] text-gray-400">
          Kategori: {u.gender_category ?? '—'} · Son maç: {u.last_match_at ?? '—'}
        </Text>
      </View>

      <Text className="mb-2 text-xs font-semibold text-gray-700">Aksiyonlar</Text>
      <View className="gap-2">
        {u.status !== 'suspended' ? (
          <Button onPress={() => apply('Askıya al', { status: 'suspended' })} variant="secondary">
            Askıya al
          </Button>
        ) : null}
        {u.status !== 'banned' ? (
          <Button onPress={() => apply('Banla', { status: 'banned' })} variant="ghost">
            Banla
          </Button>
        ) : null}
        {u.status !== 'active' ? (
          <Button onPress={() => apply('Geri aktif et', { status: 'active' })} variant="secondary">
            Geri aktif et
          </Button>
        ) : null}
        {u.role === 'player' ? (
          <Button onPress={() => apply('Admin ata', { role: 'admin' })}>Admin ata</Button>
        ) : (
          <Button onPress={() => apply('Admin yetkisini al', { role: 'player' })} variant="ghost">
            Admin yetkisini al
          </Button>
        )}
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 7: Run the deno test for the new Edge Function**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
supabase functions serve --no-verify-jwt &
sleep 5
ANON_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['ANON_KEY'])")
SERVICE_ROLE_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")
SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
  deno test --allow-env --allow-net tests/functions/admin-update-profile.deno-test.ts
pkill -f "supabase functions serve" || true
supabase stop
```

Expected: 3 tests pass.

- [ ] **Step 8: Typecheck mobile + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/functions/admin-update-profile packages/supabase/tests/functions/admin-update-profile.deno-test.ts apps/mobile/hooks/use-admin-users.ts apps/mobile/hooks/use-admin-user-detail.ts apps/mobile/hooks/use-admin-update-profile.ts apps/mobile/components/admin/UserRow.tsx apps/mobile/app/\(admin\)/users.tsx apps/mobile/app/\(admin\)/users
git commit -m "feat(supabase,mobile): add admin-update-profile Edge Function + Kullanıcı Yönetimi screens"
```

---

## Phase G — Admin Panel: Topluluk Duyurusu + Sistem Sağlığı + Audit log

### Task 16: Topluluk Duyurusu + `publish-announcement` Edge Function

**Files:**
- Create: `packages/supabase/functions/publish-announcement/index.ts`
- Create: `packages/supabase/tests/functions/publish-announcement.deno-test.ts`
- Create: `apps/mobile/hooks/use-admin-announcements.ts`
- Create: `apps/mobile/hooks/use-publish-announcement.ts`
- Create: `apps/mobile/components/admin/AnnouncementCard.tsx`
- Create: `apps/mobile/app/(admin)/announcements.tsx`
- Create: `apps/mobile/app/(admin)/announcements/new.tsx`

- [ ] **Step 1: Create `publish-announcement/index.ts`**

The function:
1. Inserts a row in `announcements` (admin only)
2. Selects target recipients per `target_filter` (MVP: empty filter = all active players)
3. Inserts one `notifications` row per recipient with `category='community_announcements'`
4. Optionally calls `send-push-notification` per recipient (Expo fan-out)
5. Writes a single audit row

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';
import { sendToExpo, type ExpoPushMessage } from '../_shared/expo-push.ts';

const inputSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  targetFilter: z.object({
    genderCategory: z.enum(['erkek', 'kadin', 'open_only']).optional(),
    onlyActive: z.boolean().optional(),
  }).optional(),
  sendPush: z.boolean().optional(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
    const input = parsed.data;
    const filter = input.targetFilter ?? {};

    const { data: announcement, error: insertErr } = await supa
      .from('announcements')
      .insert({
        created_by: auth.userId,
        title: input.title,
        body: input.body,
        target_filter: filter,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (insertErr || !announcement) return errorResponse(insertErr?.message ?? 'Insert failed', 500);

    let recipientsQuery = supa.from('profiles').select('user_id');
    if (filter.genderCategory) {
      recipientsQuery = recipientsQuery.eq('gender_category', filter.genderCategory);
    }
    if (filter.onlyActive) {
      recipientsQuery = recipientsQuery.eq('status', 'active');
    }
    const { data: recipients, error: recipErr } = await recipientsQuery;
    if (recipErr) return errorResponse(recipErr.message, 500);

    const ids = (recipients ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      return jsonResponse({ announcementId: announcement.id, recipientCount: 0, pushed: 0 });
    }

    const rows = ids.map((id) => ({
      recipient_id: id,
      category: 'community_announcements' as const,
      title: input.title,
      body: input.body,
      data: { announcementId: announcement.id },
    }));
    await supa.from('notifications').insert(rows);

    let pushed = 0;
    if (input.sendPush) {
      const { data: tokens } = await supa
        .from('push_tokens')
        .select('token, profile_id')
        .in('profile_id', ids);
      const { data: prefs } = await supa
        .from('notification_preferences')
        .select('profile_id, enabled')
        .eq('category', 'community_announcements')
        .in('profile_id', ids);
      const disabled = new Set(
        (prefs ?? []).filter((p) => p.enabled === false).map((p) => p.profile_id),
      );
      const messages: ExpoPushMessage[] = (tokens ?? [])
        .filter((t) => !disabled.has(t.profile_id))
        .map((t) => ({
          to: t.token,
          title: input.title,
          body: input.body,
          data: { announcementId: announcement.id },
        }));
      if (messages.length > 0) {
        try {
          await sendToExpo(messages);
          pushed = messages.length;
        } catch (pushErr) {
          console.error('publish-announcement push fanout failed', pushErr);
        }
      }
    }

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'publish_announcement',
      entity_type: 'announcement',
      entity_id: announcement.id,
      details: { recipientCount: ids.length, pushed, sendPush: input.sendPush ?? false },
    });

    return jsonResponse({
      announcementId: announcement.id,
      recipientCount: ids.length,
      pushed,
    });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] **Step 2: Create `publish-announcement.deno-test.ts`**

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('publish-announcement: inserts row + fans out notifications', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'kadin' });

  const { status, body } = await invokeFunction(
    'publish-announcement',
    {
      title: 'Saha temizliği duyurusu',
      body: 'Yarın Kort 1 boyacılarda olacak.',
      targetFilter: {},
      sendPush: false,
    },
    admin.accessToken,
  );
  assertEquals(status, 200);
  const result = body as { announcementId: string; recipientCount: number };

  const supa = adminClient();
  const { data: notifs } = await supa
    .from('notifications')
    .select('recipient_id, category, title')
    .eq('category', 'community_announcements');
  const recipientSet = new Set((notifs ?? []).map((n) => n.recipient_id));
  // admin + alice + bob = 3 profiles in DB
  assertEquals(recipientSet.size, 3);
  assertEquals(result.recipientCount, 3);
  // sanity: title propagated
  assertEquals(notifs![0].title, 'Saha temizliği duyurusu');
});

Deno.test('publish-announcement: filter by genderCategory', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  await createTestUser({ email: 'alice@test.local', genderCategory: 'kadin' });
  await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });

  const { body } = await invokeFunction(
    'publish-announcement',
    {
      title: 'Kadın tek turnuvası',
      body: 'Başvurular açıldı.',
      targetFilter: { genderCategory: 'kadin' },
      sendPush: false,
    },
    admin.accessToken,
  );
  const result = body as { recipientCount: number };
  assertEquals(result.recipientCount, 1);
  void admin;
});

Deno.test('publish-announcement: non-admin forbidden', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

  const { status } = await invokeFunction(
    'publish-announcement',
    { title: 't', body: 'b', targetFilter: {}, sendPush: false },
    alice.accessToken,
  );
  assertEquals(status, 403);
});
```

- [ ] **Step 3: Run the deno test**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
supabase functions serve --no-verify-jwt &
sleep 5
ANON_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['ANON_KEY'])")
SERVICE_ROLE_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")
SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
  deno test --allow-env --allow-net tests/functions/publish-announcement.deno-test.ts
pkill -f "supabase functions serve" || true
supabase stop
```

Expected: 3 tests pass.

- [ ] **Step 4: Create the mobile hooks**

`apps/mobile/hooks/use-admin-announcements.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface PublishedAnnouncement {
  id: string;
  title: string;
  body: string;
  target_filter: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
}

export function useAdminAnnouncements() {
  return useQuery<PublishedAnnouncement[]>({
    queryKey: queryKeys.announcements.published(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, target_filter, published_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return ((data ?? []) as unknown) as PublishedAnnouncement[];
    },
  });
}
```

`apps/mobile/hooks/use-publish-announcement.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface PublishAnnouncementInput {
  title: string;
  body: string;
  targetFilter?: { genderCategory?: 'erkek' | 'kadin' | 'open_only'; onlyActive?: boolean };
  sendPush?: boolean;
}

export function usePublishAnnouncement() {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.session?.access_token);
  return useMutation({
    mutationFn: async (input: PublishAnnouncementInput) => {
      if (!accessToken) throw new Error('not authenticated');
      return invokeFunction('publish-announcement', input, accessToken);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
```

- [ ] **Step 5: Create `AnnouncementCard.tsx`**

```typescript
import { Text, View } from 'react-native';
import type { PublishedAnnouncement } from '../../hooks/use-admin-announcements';

interface Props {
  announcement: PublishedAnnouncement;
}

export function AnnouncementCard({ announcement }: Props) {
  return (
    <View className="mb-2 rounded-lg border border-gray-200 bg-white p-3">
      <Text className="text-sm font-semibold text-gray-900">{announcement.title}</Text>
      <Text className="mt-1 text-xs text-gray-700">{announcement.body}</Text>
      <Text className="mt-1 text-[10px] text-gray-500">
        {announcement.published_at
          ? new Date(announcement.published_at).toLocaleString('tr-TR')
          : 'Yayımlanmadı'}
      </Text>
    </View>
  );
}
```

- [ ] **Step 6: Create `(admin)/announcements.tsx`**

```typescript
import { router } from 'expo-router';
import { FlatList, RefreshControl, Text } from 'react-native';
import { AnnouncementCard } from '../../components/admin/AnnouncementCard';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAdminAnnouncements } from '../../hooks/use-admin-announcements';

export default function AdminAnnouncementsScreen() {
  const list = useAdminAnnouncements();
  return (
    <ScreenContainer>
      <Button onPress={() => router.push('/(admin)/announcements/new')}>Yeni duyuru</Button>
      <FlatList
        className="mt-3"
        data={list.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AnnouncementCard announcement={item} />}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} />
        }
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-500">Duyuru yok.</Text>
        }
      />
    </ScreenContainer>
  );
}
```

- [ ] **Step 7: Create `(admin)/announcements/new.tsx`**

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { TextField } from '../../../components/ui/TextField';
import { Toggle } from '../../../components/ui/Toggle';
import { usePublishAnnouncement } from '../../../hooks/use-publish-announcement';

export default function NewAnnouncementScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendPush, setSendPush] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const publish = usePublishAnnouncement();

  const submit = () => {
    if (title.trim().length === 0 || body.trim().length === 0) {
      Alert.alert('Eksik', 'Başlık ve içerik zorunlu.');
      return;
    }
    publish.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        targetFilter: onlyActive ? { onlyActive: true } : {},
        sendPush,
      },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('Hata', e instanceof Error ? e.message : 'Yayımlanamadı'),
      },
    );
  };

  return (
    <ScreenContainer scrollable>
      <View className="gap-3">
        <TextField placeholder="Başlık" value={title} onChangeText={setTitle} />
        <TextField placeholder="İçerik" value={body} onChangeText={setBody} multiline />
        <Toggle label="Sadece aktif oyunculara" value={onlyActive} onValueChange={setOnlyActive} />
        <Toggle label="Push bildirimi de gönder" value={sendPush} onValueChange={setSendPush} />
        <Text className="text-[10px] text-gray-500">
          Push, kullanıcının "Topluluk duyuruları" tercihi açıksa gönderilir.
        </Text>
        <Button onPress={submit} loading={publish.isPending}>
          Duyuru yayımla
        </Button>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 8: Typecheck mobile + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/functions/publish-announcement packages/supabase/tests/functions/publish-announcement.deno-test.ts apps/mobile/hooks/use-admin-announcements.ts apps/mobile/hooks/use-publish-announcement.ts apps/mobile/components/admin/AnnouncementCard.tsx apps/mobile/app/\(admin\)/announcements.tsx apps/mobile/app/\(admin\)/announcements
git commit -m "feat(supabase,mobile): add publish-announcement Edge Function + Topluluk Duyurusu screens"
```

---

### Task 17: Sistem Sağlığı + admin home Admin tab visibility

**Files:**
- Create: `apps/mobile/hooks/use-admin-health.ts`
- Create: `apps/mobile/app/(admin)/health.tsx`
- Modify: `apps/mobile/app/(app)/_layout.tsx` (Admin tab gated by role)

- [ ] **Step 1: Create `use-admin-health.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface AdminHealth {
  totalUsers: number;
  activeUsers: number;
  matchesTodayCount: number;
  openDisputeCount: number;
  pendingMatchRequestCount: number;
}

export function useAdminHealth() {
  return useQuery<AdminHealth>({
    queryKey: queryKeys.admin.health(),
    queryFn: async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startIso = startOfToday.toISOString();

      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: matchesTodayCount },
        { count: openDisputeCount },
        { count: pendingMatchRequestCount },
      ] = await Promise.all([
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('user_id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .gte('played_at', startIso),
        supabase
          .from('disputes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open'),
        supabase
          .from('match_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);

      return {
        totalUsers: totalUsers ?? 0,
        activeUsers: activeUsers ?? 0,
        matchesTodayCount: matchesTodayCount ?? 0,
        openDisputeCount: openDisputeCount ?? 0,
        pendingMatchRequestCount: pendingMatchRequestCount ?? 0,
      };
    },
    staleTime: 1000 * 60,
  });
}
```

- [ ] **Step 2: Create `apps/mobile/app/(admin)/health.tsx` (audit log section comes in Task 18)**

```typescript
import { Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAdminHealth } from '../../hooks/use-admin-health';

export default function AdminHealthScreen() {
  const { data, isLoading, refetch, isRefetching } = useAdminHealth();

  if (isLoading || !data) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <Text className="mb-3 text-base font-semibold text-gray-900">Genel</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        <Stat label="Toplam üye" value={data.totalUsers} />
        <Stat label="Aktif üye" value={data.activeUsers} />
        <Stat label="Bugünkü maç" value={data.matchesTodayCount} />
        <Stat label="Açık itiraz" value={data.openDisputeCount} />
        <Stat label="Bekleyen teklif" value={data.pendingMatchRequestCount} />
      </View>
      <Text
        className="text-xs text-primary"
        onPress={() => refetch()}
      >
        {isRefetching ? 'Yenileniyor...' : 'Yenile'}
      </Text>
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="w-[48%] rounded-lg border border-gray-200 bg-white p-3">
      <Text className="text-[10px] text-gray-500">{label}</Text>
      <Text className="mt-1 text-lg font-semibold text-gray-900">{value}</Text>
    </View>
  );
}
```

- [ ] **Step 3: Replace `apps/mobile/app/(app)/_layout.tsx` with an admin-gated tab**

```typescript
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { NotificationListener } from '../../components/notifications/NotificationListener';
import { useAuthStore } from '../../stores/auth-store';

export default function AppLayout() {
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  return (
    <View className="flex-1">
      <NotificationListener />
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
    </View>
  );
}

void useAuthStore;
void Text;
```

Note: the `(admin)` route group is reachable via `router.push('/(admin)')` from Settings (Task 2 already wired this for admins). Adding an "Admin" tab directly inside the `(app)` Tabs requires a fake `Tabs.Screen` whose `href` resolves to `/(admin)`; Expo Router 4 doesn't allow cross-group tabs cleanly, so we keep the Admin entry point in Settings → "Admin Paneli" only. The trailing `void` lines keep the imports live and the diff small relative to Task 5's stub.

- [ ] **Step 4: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-admin-health.ts apps/mobile/app/\(admin\)/health.tsx apps/mobile/app/\(app\)/_layout.tsx
git commit -m "feat(mobile): admin Sistem Sağlığı screen + role-gated admin entry from Settings"
```

---

### Task 18: Audit log tail inside Sistem Sağlığı

**Files:**
- Create: `apps/mobile/hooks/use-audit-log.ts`
- Modify: `apps/mobile/app/(admin)/health.tsx`

- [ ] **Step 1: Create `use-audit-log.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

interface Raw {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  actor: { first_name: string; last_name: string } | null;
}

export function useAuditLog(limit = 20) {
  return useQuery<AuditLogRow[]>({
    queryKey: queryKeys.admin.auditLog(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          id, actor_id, action, entity_type, entity_id, created_at,
          actor:profiles!audit_log_actor_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data ?? []) as unknown as Raw[]).map((r) => ({
        id: r.id,
        actor_id: r.actor_id,
        actor_name: r.actor ? `${r.actor.first_name} ${r.actor.last_name}` : null,
        action: r.action,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        created_at: r.created_at,
      }));
    },
  });
}
```

- [ ] **Step 2: Update `health.tsx` to include the audit log tail**

Replace the file with:

```typescript
import { Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAdminHealth } from '../../hooks/use-admin-health';
import { useAuditLog } from '../../hooks/use-audit-log';

export default function AdminHealthScreen() {
  const { data, isLoading, refetch, isRefetching } = useAdminHealth();
  const audit = useAuditLog(20);

  if (isLoading || !data) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <Text className="mb-3 text-base font-semibold text-gray-900">Genel</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        <Stat label="Toplam üye" value={data.totalUsers} />
        <Stat label="Aktif üye" value={data.activeUsers} />
        <Stat label="Bugünkü maç" value={data.matchesTodayCount} />
        <Stat label="Açık itiraz" value={data.openDisputeCount} />
        <Stat label="Bekleyen teklif" value={data.pendingMatchRequestCount} />
      </View>
      <Text className="text-xs text-primary" onPress={() => refetch()}>
        {isRefetching ? 'Yenileniyor...' : 'İstatistikleri yenile'}
      </Text>

      <Text className="mt-6 mb-2 text-base font-semibold text-gray-900">Son işlemler</Text>
      {(audit.data ?? []).length === 0 ? (
        <Text className="text-xs text-gray-500">Audit kaydı yok.</Text>
      ) : (
        (audit.data ?? []).map((row) => (
          <View key={row.id} className="mb-2 rounded-lg border border-gray-200 bg-white p-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-gray-900">{row.action}</Text>
              <Text className="text-[10px] text-gray-500">
                {new Date(row.created_at).toLocaleString('tr-TR')}
              </Text>
            </View>
            <Text className="mt-1 text-[10px] text-gray-600">
              {row.actor_name ?? row.actor_id ?? 'sistem'} · {row.entity_type}
              {row.entity_id ? ` #${row.entity_id.slice(0, 8)}` : ''}
            </Text>
          </View>
        ))
      )}
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="w-[48%] rounded-lg border border-gray-200 bg-white p-3">
      <Text className="text-[10px] text-gray-500">{label}</Text>
      <Text className="mt-1 text-lg font-semibold text-gray-900">{value}</Text>
    </View>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bun run typecheck
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-audit-log.ts apps/mobile/app/\(admin\)/health.tsx
git commit -m "feat(mobile): audit log tail in Sistem Sağlığı screen"
```

---

## Phase H — Verification

### Task 19: Backend test suite green check

**Files:** (none new)

- [ ] **Step 1: Run the two new function test files together with the existing suite to make sure nothing else regressed**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
supabase functions serve --no-verify-jwt &
sleep 5
ANON_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['ANON_KEY'])")
SERVICE_ROLE_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")
SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
  deno test --allow-env --allow-net tests/functions/admin-update-profile.deno-test.ts tests/functions/publish-announcement.deno-test.ts tests/functions/send-push-notification.deno-test.ts tests/functions/register-push-token.deno-test.ts tests/functions/resolve-dispute.deno-test.ts
pkill -f "supabase functions serve" || true
supabase stop
```

Expected: all 5 test files pass.

- [ ] **Step 2: Commit verification marker**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git commit --allow-empty -m "test(supabase): verified admin-update-profile + publish-announcement + push/dispute regression"
```

---

### Task 20: Manual iOS simulator E2E

This task is fully manual — no source edits. It validates the full round trip.

- [ ] **Step 1: Boot the stack + simulator**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
supabase functions serve --no-verify-jwt &
sleep 5
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bunx expo start --host lan &
sleep 25
IP=$(ifconfig en0 | grep "inet " | awk '{print $2}' | head -1)
open -a /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app
xcrun simctl openurl booted "exp://$IP:8081"
```

- [ ] **Step 2: Manual flow checklist**

In the Simulator app, do the following and check each item:

1. **Sign-up + onboarding** — create `you+admin@boun.edu.tr`, finish onboarding. Push permission prompt appears.
2. **Promote yourself** — connect to `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"` and run:

```sql
update public.profiles set role = 'admin' where email = 'you+admin@boun.edu.tr';
```

   Cold-reload the simulator. Settings → "Admin Paneli" entry appears.
3. **Bell badge** — open admin → publish a test announcement with "sadece aktif oyunculara" + "push gönder" off. Return to Maçlar tab: 🔔 shows `1`.
4. **Tap bell → mark read** — open notifications screen. Tap the row → marks read. Badge goes to 0.
5. **Mark all read** — publish 3 more announcements, return to bell, tap "Tümünü okundu işaretle". Badge clears.
6. **Realtime UI update** — sign up a second account `bob@boun.edu.tr` on a second simulator (or use `xcrun simctl boot` for a second device). Bob sends Alice a match request. Alice's Maçlar tab refreshes the Gelen count without manual pull-to-refresh.
7. **Score submission realtime** — Bob submits a score in `play/[matchId]`. Alice's screen flips into the MismatchBanner state automatically.
8. **Dispute admin flow** — Alice raises a dispute. As admin (the first account), open admin → Bekleyen İtirazlar. Tap → resolve with "Skor A doğru". Both players see the match flip to `confirmed`.
9. **User admin** — admin → Kullanıcı Yönetimi → Bob → "Askıya al" applies (verify in `psql`).
10. **System Sağlığı** — open the screen and confirm counts + audit log tail show the dispute resolution + announcement + suspend action.

- [ ] **Step 3: Tear down + commit verification marker**

```bash
pkill -f "expo start" || true
pkill -f "supabase functions serve" || true
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase stop
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git commit --allow-empty -m "test(mobile): verified Plan 7 admin + push + realtime + notification center on iOS sim"
```

---

## Plan 7 Sonu

Bu plan tamamlandığında:

- **Push token kaydı** — Expo SDK 56 `expo-notifications` ile permission istenir, token `register-push-token` Edge Function'ına post edilir
- **8 kategori bildirim tercihi** — Ayarlar → Bildirim Tercihleri ekranı, her toggle anında `notification_preferences` tablosunu günceller
- **In-app bildirim merkezi** — 🔔 + okunmamış sayı, tarih sıralı liste, deep-link routing (`matchRequestId` / `matchId` / `disputeId` / `tournamentId` / admin action'lar), "tümünü okundu işaretle"
- **`NotificationListener` realtime mount** — `(app)` layout'unda, `notifications` INSERT/UPDATE'lerinde debounced invalidate
- **Generic `useRealtimeChannel` helper** — matches + match score submissions + match requests'i live takip eden 3 somut wiring
- **`(admin)` route group + role guard** — `profile.role !== 'admin'` ise `/`'a redirect; Settings'ten `/(admin)` entry'si
- **Initial admin seed migration** — placeholder email ile, deploy öncesi kullanıcı dolduracak
- **6 admin ekranı** — Bekleyen İtirazlar (liste + detay + 4 outcome), Sezon Yönetimi (start-finale / close-season), Bracket Yönetimi (kategori sekmesi + void), Kullanıcı Yönetimi (arama + suspend/ban/admin), Topluluk Duyurusu (liste + composer), Sistem Sağlığı (5 stat kartı + 20 son audit log)
- **2 yeni Edge Function** — `admin-update-profile` (role/status + audit) ve `publish-announcement` (fan-out + opsiyonel push + audit), her biri 3 deno test
- **Backend test regression** — Plan 7 + Plan 1/2'nin push & dispute test'leri birlikte yeşil
- **Manuel iOS E2E** — push permission, bell badge, realtime UI refresh, admin dispute resolution, suspend user, audit log doğrulandı

**Bilinen sınırlamalar (sonraki planlara):**
- `profile.status='suspended' | 'banned'` enum extension için takip migration (Plan 7 sonrası bir patch — bu planda role path zaten test edildi)
- Çekilen oyuncu yerine yedek seed koyma (Plan 7'de sadece "voided yap" var) — Plan 8 / faz 2 admin polish
- iOS notification category actions (e.g., "Onayla" doğrudan banner'dan) — MVP'de tek tap deep-link yeterli
- Web admin dashboard — Faz 2
- Push fan-out batching (>500 alıcı için kuyruk) — şu an synchronous, 300 aktif kullanıcı hedefi için yeterli

**Sonraki plan: Plan 8 — UI/UX tasarım entegrasyonu + TestFlight + App Store.**

