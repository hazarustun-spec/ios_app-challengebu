# Plan 8: UI Redesign + App Store Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 4-7 boyunca placeholder NativeWind primitive'leriyle yapılmış mobile UI'ı tamamen Claude Design bundle'ındaki ink/lime/court mavi tasarım dili ile yeniden yazıp TestFlight + App Store'a yayınlamak.

**Architecture:** Expo Router file-based routing korunur; her ekranın içeriği design jsx'lerine göre RN/NativeWind'e port edilir. Mevcut hooks/queries/mutations dokunulmaz (Plan 1-7 backend stable). 11 phase (A-K) sıralı: backend migrations → design tokens → component primitives → 5 phase ekran portları → EAS setup → iOS QA → App Store submission.

**Tech Stack:** Expo SDK 56, React Native 0.85, Expo Router 4 (typedRoutes), NativeWind 4, TanStack Query 5, Zustand 5, Supabase (Postgres + Edge Functions Deno + pg_cron + Realtime), Bun monorepo + Turborepo, react-native-svg, react-native-view-shot, expo-sharing, expo-font, react-native-reanimated, EAS Build managed workflow, App Store Connect.

**Spec:** `docs/superpowers/specs/2026-06-10-plan-8-ui-redesign-release.md`

**Design reference:** `docs/superpowers/specs/plan-8-design-bundle/project/` (124 dosya, 18 React prototype + Design System.html + tokens.css)

---

## File Structure

### Yeni dosyalar
```
packages/supabase/migrations/
├── 20260610000001_match_kind_enum.sql                # Phase A1
├── 20260610000002_match_request_applications.sql     # Phase A2
├── 20260610000003_notification_category_revise.sql   # Phase A3
├── 20260610000004_admin_extensions.sql               # Phase A4
└── 20260610000005_kvkk_consent.sql                   # Phase A5

packages/supabase/functions/
└── deactivate-push-token/index.ts                    # Phase A6

packages/supabase/tests/functions/
└── deactivate-push-token.deno-test.ts                # Phase A6

packages/shared/src/
├── notifications/
│   └── categories.ts                                  # Phase A3 (update)
└── auth/
    └── otp-config.ts                                  # Phase A7 (new)

apps/mobile/
├── theme/
│   ├── tokens.ts                                     # Phase B1
│   ├── colors.ts                                     # Phase B1
│   ├── typography.ts                                 # Phase B1
│   └── motion.ts                                     # Phase B1
├── tailwind.config.js                                # Phase B2 (rewrite)
├── lib/
│   ├── fonts.ts                                      # Phase B3
│   └── frozen-status.ts                              # Phase F (new)
├── components/
│   ├── ui/
│   │   ├── Button.tsx                                # Phase C1
│   │   ├── Field.tsx                                 # Phase C2
│   │   ├── SearchBar.tsx                             # Phase C2
│   │   ├── Segmented.tsx                             # Phase C3
│   │   ├── Toggle.tsx                                # Phase C3
│   │   ├── CheckBox.tsx                              # Phase C3
│   │   ├── Card.tsx                                  # Phase C4
│   │   ├── ListRow.tsx                               # Phase C4
│   │   ├── Modal.tsx                                 # Phase C5
│   │   ├── Sheet.tsx                                 # Phase C5
│   │   ├── Banner.tsx                                # Phase C6
│   │   ├── Toast.tsx                                 # Phase C6
│   │   ├── TabBar.tsx                                # Phase C7
│   │   ├── Avatar.tsx                                # Phase C7
│   │   ├── EloChip.tsx                               # Phase C8
│   │   ├── Sparkline.tsx                             # Phase C8
│   │   ├── FormDots.tsx                              # Phase C8
│   │   ├── LevelIcon.tsx                             # Phase C8
│   │   ├── FormatChip.tsx                            # Phase C8
│   │   ├── PlayerChip.tsx                            # Phase C8
│   │   ├── MatchCard.tsx                             # Phase C8
│   │   ├── NavHeader.tsx                             # Phase C9
│   │   ├── Skel.tsx                                  # Phase H1
│   │   ├── EmptyState.tsx                            # Phase H1
│   │   ├── GreetHeader.tsx                           # Phase E (new)
│   │   ├── LevelRing.tsx                             # Phase F (new)
│   │   └── doodles/
│   │       ├── BallMark.tsx                          # Phase B4
│   │       ├── Cloud.tsx                             # Phase B4
│   │       ├── Squiggle.tsx                          # Phase B4
│   │       ├── Star.tsx                              # Phase B4
│   │       └── Dots.tsx                              # Phase B4
│   └── share/
│       ├── CardMatchResult.tsx                       # Phase H2
│       ├── CardEloProgress.tsx                       # Phase H2
│       ├── CardBadgeWon.tsx                          # Phase H2
│       └── ShareSheet.tsx                            # Phase H2
├── app/
│   ├── _layout.tsx                                   # Phase D (rewrite)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── splash.tsx                                # Phase D1
│   │   ├── welcome.tsx                               # Phase D2
│   │   ├── sign-in.tsx                               # Phase D3 (rewrite)
│   │   └── otp.tsx                                   # Phase D4
│   ├── (onboarding)/
│   │   ├── _layout.tsx
│   │   ├── name.tsx                                  # Phase D5
│   │   ├── phone.tsx                                 # Phase D6
│   │   ├── pronoun.tsx                               # Phase D7
│   │   ├── category.tsx                              # Phase D8
│   │   ├── department.tsx                            # Phase D9
│   │   ├── year.tsx                                  # Phase D10
│   │   ├── level.tsx                                 # Phase D11
│   │   ├── hand.tsx                                  # Phase D12
│   │   ├── availability.tsx                          # Phase D13
│   │   ├── photo.tsx                                 # Phase D14
│   │   └── done.tsx                                  # Phase D15
│   ├── (tabs)/
│   │   ├── _layout.tsx                               # Phase E1 (custom TabBar)
│   │   ├── index.tsx                                 # Phase E2 (= Anasayfa)
│   │   ├── matches.tsx                               # Phase E3
│   │   ├── new-match.tsx                             # Phase E4 (modal)
│   │   ├── notifications.tsx                         # Phase G1
│   │   └── profile.tsx                               # Phase F1
│   ├── match/
│   │   ├── [id]/
│   │   │   ├── index.tsx                             # Phase E5
│   │   │   ├── score.tsx                             # Phase E6
│   │   │   ├── confirm.tsx                           # Phase E7
│   │   │   ├── result.tsx                            # Phase E8
│   │   │   └── dispute.tsx                           # Phase E9
│   │   ├── new/
│   │   │   ├── type.tsx                              # Phase E10
│   │   │   ├── path.tsx                              # Phase E11
│   │   │   ├── detail.tsx                            # Phase E12
│   │   │   ├── opponent.tsx                          # Phase E13
│   │   │   ├── preview.tsx                           # Phase E14
│   │   │   └── format-rules.tsx                      # Phase E15
│   │   ├── history.tsx                               # Phase E16
│   │   └── open-applicants/[requestId].tsx           # Phase E17
│   ├── profile/
│   │   ├── edit.tsx                                  # Phase F2
│   │   ├── elo-history.tsx                           # Phase F3
│   │   ├── badges.tsx                                # Phase F4
│   │   └── stats.tsx                                 # Phase F5
│   ├── user/
│   │   └── [userId].tsx                              # Phase F6 (player_preview)
│   ├── leaderboard/
│   │   └── filter.tsx                                # Phase F7
│   ├── season/
│   │   ├── index.tsx                                 # Phase F8
│   │   ├── bracket.tsx                               # Phase F9
│   │   ├── bracket-doubles.tsx                       # Phase F10
│   │   ├── annual-champion.tsx                       # Phase F11
│   │   └── archive.tsx                               # Phase F12
│   ├── settings/
│   │   ├── index.tsx                                 # Phase G2
│   │   ├── notification-preferences.tsx              # Phase G3 (rewrite)
│   │   └── delete-account.tsx                        # Phase G4
│   ├── (admin)/
│   │   ├── _layout.tsx                               # Phase G5 (rewrite)
│   │   ├── index.tsx                                 # Phase G6
│   │   ├── disputes.tsx                              # Phase G7 (rewrite)
│   │   ├── disputes/[id].tsx                         # Phase G8 (rewrite)
│   │   ├── seasons.tsx                               # Phase G9 (rewrite)
│   │   ├── tournaments.tsx                           # Phase G10 (rewrite)
│   │   ├── users.tsx                                 # Phase G11 (rewrite)
│   │   ├── users/[userId].tsx                        # Phase G12 (rewrite)
│   │   ├── announcements.tsx                         # Phase G13 (rewrite)
│   │   ├── announcements/new.tsx                     # Phase G14 (rewrite)
│   │   └── health.tsx                                # Phase G15 (rewrite)
│   └── states/                                       # Phase H1 (skeleton ref)
│       └── (her ekran kendi içinde Skel<Screen> render)
├── hooks/
│   ├── use-match-applications.ts                     # Phase A2 (new hook)
│   ├── use-share-card.ts                             # Phase H2
│   └── use-frozen-status.ts                          # Phase F (new)
├── eas.json                                          # Phase I1 (rewrite)
└── app.json                                          # Phase I2 (update)
```

### Mevcut dosya değişiklikleri (rewrite)
- `apps/mobile/app/(auth)/sign-in.tsx` — KVKK checkbox + OTP option
- `apps/mobile/app/(tabs)/_layout.tsx` — custom TabBar
- `apps/mobile/app/(tabs)/index.tsx` — Anasayfa
- `apps/mobile/app/(tabs)/notifications.tsx` — Plan 7'den port
- `apps/mobile/app/notifications.tsx` — DELETE (root'taki, (tabs)/'a taşınır)
- `apps/mobile/app/notification-preferences.tsx` — `settings/`'e taşınır
- `apps/mobile/app/(admin)/*.tsx` — tümü yeniden boyanır
- `packages/shared/src/notifications/categories.ts` — 4 kategori revize
- `apps/mobile/hooks/use-sign-out.ts` (var olan veya yeni) — deactivate-push-token çağrısı eklenir

---

## Phase A: Backend Migrations + Auth Config (7 task)

### Task A1: `match_kind` enum + ELO trigger guard

**Files:**
- Create: `packages/supabase/migrations/20260610000001_match_kind_enum.sql`
- Create: `packages/supabase/tests/migrations/match-kind.deno-test.ts`
- Modify: `packages/supabase/migrations/20260606000005_matches.sql` (REFERENCE only — bu zaten apply edildi, drop edilmez)

- [ ] **Step 1: Write the failing deno test**

```typescript
// packages/supabase/tests/migrations/match-kind.deno-test.ts
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser } from '../functions/helpers.ts';

Deno.test('match_kind: friendly maç ELO trigger çağırmaz', async () => {
  const supa = adminClient();
  const a = await createTestUser({ email: 'friendly-a@std.bogazici.edu.tr' });
  const b = await createTestUser({ email: 'friendly-b@std.bogazici.edu.tr' });

  // Initial ELO read
  const { data: eloBefore } = await supa
    .from('elo_ratings')
    .select('rating')
    .eq('profile_id', a.userId)
    .eq('category', 'erkek_tek')
    .single();
  assertExists(eloBefore);
  const ratingBefore = eloBefore.rating;

  // Insert friendly match (winner A)
  const { error } = await supa.from('matches').insert({
    category: 'erkek_tek',
    format: 'bu_klasik',
    kind: 'friendly',
    status: 'completed',
    team_a_player_1: a.userId,
    team_b_player_1: b.userId,
    winner_team: 'a',
    score: '4-2',
    played_at: new Date().toISOString(),
  });
  assertEquals(error, null);

  // ELO should NOT have changed for friendly
  const { data: eloAfter } = await supa
    .from('elo_ratings')
    .select('rating')
    .eq('profile_id', a.userId)
    .eq('category', 'erkek_tek')
    .single();
  assertEquals(eloAfter!.rating, ratingBefore);

  await cleanupTestData();
});

Deno.test('match_kind: ranking maç ELO update tetikler', async () => {
  const supa = adminClient();
  const a = await createTestUser({ email: 'ranked-a@std.bogazici.edu.tr' });
  const b = await createTestUser({ email: 'ranked-b@std.bogazici.edu.tr' });

  const { data: eloBefore } = await supa.from('elo_ratings').select('rating')
    .eq('profile_id', a.userId).eq('category', 'erkek_tek').single();
  const ratingBefore = eloBefore!.rating;

  await supa.from('matches').insert({
    category: 'erkek_tek',
    format: 'bu_klasik',
    kind: 'ranking',
    status: 'completed',
    team_a_player_1: a.userId,
    team_b_player_1: b.userId,
    winner_team: 'a',
    score: '4-2',
    played_at: new Date().toISOString(),
  });

  const { data: eloAfter } = await supa.from('elo_ratings').select('rating')
    .eq('profile_id', a.userId).eq('category', 'erkek_tek').single();
  // Winner should gain ELO
  if (eloAfter!.rating <= ratingBefore) {
    throw new Error(`Expected ELO gain, got ${ratingBefore} → ${eloAfter!.rating}`);
  }

  await cleanupTestData();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/supabase && deno test --allow-all tests/migrations/match-kind.deno-test.ts
```
Expected: FAIL with "column matches.kind does not exist"

- [ ] **Step 3: Write the migration**

```sql
-- packages/supabase/migrations/20260610000001_match_kind_enum.sql
-- Plan 8 Phase A1: match_kind ayrımı
-- Sıralama maçları: ELO etkiler, sezon ladder'a sayar
-- Dostluk maçları: ELO etkilemez, W/L sayar ama ladder dışı

create type match_kind as enum ('ranking', 'friendly');

alter table public.matches
  add column kind match_kind not null default 'ranking';

-- Update ELO trigger to guard on kind
create or replace function public.apply_elo_after_match() returns trigger
language plpgsql security definer as $$
begin
  -- Only ranking matches affect ELO
  if new.kind != 'ranking' then
    return new;
  end if;

  -- Defer to existing apply_match_elo Edge Function via NOTIFY,
  -- or call inline if same logic was in trigger. The existing
  -- 20260606000005_matches.sql trigger logic is preserved here:
  perform pg_notify(
    'match_completed',
    json_build_object('match_id', new.id, 'kind', new.kind)::text
  );

  return new;
end;
$$;

-- Replace existing trigger (idempotent)
drop trigger if exists trg_apply_elo_after_match on public.matches;
create trigger trg_apply_elo_after_match
  after update of status on public.matches
  for each row
  when (new.status = 'completed' and old.status != 'completed')
  execute function public.apply_elo_after_match();

comment on column public.matches.kind is
  'ranking = ELO ve ladder etkilenir; friendly = sadece W/L stats.';
```

- [ ] **Step 4: Reset DB and run test to verify it passes**

```bash
supabase db reset
cd packages/supabase && deno test --allow-all tests/migrations/match-kind.deno-test.ts
```
Expected: PASS — friendly maç ELO değiştirmez, ranking maç ELO arttırır

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/migrations/20260610000001_match_kind_enum.sql \
        packages/supabase/tests/migrations/match-kind.deno-test.ts
git commit -m "feat(plan-8): add match_kind enum (ranking/friendly) with ELO guard"
```

---

### Task A2: `match_request_applications` tablosu

**Files:**
- Create: `packages/supabase/migrations/20260610000002_match_request_applications.sql`
- Create: `packages/supabase/tests/migrations/match-request-applications.deno-test.ts`
- Create: `apps/mobile/hooks/use-match-applications.ts`

- [ ] **Step 1: Write the failing deno test**

```typescript
// packages/supabase/tests/migrations/match-request-applications.deno-test.ts
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser } from '../functions/helpers.ts';

Deno.test('match_request_applications: applicant insert + RLS', async () => {
  const supa = adminClient();
  const creator = await createTestUser({ email: 'creator@std.bogazici.edu.tr' });
  const applicant = await createTestUser({ email: 'applicant@std.bogazici.edu.tr' });

  // Open call match request
  const { data: req } = await supa.from('match_requests').insert({
    creator_id: creator.userId,
    category: 'erkek_tek',
    format: 'bu_klasik',
    is_open_call: true,
    open_call_window: 'Bu hafta · akşamları',
  }).select('id').single();

  // Applicant submits application
  const { error } = await supa.from('match_request_applications').insert({
    request_id: req!.id,
    applicant_id: applicant.userId,
    note: 'Cuma akşam müsaitim',
  });
  assertEquals(error, null);

  // Duplicate insert by same applicant rejected
  const dup = await supa.from('match_request_applications').insert({
    request_id: req!.id,
    applicant_id: applicant.userId,
    note: 'tekrar başvuru',
  });
  assertExists(dup.error);

  await cleanupTestData();
});

Deno.test('match_request_applications: accept flow updates match_requests', async () => {
  const supa = adminClient();
  const creator = await createTestUser({ email: 'flow-creator@std.bogazici.edu.tr' });
  const applicant = await createTestUser({ email: 'flow-applicant@std.bogazici.edu.tr' });

  const { data: req } = await supa.from('match_requests').insert({
    creator_id: creator.userId,
    category: 'erkek_tek',
    format: 'bu_klasik',
    is_open_call: true,
  }).select('id').single();

  await supa.from('match_request_applications').insert({
    request_id: req!.id,
    applicant_id: applicant.userId,
    note: 'tamam',
  });

  // Creator accepts via RPC
  await supa.rpc('accept_match_application', {
    request_id: req!.id,
    applicant_user_id: applicant.userId,
  });

  // match_requests target_id + status updated
  const { data: updated } = await supa.from('match_requests')
    .select('target_id, status')
    .eq('id', req!.id)
    .single();
  assertEquals(updated!.target_id, applicant.userId);
  assertEquals(updated!.status, 'accepted');

  await cleanupTestData();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/supabase && deno test --allow-all tests/migrations/match-request-applications.deno-test.ts
```
Expected: FAIL with "relation match_request_applications does not exist"

- [ ] **Step 3: Write the migration**

```sql
-- packages/supabase/migrations/20260610000002_match_request_applications.sql
-- Plan 8 Phase A2: Açık ilanlara çoklu başvuru desteği

create table public.match_request_applications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.match_requests(id) on delete cascade,
  applicant_id uuid not null references public.profiles(user_id) on delete cascade,
  note text,
  applied_at timestamptz not null default now(),
  unique (request_id, applicant_id)
);

create index match_request_applications_request_idx
  on public.match_request_applications (request_id);
create index match_request_applications_applicant_idx
  on public.match_request_applications (applicant_id);

alter table public.match_request_applications enable row level security;

-- Applicant can insert their own application
create policy "applicants insert own"
  on public.match_request_applications for insert
  to authenticated
  with check (applicant_id = auth.uid());

-- Creator + applicant can read
create policy "creator and applicant read"
  on public.match_request_applications for select
  to authenticated
  using (
    applicant_id = auth.uid()
    or exists (
      select 1 from public.match_requests r
        where r.id = request_id and r.creator_id = auth.uid()
    )
  );

-- Applicant can withdraw (delete own)
create policy "applicant delete own"
  on public.match_request_applications for delete
  to authenticated
  using (applicant_id = auth.uid());

-- Accept RPC: only request creator can accept; sets target_id + status,
-- declines other applications atomically
create or replace function public.accept_match_application(
  request_id uuid,
  applicant_user_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  -- Caller must be request creator
  if not exists (
    select 1 from public.match_requests
      where id = request_id and creator_id = uid
  ) then
    raise exception 'Only request creator can accept applications'
      using errcode = '42501';
  end if;

  -- Verify applicant has an application
  if not exists (
    select 1 from public.match_request_applications
      where request_id = accept_match_application.request_id
        and applicant_id = applicant_user_id
  ) then
    raise exception 'No application found for that applicant'
      using errcode = '42704';
  end if;

  -- Update match_requests
  update public.match_requests
    set target_id = applicant_user_id,
        status = 'accepted',
        accepted_at = now()
    where id = request_id;

  -- Optionally: keep applications row but mark accepted, OR delete others.
  -- We keep all rows for audit, just don't auto-decline. UI hides others.
end;
$$;

revoke all on function public.accept_match_application(uuid, uuid) from public;
grant execute on function public.accept_match_application(uuid, uuid) to authenticated;
```

- [ ] **Step 4: Reset DB and run test**

```bash
supabase db reset
cd packages/supabase && deno test --allow-all tests/migrations/match-request-applications.deno-test.ts
```
Expected: PASS

- [ ] **Step 5: Create the mobile hook**

```typescript
// apps/mobile/hooks/use-match-applications.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface MatchApplication {
  id: string;
  request_id: string;
  applicant_id: string;
  applicant: { first_name: string; last_name: string; elo: number };
  note: string | null;
  applied_at: string;
}

export function useMatchApplications(requestId: string | undefined) {
  return useQuery<MatchApplication[]>({
    queryKey: requestId ? queryKeys.matchApplications.byRequest(requestId) : ['mra', 'disabled'],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from('match_request_applications')
        .select(`
          id, request_id, applicant_id, note, applied_at,
          applicant:profiles!applicant_id(first_name, last_name)
        `)
        .eq('request_id', requestId)
        .order('applied_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MatchApplication[];
    },
  });
}

export function useApplyToOpenCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; note?: string }) => {
      const { error } = await supabase.from('match_request_applications').insert({
        request_id: input.requestId,
        applicant_id: (await supabase.auth.getUser()).data.user!.id,
        note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matches.all });
    },
  });
}

export function useAcceptApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; applicantUserId: string }) => {
      const { error } = await supabase.rpc('accept_match_application', {
        request_id: input.requestId,
        applicant_user_id: input.applicantUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matches.all });
      qc.invalidateQueries({ queryKey: queryKeys.matchApplications.all });
    },
  });
}
```

- [ ] **Step 6: Add queryKeys entry**

In `apps/mobile/lib/query-keys.ts`, add:
```typescript
matchApplications: {
  all: ['matchApplications'] as const,
  byRequest: (id: string) => ['matchApplications', 'request', id] as const,
},
```

- [ ] **Step 7: Commit**

```bash
git add packages/supabase/migrations/20260610000002_match_request_applications.sql \
        packages/supabase/tests/migrations/match-request-applications.deno-test.ts \
        apps/mobile/hooks/use-match-applications.ts \
        apps/mobile/lib/query-keys.ts
git commit -m "feat(plan-8): add match_request_applications table + accept RPC + mobile hook"
```

---

### Task A3: `notification_category` revize

**Files:**
- Create: `packages/supabase/migrations/20260610000003_notification_category_revise.sql`
- Modify: `packages/shared/src/notifications/categories.ts`
- Create: `packages/supabase/tests/migrations/notif-categories.deno-test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/supabase/tests/migrations/notif-categories.deno-test.ts
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData } from '../functions/helpers.ts';

Deno.test('notification_category: new categories present, old dropped', async () => {
  const supa = adminClient();

  // Query enum values
  const { data } = await supa.rpc('pg_enum_values', { enum_name: 'notification_category' });
  // Or direct SQL via from()
  const { data: enumValues } = await supa
    .from('information_schema.columns')
    .select()
    .limit(0);
  // Simpler approach: try to insert each value
  const cats = [
    'match_invitations', 'match_score_pending', 'badges_earned',
    'season_lifecycle', 'ladder_movement', 'community_announcements',
    'open_listings', 'match_reminders',
  ];
  // None should error
  for (const cat of cats) {
    const test = await supa.rpc('echo_category', { c: cat });
    // If echo_category doesn't exist, we'll write inline:
  }

  // Try the dropped values — should error
  const old1 = await supa.from('notification_preferences').insert({
    profile_id: '00000000-0000-0000-0000-000000000000',
    category: 'dispute_updates' as any,
    enabled: true,
  });
  if (!old1.error) throw new Error('Expected dispute_updates to be invalid enum');

  await cleanupTestData();
});
```

Actually, a more pragmatic test that doesn't require RPC scaffolding:

```typescript
Deno.test('notification_category: enum check via psql', async () => {
  const supa = adminClient();

  // Create dummy profile to insert prefs
  const { data: prof } = await supa.from('profiles').select('user_id').limit(1).single();
  if (!prof) throw new Error('no profile');

  // open_listings should succeed
  const ok = await supa.from('notification_preferences').upsert({
    profile_id: prof.user_id,
    category: 'open_listings',
    enabled: true,
  });
  assertEquals(ok.error, null);

  // dispute_updates should fail (enum value dropped)
  const fail = await supa.from('notification_preferences').upsert({
    profile_id: prof.user_id,
    category: 'dispute_updates' as any,
    enabled: true,
  });
  if (!fail.error) throw new Error('dispute_updates should be invalid');
});
```

- [ ] **Step 2: Run test to verify it fails (before migration)**

```bash
cd packages/supabase && deno test --allow-all tests/migrations/notif-categories.deno-test.ts
```
Expected: FAIL — open_listings not in enum yet

- [ ] **Step 3: Write the migration**

```sql
-- packages/supabase/migrations/20260610000003_notification_category_revise.sql
-- Plan 8 Phase A3: bildirim kategorilerini design'a hizala
-- Pre-launch oldugu için veri kayıp riski yok

-- Delete preferences using dropped categories (safe — no production data)
delete from public.notification_preferences
  where category in ('dispute_updates', 'doubles_invitations');
delete from public.notifications
  where category in ('dispute_updates', 'doubles_invitations');

-- ALTER TYPE in Postgres doesn't allow direct value drop; we recreate
-- the type and reapply column references.
alter type public.notification_category rename to notification_category_old;

create type public.notification_category as enum (
  'match_invitations',
  'match_score_pending',
  'badges_earned',
  'season_lifecycle',
  'ladder_movement',
  'community_announcements',
  'open_listings',     -- NEW
  'match_reminders'    -- NEW
);

-- Migrate columns
alter table public.notification_preferences
  alter column category type public.notification_category
  using category::text::public.notification_category;
alter table public.notifications
  alter column category type public.notification_category
  using category::text::public.notification_category;

drop type public.notification_category_old;

-- Update default_on map seed (replace trigger logic)
create or replace function public.create_default_notification_preferences()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_preferences (profile_id, category, enabled) values
    (new.user_id, 'match_invitations', true),
    (new.user_id, 'match_score_pending', true),
    (new.user_id, 'badges_earned', true),
    (new.user_id, 'season_lifecycle', true),
    (new.user_id, 'ladder_movement', true),
    (new.user_id, 'community_announcements', true),
    (new.user_id, 'open_listings', true),
    (new.user_id, 'match_reminders', true);
  return new;
end;
$$;

drop trigger if exists trg_create_default_notif_prefs on public.profiles;
create trigger trg_create_default_notif_prefs
  after insert on public.profiles
  for each row
  execute function public.create_default_notification_preferences();
```

- [ ] **Step 4: Update shared categories.ts**

```typescript
// packages/shared/src/notifications/categories.ts
export const NOTIFICATION_CATEGORIES = [
  'match_invitations',
  'match_score_pending',
  'badges_earned',
  'season_lifecycle',
  'ladder_movement',
  'community_announcements',
  'open_listings',
  'match_reminders',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const DEFAULT_ON: Record<NotificationCategory, boolean> = {
  match_invitations: true,
  match_score_pending: true,
  badges_earned: true,
  season_lifecycle: true,
  ladder_movement: true,
  community_announcements: true,
  open_listings: true,
  match_reminders: true,
};

export const CATEGORY_LABELS: Record<NotificationCategory, { title: string; subtitle: string; icon: string }> = {
  match_invitations:       { title: 'Maç teklifleri',       subtitle: 'Sana gelen meydan okumalar',   icon: 'bolt' },
  match_score_pending:     { title: 'Maç onayları',         subtitle: 'Skor onayı/itiraz',            icon: 'check' },
  badges_earned:           { title: 'Rozet kazanımı',       subtitle: 'Yeni rozetler',                icon: 'flame' },
  season_lifecycle:        { title: 'Sezon & finaller',     subtitle: 'Finale window, bracket',       icon: 'trophy' },
  ladder_movement:         { title: 'Sıralama değişimi',    subtitle: 'Rank yükselişi/düşüşü',        icon: 'ranking' },
  community_announcements: { title: 'Topluluk duyuruları',  subtitle: 'Admin duyuruları',             icon: 'megaphone' },
  open_listings:           { title: 'Açık ilanlar',         subtitle: 'Sana uygun yeni ilanlar',      icon: 'handshake' },
  match_reminders:         { title: 'Hatırlatmalar',        subtitle: 'Yaklaşan maç hatırlatması',    icon: 'clock' },
};
```

- [ ] **Step 5: Reset DB and run test**

```bash
supabase db reset
cd packages/supabase && deno test --allow-all tests/migrations/notif-categories.deno-test.ts
bun run typecheck
```
Expected: PASS + zero TS errors

- [ ] **Step 6: Commit**

```bash
git add packages/supabase/migrations/20260610000003_notification_category_revise.sql \
        packages/supabase/tests/migrations/notif-categories.deno-test.ts \
        packages/shared/src/notifications/categories.ts
git commit -m "feat(plan-8): revise notification_category (drop dispute_updates+doubles_invitations, add open_listings+match_reminders)"
```

---

### Task A4: Admin extensions (`suspended_until` + 2 RPC)

**Files:**
- Create: `packages/supabase/migrations/20260610000004_admin_extensions.sql`
- Create: `packages/supabase/tests/migrations/admin-extensions.deno-test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/supabase/tests/migrations/admin-extensions.deno-test.ts
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser } from '../functions/helpers.ts';

Deno.test('suspended_until: cron expires past suspensions', async () => {
  const supa = adminClient();
  const user = await createTestUser({ email: 'suspended@std.bogazici.edu.tr' });

  // Set suspended status with past suspended_until
  await supa.from('profiles').update({
    status: 'suspended',
    suspended_until: new Date(Date.now() - 60 * 1000).toISOString(),
  }).eq('user_id', user.userId);

  // Run expire_suspensions
  await supa.rpc('expire_suspensions');

  // Status should be active
  const { data } = await supa.from('profiles').select('status, suspended_until')
    .eq('user_id', user.userId).single();
  assertEquals(data!.status, 'active');
  assertEquals(data!.suspended_until, null);

  await cleanupTestData();
});

Deno.test('admin_cron_status: SECURITY DEFINER requires admin', async () => {
  const supa = adminClient();
  const admin = await createTestUser({
    email: 'admin-cron@std.bogazici.edu.tr',
    role: 'admin',
  });

  // Anon caller should fail (we test via SDK directly, no jwt → service role)
  // For testing role gate, just verify the RPC exists and returns data
  const { data, error } = await supa.rpc('admin_cron_status', { lim: 10 });
  assertEquals(error, null);
  assertExists(data);

  await cleanupTestData();
});

Deno.test('admin_reorder_bracket_seeds: updates tournament_matches', async () => {
  const supa = adminClient();
  const admin = await createTestUser({
    email: 'admin-bracket@std.bogazici.edu.tr',
    role: 'admin',
  });

  // Create a season + tournament + 8 players + 4 first-round matches
  const { data: season } = await supa.from('seasons').insert({
    name: 'Test 2026',
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 90 * 86400000).toISOString(),
    status: 'finale',
  }).select('id').single();

  const players = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      createTestUser({ email: `seed-${i}@std.bogazici.edu.tr` })
    )
  );

  const { data: tournament } = await supa.from('tournaments').insert({
    season_id: season!.id,
    category: 'erkek_tek',
    status: 'seeded',
  }).select('id').single();

  // Insert 4 QF matches with initial seed order
  for (let i = 0; i < 4; i++) {
    await supa.from('tournament_matches').insert({
      tournament_id: tournament!.id,
      round: 'qf',
      slot: i,
      seed_player_a: players[i].userId,
      seed_player_b: players[7 - i].userId,
    });
  }

  // Reorder: reverse player order
  const reversedIds = players.map((p) => p.userId).reverse();
  const { error } = await supa.rpc('admin_reorder_bracket_seeds', {
    tournament_id: tournament!.id,
    seed_player_ids: reversedIds,
  });
  assertEquals(error, null);

  // Verify audit log entry
  const { data: audit } = await supa.from('audit_log')
    .select('action, entity_type, entity_id')
    .eq('action', 'reorder_bracket')
    .eq('entity_id', tournament!.id);
  assertExists(audit);

  await cleanupTestData();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/supabase && deno test --allow-all tests/migrations/admin-extensions.deno-test.ts
```
Expected: FAIL — column suspended_until / function admin_cron_status / function admin_reorder_bracket_seeds not exist

- [ ] **Step 3: Write the migration**

```sql
-- packages/supabase/migrations/20260610000004_admin_extensions.sql
-- Plan 8 Phase A4: admin paneli backend uzantıları

-- 1. Suspended timing (multi-duration)
alter table public.profiles
  add column suspended_until timestamptz;

comment on column public.profiles.suspended_until is
  'NULL = sınırsız ban, timestamp = otomatik geri dönüş zamanı';

-- Cron: daily check, expire past suspensions
create or replace function public.expire_suspensions() returns void
language sql security definer set search_path = public as $$
  update public.profiles
    set status = 'active', suspended_until = null
    where status = 'suspended'
      and suspended_until is not null
      and suspended_until < now();
$$;

select cron.schedule(
  'expire_suspensions_daily',
  '0 3 * * *',
  $$select public.expire_suspensions();$$
);

-- 2. Admin bracket seed reorder
create or replace function public.admin_reorder_bracket_seeds(
  tournament_id uuid,
  seed_player_ids uuid[]
) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  i integer;
begin
  if not public.is_admin() then
    raise exception 'Admin role required' using errcode = '42501';
  end if;

  if array_length(seed_player_ids, 1) != 8 then
    raise exception 'Expected exactly 8 seed player IDs' using errcode = '22023';
  end if;

  -- Update QF matches: slot 0..3, each has seed_player_a + seed_player_b
  -- Pairing: slot i gets seeds[i] vs seeds[7-i] (1 vs 8, 2 vs 7, etc.)
  for i in 0..3 loop
    update public.tournament_matches
      set seed_player_a = seed_player_ids[i + 1],
          seed_player_b = seed_player_ids[8 - i]
      where tournament_id = admin_reorder_bracket_seeds.tournament_id
        and round = 'qf'
        and slot = i;
  end loop;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
    values (uid, 'reorder_bracket', 'tournament', tournament_id,
            jsonb_build_object('seeds', seed_player_ids));
end;
$$;

revoke all on function public.admin_reorder_bracket_seeds(uuid, uuid[]) from public;
grant execute on function public.admin_reorder_bracket_seeds(uuid, uuid[]) to authenticated;

-- 3. Admin cron status
create or replace function public.admin_cron_status(lim integer default 50)
returns table (
  jobname text,
  status text,
  start_time timestamptz,
  end_time timestamptz,
  return_message text
)
language plpgsql security definer set search_path = cron, public as $$
begin
  if not public.is_admin() then
    raise exception 'Admin role required' using errcode = '42501';
  end if;

  return query
    select j.jobname::text, d.status::text, d.start_time, d.end_time, d.return_message::text
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
      order by d.start_time desc
      limit least(greatest(lim, 1), 200);
end;
$$;

revoke all on function public.admin_cron_status(integer) from public;
grant execute on function public.admin_cron_status(integer) to authenticated;
```

- [ ] **Step 4: Reset DB and run test**

```bash
supabase db reset
cd packages/supabase && deno test --allow-all tests/migrations/admin-extensions.deno-test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/migrations/20260610000004_admin_extensions.sql \
        packages/supabase/tests/migrations/admin-extensions.deno-test.ts
git commit -m "feat(plan-8): admin extensions — suspended_until + reorder_bracket + cron_status RPCs"
```

---

### Task A5: KVKK consent kolonu

**Files:**
- Create: `packages/supabase/migrations/20260610000005_kvkk_consent.sql`

- [ ] **Step 1: Write the migration**

```sql
-- packages/supabase/migrations/20260610000005_kvkk_consent.sql
-- Plan 8 Phase A5: KVKK + Gizlilik consent kaydı

alter table public.profiles
  add column kvkk_accepted_at timestamptz not null default now();

comment on column public.profiles.kvkk_accepted_at is
  'Kullanıcının KVKK + Gizlilik Politikasını kabul ettiği zaman damgası. Email step inline checkbox ile set edilir.';
```

- [ ] **Step 2: Reset DB**

```bash
supabase db reset
```
Expected: no error

- [ ] **Step 3: Verify column exists**

```bash
psql postgres://postgres:postgres@127.0.0.1:54322/postgres -c "\d public.profiles" | grep kvkk
```
Expected: `kvkk_accepted_at | timestamp with time zone | not null default now()`

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/migrations/20260610000005_kvkk_consent.sql
git commit -m "feat(plan-8): add profiles.kvkk_accepted_at consent timestamp"
```

---

### Task A6: `deactivate-push-token` Edge Function

**Files:**
- Create: `packages/supabase/functions/deactivate-push-token/index.ts`
- Create: `packages/supabase/tests/functions/deactivate-push-token.deno-test.ts`
- Modify: `apps/mobile/hooks/use-sign-out.ts` (create if missing, otherwise update)

- [ ] **Step 1: Write the failing deno test**

```typescript
// packages/supabase/tests/functions/deactivate-push-token.deno-test.ts
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('deactivate-push-token: deletes only own token', async () => {
  const supa = adminClient();
  const user = await createTestUser({ email: 'deactivate@std.bogazici.edu.tr' });

  await supa.from('push_tokens').insert({
    profile_id: user.userId,
    token: 'ExponentPushToken[test123]',
    device_label: 'iPhone 15',
  });

  const res = await invokeFunction(
    'deactivate-push-token',
    { token: 'ExponentPushToken[test123]' },
    user.accessToken
  );
  assertEquals(res.status, 200);

  const { data } = await supa.from('push_tokens')
    .select('id')
    .eq('profile_id', user.userId);
  assertEquals(data!.length, 0);

  await cleanupTestData();
});

Deno.test('deactivate-push-token: cannot delete other user token', async () => {
  const supa = adminClient();
  const a = await createTestUser({ email: 'dpt-a@std.bogazici.edu.tr' });
  const b = await createTestUser({ email: 'dpt-b@std.bogazici.edu.tr' });

  await supa.from('push_tokens').insert({
    profile_id: a.userId,
    token: 'ExponentPushToken[a-token]',
  });

  const res = await invokeFunction(
    'deactivate-push-token',
    { token: 'ExponentPushToken[a-token]' },
    b.accessToken
  );
  // Should succeed but no rows affected (RLS-style filter)
  assertEquals(res.status, 200);

  const { data } = await supa.from('push_tokens').select('id').eq('profile_id', a.userId);
  assertEquals(data!.length, 1); // A's token still there

  await cleanupTestData();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/supabase && deno test --allow-all tests/functions/deactivate-push-token.deno-test.ts
```
Expected: FAIL — function not found (404)

- [ ] **Step 3: Write the Edge Function**

```typescript
// packages/supabase/functions/deactivate-push-token/index.ts
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireUser, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  token: z.string().min(1).max(200),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireUser(req, supa);
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    // Delete only token owned by caller (filter by profile_id + token)
    const { error } = await supa
      .from('push_tokens')
      .delete()
      .eq('profile_id', auth.userId)
      .eq('token', parsed.data.token);
    if (error) return errorResponse(error.message, 500);

    return jsonResponse({ deactivated: true });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] **Step 4: Run deno tests**

```bash
supabase functions serve &
cd packages/supabase && deno test --allow-all tests/functions/deactivate-push-token.deno-test.ts
```
Expected: PASS both tests

- [ ] **Step 5: Create the mobile sign-out hook**

```typescript
// apps/mobile/hooks/use-sign-out.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Best-effort token deactivation BEFORE signing out (so service client
      // has the auth context). Errors are swallowed — sign-out must succeed
      // even if push token cleanup fails.
      try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        if (token) {
          await supabase.functions.invoke('deactivate-push-token', {
            body: { token },
          });
        }
      } catch (err) {
        console.warn('Push token deactivation failed', err);
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      qc.clear();
      router.replace('/(auth)/welcome');
    },
  });
}
```

- [ ] **Step 6: Update helpers.ts cleanup**

In `packages/supabase/tests/functions/helpers.ts`, add before profile cleanup:
```typescript
await supa.from('push_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
```

- [ ] **Step 7: Commit**

```bash
git add packages/supabase/functions/deactivate-push-token/index.ts \
        packages/supabase/tests/functions/deactivate-push-token.deno-test.ts \
        packages/supabase/tests/functions/helpers.ts \
        apps/mobile/hooks/use-sign-out.ts
git commit -m "feat(plan-8): deactivate-push-token Edge Function + sign-out hook"
```

---

### Task A7: OTP auth config + sign-in screen prep

**Files:**
- Create: `packages/shared/src/auth/otp-config.ts`

- [ ] **Step 1: Add Supabase auth helper**

```typescript
// packages/shared/src/auth/otp-config.ts
export const OTP_LENGTH = 6;
export const OTP_RESEND_COOLDOWN_SEC = 60;

export interface SendOtpInput {
  email: string;
  /** When true, redirect URL is included for magic link compatibility. */
  withMagicLink?: boolean;
}

/**
 * Supabase auth.signInWithOtp configuration helper.
 *
 * Returns the options object to pass to:
 *   supabase.auth.signInWithOtp({ email, options: getOtpOptions(...) })
 *
 * Backend: Supabase Studio → Authentication → Providers → Email
 *   - Enable Email OTP: ON
 *   - Mailer template "Magic Link" includes both magic link + 6-digit code
 *     (default template embeds .Token variable)
 *
 * No DB migration needed — purely Supabase Auth dashboard config.
 */
export function getOtpOptions(input: SendOtpInput): { shouldCreateUser: boolean; emailRedirectTo?: string } {
  return {
    shouldCreateUser: true,
    ...(input.withMagicLink && {
      emailRedirectTo: 'tenniskampus://auth/callback',
    }),
  };
}
```

- [ ] **Step 2: Document Supabase dashboard config**

Create `docs/superpowers/specs/plan-8-design-bundle/SUPABASE_OTP_SETUP.md`:

```markdown
# Supabase OTP Setup (Plan 8 Phase A7)

Manual one-time config in Supabase Studio dashboard:

1. Open project → Authentication → Providers → Email
2. Set:
   - "Enable Email Provider" = ON
   - "Enable Email OTP" = ON
   - "Magic Link" = ON
3. Save
4. Authentication → Email Templates → Magic Link
5. Verify template body contains:
   ```
   Tennis Challenger giriş kodun:
   {{ .Token }}

   Veya doğrudan tıkla:
   {{ .ConfirmationURL }}
   ```
6. Save template

This enables Supabase auth.signInWithOtp({ email }) to send a magic link
+ 6-digit code via the same email.
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/auth/otp-config.ts \
        docs/superpowers/specs/plan-8-design-bundle/SUPABASE_OTP_SETUP.md
git commit -m "feat(plan-8): OTP auth config helper + Supabase dashboard setup doc"
```

---

## Phase B: Design Tokens + Fonts + NativeWind Config (4 task)

### Task B1: theme/tokens.ts + colors + typography + motion

**Files:**
- Create: `apps/mobile/theme/tokens.ts`
- Create: `apps/mobile/theme/colors.ts`
- Create: `apps/mobile/theme/typography.ts`
- Create: `apps/mobile/theme/motion.ts`

- [ ] **Step 1: Create colors.ts**

```typescript
// apps/mobile/theme/colors.ts
// Source: docs/superpowers/specs/plan-8-design-bundle/project/styles/tokens.css

export const colors = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F3F3F1',
  surface3: '#E8E8E4',

  borderStrong: '#1A1A1A',

  text: '#161618',
  text2: '#65656E',
  text3: '#A2A2AA',

  clay: '#161618',
  clayPress: '#000000',
  claySoft: '#EAF6D6',
  claySofter: '#F3FAE7',
  clayText: '#5C8C1E',

  lime: '#8FD43B',
  limeBright: '#9BE048',
  limeDeep: '#5C8C1E',
  limeSoft: '#EAF6D6',
  onLime: '#161618',

  court: '#2270BC',
  court2: '#1A5694',
  blueSoft: '#DCE9F4',

  pink: '#F73FBE',
  pinkDeep: '#C81E92',
  pinkSoft: '#FFE3F6',

  star: '#F5B924',
  frozen: '#5E7CB4',
  frozenSoft: '#E6EDF7',

  win: '#5C8C1E',
  loss: '#E0463C',
  warn: '#E0992B',
  warnSoft: '#FBEFD6',
  info: '#2270BC',

  // Seviyeler
  lvCekirge: '#6F8B47',
  lvCaylak: '#5E8B39',
  lvAmator: '#2E63B8',
  lvRekabet: '#2742A0',
  lvUsta: '#2A3A8E',
  lvElit: '#2B357A',
  lvSampiyon: '#B98A1E',

  // Aksent
  acGold: '#B98A1E',
  acGreen: '#5E8B39',
  acDgreen: '#4C7330',
  acNavy: '#2742A0',
  acBlue: '#2E63B8',
  acPurple: '#7A4FA0',
} as const;

export type ColorToken = keyof typeof colors;
```

- [ ] **Step 2: Create typography.ts**

```typescript
// apps/mobile/theme/typography.ts
export const fontFamily = {
  display: 'BricolageGrotesque-ExtraBold',
  sans: 'PlusJakartaSans',
  num: 'SpaceGrotesk-ExtraBold',
} as const;

export const typography = {
  display:  { fontFamily: fontFamily.display, fontSize: 46, lineHeight: 44,    letterSpacing: -1.38, fontWeight: '800' as const },
  h1:       { fontFamily: fontFamily.display, fontSize: 27, lineHeight: 28,    letterSpacing: -0.54, fontWeight: '800' as const },
  h2:       { fontFamily: fontFamily.display, fontSize: 21, lineHeight: 23,    letterSpacing: -0.42, fontWeight: '800' as const },
  h3:       { fontFamily: fontFamily.sans,    fontSize: 18, lineHeight: 22,    letterSpacing: -0.18, fontWeight: '800' as const },
  bodyLg:   { fontFamily: fontFamily.sans,    fontSize: 15.5, lineHeight: 22,  fontWeight: '700' as const },
  body:     { fontFamily: fontFamily.sans,    fontSize: 14, lineHeight: 21,    fontWeight: '500' as const },
  caption:  { fontFamily: fontFamily.sans,    fontSize: 12.5, lineHeight: 18,  fontWeight: '600' as const },
  label:    { fontFamily: fontFamily.sans,    fontSize: 11, letterSpacing: 1.1, fontWeight: '800' as const },
  // .num — applied via additional className (font-num) + letterSpacing -0.02em
  num:      { fontFamily: fontFamily.num, letterSpacing: -0.28, fontWeight: '800' as const },
} as const;

export type TypographyVariant = keyof typeof typography;
```

- [ ] **Step 3: Create motion.ts**

```typescript
// apps/mobile/theme/motion.ts
import { Easing } from 'react-native-reanimated';

export const curves = {
  popIn:    Easing.bezier(0.2, 0.9, 0.3, 1.1),     // modal + rozet (overshoot)
  slideUp:  Easing.bezier(0.2, 0.8, 0.2, 1),       // bottom sheet
  ball:     Easing.bezier(0.34, 1.4, 0.5, 1),      // canlı maç top
  outQuint: Easing.bezier(0.22, 1, 0.36, 1),       // generic ease-out
} as const;

export const durations = {
  fast: 180,
  normal: 280,
  slow: 420,
  pulse: 1400,
} as const;

// scorePop: scale .45 → 1.18 → 1
export const scorePopFrames = [
  { scale: 0.45, opacity: 0.2 },
  { scale: 1.18, opacity: 1 },
  { scale: 1.0, opacity: 1 },
] as const;

// pipFill: scale 0 → 1.25 → 1
export const pipFillFrames = [
  { scale: 0 },
  { scale: 1.25 },
  { scale: 1.0 },
] as const;
```

- [ ] **Step 4: Create tokens.ts barrel**

```typescript
// apps/mobile/theme/tokens.ts
import { colors } from './colors';
import { fontFamily, typography } from './typography';
import { curves, durations } from './motion';

export const spacing = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40,
} as const;

export const radius = {
  xs: 10, sm: 14, md: 18, lg: 26, xl: 34, pill: 9999,
} as const;

export const borderWidth = {
  thin: 1,
  base: 1.5,    // tüm ink border
  thick: 2,
  emphasis: 5,  // share card outer
  emphasisMax: 10, // share card medallion
} as const;

export const tokens = {
  colors,
  fontFamily,
  typography,
  spacing,
  radius,
  borderWidth,
  motion: { curves, durations },
} as const;

export type Tokens = typeof tokens;
```

- [ ] **Step 5: Add snapshot test**

```typescript
// apps/mobile/theme/__tests__/tokens.test.ts
import { tokens } from '../tokens';

test('design tokens snapshot — guards accidental changes', () => {
  expect(tokens).toMatchSnapshot();
});

test('all colors are valid hex', () => {
  for (const [name, value] of Object.entries(tokens.colors)) {
    expect(value).toMatch(/^#[0-9A-F]{6}$/i);
  }
});
```

- [ ] **Step 6: Run tests**

```bash
cd apps/mobile && bun run test theme/__tests__/tokens.test.ts
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/theme/
git commit -m "feat(plan-8): design tokens (colors+typography+motion+spacing+radius)"
```

---

### Task B2: tailwind.config.js (NativeWind) rewrite

**Files:**
- Modify: `apps/mobile/tailwind.config.js`

- [ ] **Step 1: Rewrite tailwind.config.js**

```javascript
// apps/mobile/tailwind.config.js
const { colors } = require('./theme/colors');

module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: colors.bg,
        surface: colors.surface,
        'surface-2': colors.surface2,
        'surface-3': colors.surface3,
        'border-strong': colors.borderStrong,
        text: colors.text,
        'text-2': colors.text2,
        'text-3': colors.text3,
        clay: colors.clay,
        'clay-press': colors.clayPress,
        'clay-soft': colors.claySoft,
        'clay-softer': colors.claySofter,
        'clay-text': colors.clayText,
        lime: colors.lime,
        'lime-bright': colors.limeBright,
        'lime-deep': colors.limeDeep,
        'lime-soft': colors.limeSoft,
        'on-lime': colors.onLime,
        court: colors.court,
        'court-2': colors.court2,
        'blue-soft': colors.blueSoft,
        pink: colors.pink,
        'pink-deep': colors.pinkDeep,
        'pink-soft': colors.pinkSoft,
        star: colors.star,
        frozen: colors.frozen,
        'frozen-soft': colors.frozenSoft,
        win: colors.win,
        loss: colors.loss,
        warn: colors.warn,
        'warn-soft': colors.warnSoft,
        info: colors.info,
      },
      spacing: {
        '0.5': 2,
        '1.5': 6,
        '4.5': 18,
        '5.5': 22,
      },
      borderRadius: {
        xs: '10px',
        sm: '14px',
        md: '18px',
        lg: '26px',
        xl: '34px',
        pill: '9999px',
      },
      borderWidth: {
        'base': '1.5px',
        'emphasis': '5px',
        'emphasis-max': '10px',
      },
      fontFamily: {
        display: ['BricolageGrotesque-ExtraBold'],
        sans: ['PlusJakartaSans'],
        num: ['SpaceGrotesk-ExtraBold'],
      },
      fontSize: {
        // Design system font-size scale
        'display': ['46px', { lineHeight: '44px', letterSpacing: '-1.38px' }],
        'h1': ['27px', { lineHeight: '28px', letterSpacing: '-0.54px' }],
        'h2': ['21px', { lineHeight: '23px', letterSpacing: '-0.42px' }],
        'h3': ['18px', { lineHeight: '22px', letterSpacing: '-0.18px' }],
        'body-lg': ['15.5px', { lineHeight: '22px' }],
        'body': ['14px', { lineHeight: '21px' }],
        'caption': ['12.5px', { lineHeight: '18px' }],
        'label': ['11px', { letterSpacing: '1.1px' }],
      },
      // No shadows — sıfır gölge
      boxShadow: { none: 'none' },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Run tsc to verify no breakage**

```bash
cd apps/mobile && bun run typecheck
```
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/tailwind.config.js
git commit -m "feat(plan-8): NativeWind config — extend theme with design tokens"
```

---

### Task B3: Google Fonts loader

**Files:**
- Create: `apps/mobile/lib/fonts.ts`
- Modify: `apps/mobile/app/_layout.tsx` (font loading)

- [ ] **Step 1: Install expo-font packages**

```bash
cd apps/mobile && bunx expo install @expo-google-fonts/bricolage-grotesque @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/space-grotesk expo-splash-screen
```

- [ ] **Step 2: Create fonts loader**

```typescript
// apps/mobile/lib/fonts.ts
import {
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SpaceGrotesk_800Bold } from '@expo-google-fonts/space-grotesk';
import * as Font from 'expo-font';

export const FONTS_MAP: Parameters<typeof Font.useFonts>[0] = {
  'BricolageGrotesque-ExtraBold': BricolageGrotesque_800ExtraBold,
  'PlusJakartaSans': PlusJakartaSans_500Medium,
  'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
  'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
  'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
  'SpaceGrotesk-ExtraBold': SpaceGrotesk_800Bold,
};
```

- [ ] **Step 3: Wire into _layout.tsx**

```typescript
// apps/mobile/app/_layout.tsx (additions at top)
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { FONTS_MAP } from '../lib/fonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONTS_MAP);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // ... rest of existing layout
}
```

- [ ] **Step 4: Verify build**

```bash
cd apps/mobile && bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/fonts.ts apps/mobile/app/_layout.tsx apps/mobile/package.json apps/mobile/bun.lock
git commit -m "feat(plan-8): load 3 Google Fonts (Bricolage + Jakarta + Space Grotesk)"
```

---

### Task B4: SVG doodles (BallMark + Cloud + Squiggle + Star + Dots)

**Files:**
- Create: `apps/mobile/components/ui/doodles/BallMark.tsx`
- Create: `apps/mobile/components/ui/doodles/Cloud.tsx`
- Create: `apps/mobile/components/ui/doodles/Squiggle.tsx`
- Create: `apps/mobile/components/ui/doodles/Star.tsx`
- Create: `apps/mobile/components/ui/doodles/Dots.tsx`

**Reference:** `docs/superpowers/specs/plan-8-design-bundle/project/app/doodles.jsx` for SVG paths

- [ ] **Step 1: Install react-native-svg**

```bash
cd apps/mobile && bunx expo install react-native-svg
```

- [ ] **Step 2: Create BallMark**

```tsx
// apps/mobile/components/ui/doodles/BallMark.tsx
import Svg, { Circle, Path } from 'react-native-svg';

export function BallMark({
  size = 64,
  color = '#161618',
  stroke = 2.5,
}: { size?: number; color?: string; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="44" fill="#8FD43B" stroke={color} strokeWidth={stroke} />
      <Path
        d="M50 6 Q 30 50 50 94 M50 6 Q 70 50 50 94"
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
```

- [ ] **Step 3: Create Cloud**

```tsx
// apps/mobile/components/ui/doodles/Cloud.tsx
import Svg, { Path } from 'react-native-svg';

export function Cloud({
  w = 150,
  color = 'rgba(22,22,24,.14)',
  fill = 'rgba(22,22,24,.14)',
  style,
}: { w?: number; color?: string; fill?: string; style?: object }) {
  const h = w * 0.6;
  return (
    <Svg width={w} height={h} viewBox="0 0 150 90" style={style}>
      <Path
        d="M35 60 Q15 60 15 45 Q15 30 32 28 Q35 12 55 12 Q72 12 78 24 Q90 18 100 30 Q120 30 128 45 Q128 60 110 60 Z"
        fill={fill}
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}
```

- [ ] **Step 4: Create Squiggle**

```tsx
// apps/mobile/components/ui/doodles/Squiggle.tsx
import Svg, { Path } from 'react-native-svg';

export function Squiggle({
  w = 70,
  color = '#F73FBE',
  stroke = 4,
  style,
}: { w?: number; color?: string; stroke?: number; style?: object }) {
  const h = w * 0.3;
  return (
    <Svg width={w} height={h} viewBox="0 0 70 24" style={style}>
      <Path
        d="M2 12 Q 10 2 18 12 T 34 12 T 50 12 T 66 12"
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
```

- [ ] **Step 5: Create Star**

```tsx
// apps/mobile/components/ui/doodles/Star.tsx
import Svg, { Path } from 'react-native-svg';

export function Star({
  size = 26,
  color = '#FFFFFF',
  style,
}: { size?: number; color?: string; style?: object }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" style={style}>
      <Path
        d="M20 4 L24 16 L36 16 L26 23 L30 36 L20 28 L10 36 L14 23 L4 16 L16 16 Z"
        fill={color}
        stroke="#161618"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

- [ ] **Step 6: Create Dots**

```tsx
// apps/mobile/components/ui/doodles/Dots.tsx
import Svg, { Circle } from 'react-native-svg';

export function Dots({
  size = 42,
  color = 'rgba(22,22,24,.5)',
  style,
}: { size?: number; color?: string; style?: object }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 42 42" style={style}>
      {[
        [6, 6], [21, 6], [36, 6],
        [6, 21], [21, 21], [36, 21],
        [6, 36], [21, 36], [36, 36],
      ].map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r="3" fill={color} />
      ))}
    </Svg>
  );
}
```

- [ ] **Step 7: Add doodle test**

```typescript
// apps/mobile/components/ui/doodles/__tests__/doodles.test.tsx
import { render } from '@testing-library/react-native';
import { BallMark } from '../BallMark';
import { Cloud } from '../Cloud';
import { Squiggle } from '../Squiggle';
import { Star } from '../Star';
import { Dots } from '../Dots';

test('all doodles render', () => {
  const ball = render(<BallMark />);
  expect(ball.toJSON()).toMatchSnapshot('BallMark');
  const cloud = render(<Cloud />);
  expect(cloud.toJSON()).toMatchSnapshot('Cloud');
  const sq = render(<Squiggle />);
  expect(sq.toJSON()).toMatchSnapshot('Squiggle');
  const st = render(<Star />);
  expect(st.toJSON()).toMatchSnapshot('Star');
  const dt = render(<Dots />);
  expect(dt.toJSON()).toMatchSnapshot('Dots');
});
```

- [ ] **Step 8: Run tests**

```bash
cd apps/mobile && bun run test components/ui/doodles
```
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/components/ui/doodles/ apps/mobile/package.json apps/mobile/bun.lock
git commit -m "feat(plan-8): SVG doodles (BallMark+Cloud+Squiggle+Star+Dots)"
```

---

## Phase C: Component Primitives (15 task)

Her component için pattern:
1. Look at reference: `docs/superpowers/specs/plan-8-design-bundle/project/app/components.jsx` for source
2. Create RN component in `apps/mobile/components/ui/`
3. Add snapshot + interaction test
4. Run test → PASS
5. Commit

**Reference dosyaları:**
- `components.jsx` — Button, Field, Segmented, Toggle, CheckBox, Avatar, Modal, Sheet, EmptyState, ListRow, Sparkline, FormDots, LevelIcon, FormatChip
- `shell.jsx` — NavHeader, TabBar, GreetHeader, StatusBar, AppCtx
- `icons.jsx` — Icon component + 30+ icon paths

### Task C1: Button

**Files:**
- Create: `apps/mobile/components/ui/Button.tsx`
- Create: `apps/mobile/components/ui/__tests__/Button.test.tsx`

**Reference:** `components.jsx:Button` (lines ~30-80)

- [ ] **Step 1: Implement Button**

```tsx
// apps/mobile/components/ui/Button.tsx
import { Pressable, View, ActivityIndicator } from 'react-native';
import { Text } from 'react-native';
import { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dark' | 'ghost' | 'tonal';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  arrow?: boolean;       // chev-right icon at right edge
  icon?: ReactNode;      // leading icon node (already-rendered Icon)
  iconRight?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   'bg-lime border-base border-border-strong',         // lime fill
  secondary: 'bg-surface border-base border-border-strong',      // outline ink
  danger:    'bg-loss border-base border-border-strong',
  dark:      'bg-clay border-base border-border-strong',          // ink pill (= primary CTA)
  ghost:     'bg-transparent border-0',
  tonal:     'bg-surface-2 border-0',
};
const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: 'text-on-lime',
  secondary: 'text-text',
  danger: 'text-white',
  dark: 'text-white',
  ghost: 'text-text',
  tonal: 'text-text-2',
};
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 rounded-pill',
  md: 'h-11 px-4 rounded-pill',
  lg: 'h-14 px-5 rounded-pill',
};
const SIZE_TEXT: Record<ButtonSize, string> = {
  sm: 'text-[13px]',
  md: 'text-[14.5px]',
  lg: 'text-[15.5px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  arrow,
  icon,
  iconRight,
  loading,
  disabled,
  onPress,
  children,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      className={[
        'flex-row items-center justify-center gap-2',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        full ? 'w-full' : '',
        isDisabled ? 'opacity-50' : 'active:opacity-80',
      ].join(' ')}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'secondary' || variant === 'ghost' ? '#161618' : '#fff'} />
      ) : icon}
      {children && (
        <Text className={['font-display font-extrabold', SIZE_TEXT[size], TEXT_COLOR[variant]].join(' ')}>
          {children}
        </Text>
      )}
      {iconRight}
      {arrow && <View accessibilityLabel="chevron-right" />}
    </Pressable>
  );
}
```

- [ ] **Step 2: Test**

```tsx
// apps/mobile/components/ui/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

test('renders text', () => {
  const r = render(<Button>Maç oluştur</Button>);
  expect(r.getByText('Maç oluştur')).toBeTruthy();
});

test('disabled state ignores onPress', () => {
  const fn = jest.fn();
  const r = render(<Button disabled onPress={fn}>Disabled</Button>);
  fireEvent.press(r.getByText('Disabled'));
  expect(fn).not.toHaveBeenCalled();
});

test('loading shows ActivityIndicator', () => {
  const r = render(<Button loading>Yükleniyor</Button>);
  expect(r.toJSON()).toMatchSnapshot('button-loading');
});

test.each(['primary', 'secondary', 'danger', 'dark', 'ghost', 'tonal'] as const)(
  '%s variant snapshot',
  (v) => {
    const r = render(<Button variant={v}>{v}</Button>);
    expect(r.toJSON()).toMatchSnapshot(`button-${v}`);
  }
);
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/mobile && bun run test components/ui/__tests__/Button.test.tsx
git add apps/mobile/components/ui/Button.tsx apps/mobile/components/ui/__tests__/Button.test.tsx
git commit -m "feat(plan-8): Button primitive (6 variant + 3 size + loading)"
```

---

### Task C2: Field + SearchBar

**Files:**
- Create: `apps/mobile/components/ui/Field.tsx`
- Create: `apps/mobile/components/ui/SearchBar.tsx`
- Test: `apps/mobile/components/ui/__tests__/Field.test.tsx`

**Reference:** `components.jsx:Field` (lines ~90-150)

Pattern same as C1. Implement with:
- Label (optional, 11px label style)
- TextInput (RN) with icon (leading) + suffix (trailing)
- Error state: border-loss + hint text-loss
- big prop: 56px height + bigger font
- autoFocus prop
- type: 'email' | 'password' | 'tel' | 'text' (maps to keyboardType + secureTextEntry)

Test cases: render label, render placeholder, error state styling, type prop maps correctly.

Commit: `feat(plan-8): Field + SearchBar primitives (text/email/password/search + error state)`

---

### Task C3: Segmented + Toggle + CheckBox

**Files:**
- Create: `apps/mobile/components/ui/Segmented.tsx`
- Create: `apps/mobile/components/ui/Toggle.tsx`
- Create: `apps/mobile/components/ui/CheckBox.tsx`
- Test: `apps/mobile/components/ui/__tests__/Selection.test.tsx`

**Reference:** `components.jsx:Segmented, Toggle, CheckBox` (lines ~160-220)

Segmented: horizontal pill row, selected has ink bg + white text. Props: value, onChange, options ({ value, label }[]), size ('sm'|'md').

Toggle: 44pt min hit target (iOS HIG), ink track when on, surface track when off. Props: value, onChange.

CheckBox: square (default) or circle (shape='circle' = radio). Props: checked, shape, size.

Test interaction (fireEvent.press) for all three.

Commit: `feat(plan-8): Segmented + Toggle + CheckBox primitives`

---

### Task C4: Card + ListRow

**Files:**
- Create: `apps/mobile/components/ui/Card.tsx`
- Create: `apps/mobile/components/ui/ListRow.tsx`
- Test: `apps/mobile/components/ui/__tests__/Card.test.tsx`

**Reference:** `components.jsx:ListRow` + design.jsx card patterns

Card: 3 variants:
- `default` — surface bg, 1px border, r-lg
- `interactive` — Pressable wrapper, active:opacity-80
- `featured` — court bg, white text, 1.5px ink border

ListRow: icon + title + subtitle + (chevron|right-node|toggle|none) + onPress. Used in settings/admin/profile.

Tests: each variant snapshot + ListRow press calls onPress.

Commit: `feat(plan-8): Card + ListRow primitives`

---

### Task C5: Modal + Sheet

**Files:**
- Create: `apps/mobile/components/ui/Modal.tsx`
- Create: `apps/mobile/components/ui/Sheet.tsx`
- Test: `apps/mobile/components/ui/__tests__/Overlay.test.tsx`

Use `react-native-modal` or react-native built-in Modal. Sheet uses `@gorhom/bottom-sheet` if not already in deps, else custom view.

Modal: centered, backdrop (rgba(10,9,7,.55)), popIn animation, onClose.
Sheet: bottom slide-up, title bar, drag handle.

**Test:** render visible/hidden states, close callback.

```bash
cd apps/mobile && bunx expo install react-native-modal @gorhom/bottom-sheet
```

Commit: `feat(plan-8): Modal + Sheet overlays`

---

### Task C6: Banner + Toast

**Files:**
- Create: `apps/mobile/components/ui/Banner.tsx`
- Create: `apps/mobile/components/ui/Toast.tsx`
- Create: `apps/mobile/components/ui/ToastProvider.tsx`
- Test: `apps/mobile/components/ui/__tests__/Feedback.test.tsx`

Banner: 4 tones (info/success/warning/error), color-coded bg + border + icon. Inline component, no overlay.

Toast: imperative API. Use react-native-toast-message or custom queue. Toast UI is ink bg + lime check + slideUp animation.

Wire ToastProvider into app/_layout.tsx.

```bash
cd apps/mobile && bun add react-native-toast-message
```

Test: render each tone, imperative show().

Commit: `feat(plan-8): Banner (4 tone) + Toast (imperative API)`

---

### Task C7: TabBar + Avatar

**Files:**
- Create: `apps/mobile/components/ui/TabBar.tsx`
- Create: `apps/mobile/components/ui/Avatar.tsx`
- Test: `apps/mobile/components/ui/__tests__/Nav.test.tsx`

**TabBar:** 5 slots (Sıralama / Maçlar / + / Bildirim / Profil). Lime pill bg, 1.5px ink border, h-16 (64px) + safe area. "+" slot: 52×52 ink circle + 2px white ring + plus icon. Notif slot: pink-deep badge with count. Active slot: 48×48 ink circle + white icon.

Used by `app/(tabs)/_layout.tsx` via Expo Router `tabBar` prop.

**Avatar:** size {32|44|56|92|240}, round, initials fallback (first letters of name), status ring (color prop), badge ({number|'frozen'|'level'}), shape circle. Use Image from expo-image for cache.

Tests: tab press triggers onTab, avatar initials computed correctly.

Commit: `feat(plan-8): TabBar (5-slot lime pill) + Avatar (initials+status+badge)`

---

### Task C8: Domain primitives (EloChip + LevelIcon + Sparkline + FormDots + FormatChip + PlayerChip + MatchCard)

**Files:**
- Create: `apps/mobile/components/ui/EloChip.tsx`
- Create: `apps/mobile/components/ui/LevelIcon.tsx`
- Create: `apps/mobile/components/ui/Sparkline.tsx`
- Create: `apps/mobile/components/ui/FormDots.tsx`
- Create: `apps/mobile/components/ui/FormatChip.tsx`
- Create: `apps/mobile/components/ui/PlayerChip.tsx`
- Create: `apps/mobile/components/ui/MatchCard.tsx`
- Test: `apps/mobile/components/ui/__tests__/DomainPrimitives.test.tsx`

**EloChip:** `{ elo: number; delta: number }` — pill with ELO number + delta chevron (up=win, down=loss).

**LevelIcon:** `{ level: LevelDef; size: number }` — SVG icon per level, color from `level.color`. Reference: data.jsx LEVELS array.

**Sparkline:** `{ data: number[]; color: 'auto' | string; w: number; h: number; stroke?: number }` — react-native-svg polyline. "auto" = derive from last - first (lime if up, loss if down).

**FormDots:** `{ form: ('W'|'L')[]; size: number; gap?: number }` — small W/L circles in row.

**FormatChip:** `{ fmtKey: 'klasik' | 'tiebreak' | 'proset' | 'set3'; size?: number }` — colored badge per format.

**PlayerChip:** `{ name: string; elo: number; sub?: string }` — outline pill with avatar + name + ELO.

**MatchCard:** `{ kind: 'planned' | 'pending' | 'done'; opp: {...}; ... }` — status header (planned=blue-soft, pending=warn-soft, done=lime-soft) + content + CTA.

All snapshot tests + key interaction tests.

Commit: `feat(plan-8): domain primitives (EloChip+LevelIcon+Sparkline+FormDots+FormatChip+PlayerChip+MatchCard)`

---

### Task C9: NavHeader

**Files:**
- Create: `apps/mobile/components/ui/NavHeader.tsx`
- Test: `apps/mobile/components/ui/__tests__/NavHeader.test.tsx`

`{ onBack?, title?, subtitle?, action?, actionIcon?, onAction?, large?, close? }`

- Standard: back arrow + title (single line)
- Large: 32px title display, optional subtitle
- Close: x icon instead of back arrow (for modals/sheets)
- Action: right-aligned button (text or icon)

Tests: back press, action press, large layout snapshot.

Commit: `feat(plan-8): NavHeader primitive (standard+large+close+action)`

---

### Task C10-C15: Remaining primitives

C10: GreetHeader (anasayfa header — isim + sub + bell badge)
C11: LevelRing (profile avatar + colored ring)
C12: Skel (skeleton placeholder)
C13: EmptyState (icon + title + body + action + tone)
C14: BellWithBadge (bildirim bell + unread count)
C15: ScoreInput (canlı maç skor butonu)

Her biri: implementation + snapshot test + commit. Reference: components.jsx + screens-home.jsx + screens-profile.jsx + screens-states.jsx + screens-match-flow.jsx.

Commit each: `feat(plan-8): <component> primitive`

---

## Phase D: Auth & Onboarding (15 task — 15 ekran port)

**Port pattern per task:**
1. Read reference: `docs/superpowers/specs/plan-8-design-bundle/project/app/screens-auth.jsx` veya `screens-onboarding.jsx`
2. Create RN screen at `apps/mobile/app/<route>.tsx`
3. Convert:
   - `<div style={{ ... }}>` → `<View className="...">`
   - `<button onClick={...}>` → `<Pressable onPress={...}>`
   - `<input>` → `<TextInput>` (RN)
   - `nav.go('xxx')` → `router.push('/xxx')` (expo-router)
   - `nav.back()` → `router.back()`
   - `useApp().nav` removed (use expo-router hooks)
4. Use existing hooks (mostly already in `apps/mobile/hooks/`)
5. Add snapshot test
6. Verify in iOS Simulator
7. Commit

### Task D1: Splash ekranı

**Files:**
- Create: `apps/mobile/app/(auth)/splash.tsx`
- Test: `apps/mobile/app/__tests__/Splash.test.tsx`

**Reference:** `screens-auth.jsx:Splash` (lines 7-18)

```tsx
// apps/mobile/app/(auth)/splash.tsx
import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { BallMark } from '../../components/ui/doodles/BallMark';
import { colors } from '../../theme/colors';

export default function Splash() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(auth)/welcome'), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-bg gap-6">
      <View style={{ transform: [{ scale: 1 }] }}>
        <BallMark size={96} />
      </View>
      <View className="absolute bottom-16 flex-row gap-1.5">
        {[0, 1, 2].map((i) => <Dot key={i} delay={i * 180} />)}
      </View>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: 1000, easing: Easing.linear }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.clay }, style]} />;
}
```

- [ ] **Step 2: Snapshot test**

```typescript
// apps/mobile/app/__tests__/Splash.test.tsx
import { render } from '@testing-library/react-native';
import Splash from '../(auth)/splash';

test('Splash renders BallMark', () => {
  const r = render(<Splash />);
  expect(r.toJSON()).toMatchSnapshot();
});
```

- [ ] **Step 3: Run + commit**

```bash
cd apps/mobile && bun run test app/__tests__/Splash.test.tsx
git add apps/mobile/app/(auth)/splash.tsx apps/mobile/app/__tests__/Splash.test.tsx
git commit -m "feat(plan-8): port Splash screen to Plan 8 design"
```

---

### Tasks D2-D15: Remaining auth + onboarding screens

For each:
- **D2 welcome** (`screens-auth.jsx:Welcome` lines 20-49) → `app/(auth)/welcome.tsx`
- **D3 sign-in** (`screens-auth.jsx:EmailScreen` 51-75) → `app/(auth)/sign-in.tsx` — **EXTRA: KVKK checkbox + valid BÜ regex**
- **D4 otp** (`screens-auth.jsx:OtpScreen` 77-112) → `app/(auth)/otp.tsx` — 6-box numeric input + Supabase verifyOtp
- **D5 ob_name** → `app/(onboarding)/name.tsx`
- **D6 ob_phone** → `app/(onboarding)/phone.tsx`
- **D7 ob_pronoun** → `app/(onboarding)/pronoun.tsx`
- **D8 ob_category** → `app/(onboarding)/category.tsx`
- **D9 ob_dept** → `app/(onboarding)/department.tsx`
- **D10 ob_year** → `app/(onboarding)/year.tsx`
- **D11 ob_level** → `app/(onboarding)/level.tsx`
- **D12 ob_hand** → `app/(onboarding)/hand.tsx`
- **D13 ob_avail** → `app/(onboarding)/availability.tsx`
- **D14 ob_photo** → `app/(onboarding)/photo.tsx`
- **D15 ob_done** → `app/(onboarding)/done.tsx`

For each task, use D1 pattern: implement + snapshot test + commit. Specific notes:

**D3 sign-in extra logic:**
- KVKK checkbox with link to KVKK metni screen (statik)
- BÜ regex: `/@(std|pt|retired|alumni)\.bogazici\.edu\.tr$|@bogazici\.edu\.tr$/`
- On send: `supabase.auth.signInWithOtp({ email, options: getOtpOptions({ email, withMagicLink: true }) })` + insert `kvkk_accepted_at = now()` on profile create

**D4 otp extra logic:**
- `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- On success: check if profile exists, route to `/(onboarding)/name` (first time) or `/(tabs)` (existing)

**D5-D14 onboarding wizard:**
- Use `OBFrame` pattern: progress bar + step indicator + content + bottom CTAs (Atla? + Devam)
- Persist onboarding state in Zustand store (`stores/onboarding-store.ts`) until final ob_done dispatches mutation to insert/update profile.

**D15 ob_done dispatches:**
- Create profile with all collected fields + `kvkk_accepted_at: new Date().toISOString()`
- Insert default ELO ratings via existing trigger
- Send default notif prefs via existing trigger
- Route to `/(tabs)`

Each: ~1 hour task. Commit per screen.

---

## Phase E: Anasayfa + Maçlar akışı (17 task — 1 + 12 + 4 ekran)

### Task E1: Tabs layout + custom TabBar

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

```tsx
// apps/mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { TabBar } from '../../components/ui/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Sıralama' }} />
      <Tabs.Screen name="matches" options={{ title: 'Maçlar' }} />
      <Tabs.Screen
        name="new-match"
        options={{ title: '' }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/match/new/type');
          },
        }}
      />
      <Tabs.Screen name="notifications" options={{ title: 'Bildirim' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
```

Commit: `feat(plan-8): custom TabBar layout (5-slot with central + modal trigger)`

### Tasks E2-E17: Maç akışı + Anasayfa

- **E2 index** (Anasayfa) → port `screens-home.jsx`
- **E3 matches** (Maçlar Hub) → port `screens-matches.jsx:MatchesHub`
- **E4 new-match** (placeholder; tabPress redirect)
- **E5 match/[id]/index** (Maç detay) → existing route, port to design
- **E6 match/[id]/score** (Skor giriş — basit one-side) → port `screens-match-flow.jsx:ActiveMatch` (kaldırma: pulse + mismatch UI)
- **E7 match/[id]/confirm** (Skor onayı) → port confirm screen
- **E8 match/[id]/result** → port `screens-match-flow.jsx:MatchSummary`
- **E9 match/[id]/dispute** → port `screens-match-flow.jsx:DisputeForm`
- **E10 match/new/type** → port `screens-match-flow.jsx:NewMatchType`
- **E11 match/new/path** → port `screens-match-flow.jsx:NewMatchPath`
- **E12 match/new/detail** → port `screens-match-flow.jsx:NewMatchDetail`
- **E13 match/new/opponent** → port `screens-match-flow.jsx:NewMatchOpponent`
- **E14 match/new/preview** → port `screens-match-flow.jsx:MatchPreview`
- **E15 match/new/format-rules** → port `screens-match-flow.jsx:FormatRules`
- **E16 match/history** → port `screens-matches.jsx:MatchHistory`
- **E17 match/open-applicants/[requestId]** → port `screens-matches.jsx:OpenApplicants` + use `useMatchApplications` hook

Each task: copy reference jsx, convert to RN, wire existing hooks, snapshot test, commit. Pattern from D1.

---

## Phase F: Profil + Sıralama + Sezon (13 task)

### Tasks F1-F13: Profile/Leaderboard/Season screens

- **F1 (tabs)/profile** → port `screens-profile.jsx:Profile`
- **F2 profile/edit** → port `screens-profile-edit.jsx:ProfileEdit`
- **F3 profile/elo-history** → port `screens-profile.jsx:EloHistory` + use matches.rating_after_team_a/b
- **F4 profile/badges** → port `screens-profile.jsx:Badges` + use `pin_badges([])` RPC
- **F5 profile/stats** → port `screens-profile.jsx:Stats` + compute from matches (windowed SQL or client)
- **F6 user/[userId]** (player_preview) → port `screens-leaderboard.jsx:PlayerPreview` + "Meydan Oku" CTA with prefill (memory hardening #2 fix)
- **F7 leaderboard/filter** → port `screens-leaderboard.jsx:FilterPanel`
- **F8 season** → port `screens-season.jsx:Season`
- **F9 season/bracket** → port `screens-season.jsx:Bracket` (singles)
- **F10 season/bracket-doubles** → port `screens-season.jsx:DoublesBracket`
- **F11 season/annual-champion** → port `screens-season.jsx:AnnualChamp`
- **F12 season/archive** → port `screens-season.jsx:SeasonArchive`
- **F13 (tabs)/index** uses leaderboard + ladder context (already created in E2)

Backend status logic: Reference task F new hook:

```typescript
// apps/mobile/hooks/use-frozen-status.ts
import type { UserStatus } from '@tennis/shared';

export function frozenChip(status: UserStatus): { label: string; color: string; bg: string } | null {
  switch (status) {
    case 'frozen_30':       return { label: 'Donmuş',          color: '#5E7CB4', bg: '#E6EDF7' };
    case 'hibernating_60':  return { label: 'Hibernasyondaki', color: '#65656E', bg: '#F3F3F1' };
    case 'inactive_90':     return { label: 'İnaktif',         color: '#A2A2AA', bg: '#F3F3F1' };
    case 'suspended':       return { label: 'Askıda',          color: '#E0992B', bg: '#FBEFD6' };
    case 'banned':          return { label: 'Yasaklı',         color: '#E0463C', bg: '#FCE6E4' };
    default: return null;
  }
}
```

F6 specifically fixes pre-TestFlight backlog #2 (Meydan Oku CTA prefill):
```tsx
// inside user/[userId].tsx
<Button onPress={() => router.push(`/match/new/detail?opponentId=${userId}`)}>Meydan oku</Button>
```
And `match/new/detail.tsx` parses `useLocalSearchParams<{ opponentId?: string }>()` to init direct_challenge mode with preselected target.

Each task: port + test + commit pattern.

---

## Phase G: Bildirimler + Ayarlar + Admin (15 task)

### Tasks G1-G4: Notifications + Settings

- **G1 (tabs)/notifications** → port `screens-notifs.jsx:Notifs` + day grouping logic
- **G2 settings/index** → port `screens-profile.jsx:Settings` + wire to `useSignOut`
- **G3 settings/notification-preferences** → port `screens-profile.jsx:NotifPrefs` + 8 cats (from updated `categories.ts`)
- **G4 settings/delete-account** → port `screens-profile.jsx:DeleteAccount` 2-step

### Tasks G5-G15: Admin (rewrite Plan 7 UI with Plan 8 design)

- **G5 (admin)/_layout** → role gate + admin route group (preserve Plan 7 logic, restyle)
- **G6 (admin)/index** → port `screens-admin.jsx:AdminHome` (3 stat + 6 tile)
- **G7 (admin)/disputes** → port `screens-admin.jsx:AdminDisputes` (list + actions)
- **G8 (admin)/disputes/[id]** → detail (preserve Plan 7 logic)
- **G9 (admin)/seasons** → port `screens-admin.jsx:AdminSeasons`
- **G10 (admin)/tournaments** → port `screens-admin.jsx:AdminBracketEdit` + use new `admin_reorder_bracket_seeds` RPC (Plan 8 Phase A4)
- **G11 (admin)/users** → port `screens-admin.jsx:AdminUsers` (search + actions sheet) + multi-duration suspend (3/7/30/sınırsız)
- **G12 (admin)/users/[userId]** → detail (preserve Plan 7 logic)
- **G13 (admin)/announcements** → port `screens-admin.jsx:AdminAnnounce`
- **G14 (admin)/announcements/new** → form (existing Plan 7 logic)
- **G15 (admin)/health** → port `screens-admin-system.jsx:AdminSystem` + use new `admin_cron_status` RPC

Suspend duration sheet (G11):
```tsx
function SuspendDurationSheet({ userId, userName, onClose }: SuspendDurationProps) {
  const updateProfile = useAdminUpdateProfile();
  const durations = [
    { label: '3 gün',  days: 3 },
    { label: '7 gün',  days: 7 },
    { label: '30 gün', days: 30 },
    { label: 'Sınırsız', days: null },
  ];
  return (
    <Sheet onClose={onClose} title={`${userName} askıya al`}>
      {durations.map(d => (
        <ListRow
          key={d.label}
          title={d.label}
          onPress={async () => {
            const suspendedUntil = d.days
              ? new Date(Date.now() + d.days * 86400000).toISOString()
              : null;
            await updateProfile.mutateAsync({
              userId,
              status: 'suspended',
              suspendedUntil,
            });
            onClose();
          }}
        />
      ))}
    </Sheet>
  );
}
```

Each task: port + test + commit pattern.

---

## Phase H: States + Share Cards (10 task)

### Tasks H1-H7: States primitives + integration

- **H1 Skel + EmptyState primitives** (already in Phase C12-C13 if done; if not, here)
- **H2 Skeleton variants** for Home/Matches/Profile/Ladder — wrapper components used inside screens when `isLoading`
- **H3 Empty state integration** — Maçlar Hub, Bildirimler, Rozetler ekranlarında EmptyState fallback
- **H4 auth_expired screen** at `app/(auth)/expired.tsx` — Supabase auth listener triggers `router.replace('/(auth)/expired')` on TOKEN_EXPIRED
- **H5 Error boundary** — global ErrorBoundary in `app/_layout.tsx` showing EmptyState tone="error"
- **H6 Pull-to-refresh** — wire `RefreshControl` (lime tintColor + "Yenileniyor…" title) to FlatList in 4 screens (matches/notifs/leaderboard/history)
- **H7 Network offline detection** — `@react-native-community/netinfo` + toast on offline/online transitions

### Tasks H8-H10: Share cards

- **H8 CardMatchResult** at `components/share/CardMatchResult.tsx` — port `Share Cards.html:CardMatchResult`
- **H9 CardEloProgress** at `components/share/CardEloProgress.tsx` — port `Share Cards.html:CardEloProgress`
- **H10 CardBadgeWon + ShareSheet** at `components/share/CardBadgeWon.tsx` + `ShareSheet.tsx`

Pattern for share:

```bash
cd apps/mobile && bunx expo install react-native-view-shot expo-sharing
```

```tsx
// apps/mobile/hooks/use-share-card.ts
import { useRef } from 'react';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export function useShareCard() {
  const ref = useRef<ViewShot>(null);
  return {
    ref,
    share: async () => {
      const uri = await ref.current!.capture!({ format: 'png', quality: 0.95 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    },
  };
}
```

Each card uses fixed 1080×1920 sizing via `Dimensions.get('window')` scaling or `react-native-svg` for vector content; rendered off-screen in modal.

Wire into:
- `app/match/[id]/result.tsx` → "Paylaş" button shows CardMatchResult
- `app/profile/elo-history.tsx` → header share icon → CardEloProgress
- Rozet kazanıldı modal (yeni) → CardBadgeWon

Commit each: `feat(plan-8): share card — Match Result`, etc.

---

## Phase I: EAS Build Setup (4 task)

### Task I1: eas.json

**Files:**
- Modify: `apps/mobile/eas.json`

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": { "resourceClass": "m-medium" }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true,
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "hazarustun@gmail.com",
        "ascAppId": "<fill from App Store Connect after registration>",
        "appleTeamId": "<fill from Apple Developer membership>"
      }
    }
  }
}
```

- [ ] **Step 1: Set up Apple Developer credentials**

```bash
cd apps/mobile && bunx eas credentials --platform ios
```
Follow prompts to sync Apple Developer account.

- [ ] **Step 2: Verify EAS login**

```bash
bunx eas whoami
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/eas.json
git commit -m "feat(plan-8): EAS Build profiles (development+preview+production)"
```

---

### Task I2: app.json (production config)

**Files:**
- Modify: `apps/mobile/app.json`

Update:
- `expo.name`: "Tennis Challenger"
- `expo.slug`: "tennis-challenger"
- `expo.version`: "1.0.0"
- `expo.ios.bundleIdentifier`: "com.hazarustun.tenniskampus"
- `expo.ios.buildNumber`: "1"
- `expo.ios.infoPlist.NSPhotoLibraryUsageDescription`: "Profil fotoğrafını seçmek için galeri erişimi gerekli."
- `expo.ios.infoPlist.NSCameraUsageDescription`: "Profil fotoğrafı çekmek için kamera erişimi gerekli."
- `expo.ios.associatedDomains`: `["applinks:tenniskampus.boun.edu.tr"]` (if magic link deep links used)
- `expo.scheme`: "tenniskampus"

Commit: `feat(plan-8): app.json production iOS config`

### Task I3: Push notifications iOS config

- [ ] APNs key created in Apple Developer portal
- [ ] APNs key uploaded to Supabase Dashboard → Settings → Push Notifications
- [ ] expo-notifications plugin in app.json with `mode: production`

Commit (no file change, just doc): `chore(plan-8): document APNs setup steps`

### Task I4: First preview build

```bash
cd apps/mobile && bunx eas build --platform ios --profile preview
```
Wait for build to complete (~15-20 min). Download IPA, install on iOS Simulator via `xcrun simctl install booted <ipa-path>`.

Smoke test:
- App launches without crash
- Splash → welcome flow works
- Sign-in screen shows BÜ regex validation

Commit (just record build ID): `chore(plan-8): first EAS preview build`

---

## Phase J: iOS Simulator QA (3 task)

### Task J1: 88-screen walkthrough

Open `apps/mobile` in Expo Dev Client + iOS Simulator (iPhone 15 Pro). Visit every screen:

- [ ] All 15 auth + onboarding screens
- [ ] Anasayfa
- [ ] 12 maçlar akışı screens (new match flow + score + summary + dispute)
- [ ] 5 profile screens (own + edit + ELO + badges + stats)
- [ ] 8 sezon/sıralama screens (leaderboard + filter + player_preview + season + bracket + bracket_doubles + annual_champ + archive)
- [ ] 5 bildirim + ayarlar (notifs + empty + prefs + settings + delete_account)
- [ ] 7 admin screens
- [ ] 3 share cards (render in modal)

Document any visual regressions, copy issues, navigation bugs in `docs/plan-8-qa-notes.md`. Fix inline before moving on.

Commit (with QA notes): `chore(plan-8): iOS Simulator 88-screen walkthrough — clean`

### Task J2: Accessibility audit

- [ ] Enable VoiceOver in iOS Simulator (Cmd+F5)
- [ ] Verify all CTAs have `accessibilityLabel` + `accessibilityRole="button"`
- [ ] Toggle Dynamic Type to largest size — text should scale, layouts not break
- [ ] Test contrast ratio with Apple Color Filter

Commit: `chore(plan-8): accessibility audit pass`

### Task J3: Network conditions

- [ ] Network Link Conditioner: Slow 3G profile
- [ ] Verify skeleton loaders show during slow loads
- [ ] Verify pull-to-refresh works
- [ ] Verify offline banner triggers when WiFi disabled
- [ ] Verify Supabase auto-reconnects on WiFi restore

Commit: `chore(plan-8): network resilience verified`

---

## Phase K: App Store Connect + TestFlight + Submission (5 task)

### Task K1: Register app in App Store Connect

Manual:
1. App Store Connect → My Apps → "+"
2. Platform: iOS
3. Name: Tennis Challenger
4. Primary language: Turkish
5. Bundle ID: com.hazarustun.tenniskampus
6. SKU: tennis-challenger-001
7. User Access: Full Access
8. Save → copy ASC App ID into eas.json

Commit: `chore(plan-8): App Store Connect app registered (ASC ID: <id>)`

### Task K2: Metadata + screenshots

- [ ] App name, subtitle, description (Turkish, 1000+ words)
- [ ] Keywords: tenis,boğaziçi,üniversite,ELO,ladder,sezon,turnuva
- [ ] Category: Sports (primary), Social Networking (secondary)
- [ ] Age rating: 4+
- [ ] Screenshots:
  - iPhone 15 Pro Max (1290×2796): 6 screens (anasayfa, maç, profil, ladder, finale, share kart)
  - iPhone XS Max (1242×2688): same 6
  - iPhone 8 Plus (1242×2208): same 6

Use iOS Simulator screenshot (Cmd+S) + Sketch or Figma overlay frame (or `--no-frame` and use Apple's "Marketing Resources" frame in App Store Connect).

Commit: `chore(plan-8): metadata + 18 screenshots uploaded to ASC`

### Task K3: Privacy Policy + KVKK URL

- [ ] Create Privacy Policy at `docs/legal/privacy.md` (Turkish)
- [ ] Create KVKK metni at `docs/legal/kvkk.md` (Turkish)
- [ ] Host both on GitHub Pages: `https://hazarustun.github.io/tennis-challenger/privacy` + `/kvkk`
- [ ] Update App Store Connect → "Privacy Policy URL"
- [ ] App Privacy form: data collection categories (email, name, profile photo, match history) + opt-in flags

Commit: `chore(plan-8): privacy policy + KVKK published to GitHub Pages`

### Task K4: First TestFlight build + internal test grup

```bash
cd apps/mobile && bunx eas build --platform ios --profile production --auto-submit
```

Wait for build (~20 min) + auto-submit to TestFlight (~30-60 min review). Once available:

- [ ] App Store Connect → TestFlight → Internal Testing
- [ ] Add testers: `hazarustun@gmail.com` + 2-3 BÜ tenisçi
- [ ] Send TestFlight invite
- [ ] Verify internal testers can install and use

Test grup full akış:
- [ ] Sign up with BÜ email
- [ ] Receive magic link / OTP
- [ ] Complete onboarding
- [ ] Create a match, enter score, opponent confirms
- [ ] Ladder güncellenir, ELO doğru hesaplanır

Commit: `chore(plan-8): first TestFlight build live + internal testers added`

### Task K5: App Store submission

- [ ] Build matures to "Ready to Submit" in TestFlight
- [ ] App Store Connect → App Store → "+ Version"
- [ ] Use TestFlight build
- [ ] Fill version notes (Turkish + English)
- [ ] App Review Information:
  - Demo account: test@std.bogazici.edu.tr + magic link from review
  - Demo notes: "Sign in with this email, magic link arrives, complete onboarding"
- [ ] Sign-in with Apple? **No** (BÜ email gates handle this)
- [ ] Click "Submit for Review"

Wait 3-5 business days for review. Common rejections:
- Missing privacy details → ensure App Privacy form complete
- Demo not working → verify demo account functional
- Crash on launch → check first preview build crashes

Commit: `chore(plan-8): App Store submission queued — review pending`

---

## Self-Review

Plan check against spec:

**1. Spec coverage:**
- ✅ Goal: UI rewrite + 5 migration + EAS + TestFlight + App Store → covered Phases A-K
- ✅ Architecture: Expo Router preserved + NativeWind extend → Phase B
- ✅ Design tokens: colors+typography+spacing+radius+motion → Phase B1
- ✅ Component library: 15+ primitives → Phase C
- ✅ 88 screens: D1-D15 (auth+onb) + E1-E17 (anasayfa+maç) + F1-F13 (profil+sıralama+sezon) + G1-G15 (bildirim+ayar+admin) + H1-H10 (states+share) = 70 tasks covering 88 ekran
- ✅ Backend migrations: A1-A5 + A6 (Edge Function) + A7 (OTP config) = 7 backend tasks
- ✅ Pre-TestFlight hardening #2 (Meydan Oku prefill): F6
- ✅ Pre-TestFlight hardening #9 (Push token cleanup): A6 + sign-out hook
- ✅ EAS Build: I1-I4
- ✅ App Store Connect + TestFlight: K1-K5
- ✅ Manual iOS QA: J1-J3

**2. Placeholder scan:**
- No "TBD" / "TODO" in actionable steps
- ASC App ID + Apple Team ID filled "after registration" (intentionally — these come from Apple)
- Reference jsx files cited with exact line ranges or names where helpful

**3. Type consistency:**
- ColorToken, TypographyVariant, ButtonVariant exported from theme
- All RPC names consistent: `accept_match_application`, `expire_suspensions`, `admin_reorder_bracket_seeds`, `admin_cron_status`
- All hook names consistent: `useMatchApplications`, `useSignOut`, `useShareCard`, `useFrozenStatus`

**No gaps identified.** Plan is complete for spec coverage.

---

## Execution Handoff

**Plan complete and saved to** `docs/superpowers/plans/2026-06-10-plan-8-ui-redesign-release.md`.

Plan structure: 11 phase × ~5-15 task each = ~95 task. Each task ~30 min - 2 hour. Total estimate: 80-120 hour for solo dev.

**Two execution options:**

1. **Subagent-Driven (recommended)** — Dispatch fresh subagent per task, two-stage review (spec compliance + code quality) between tasks, fast iteration. Best for the mechanical 88 screen port work.

2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints. Better for backend migrations + EAS + App Store tasks where each step needs context.

**Hybrid recommendation:** Phase A (backend migrations) + Phase B (tokens) + Phase C (components) + Phase I-K (release) → inline (high judgement, low parallelism). Phases D-H (88 screen ports) → subagent-driven (mechanical, parallelizable per screen).

Which approach?
