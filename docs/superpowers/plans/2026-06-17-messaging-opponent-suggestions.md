# Messaging + Opponent Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add match-context 1:1 messaging (with report/block) and "suitable opponent" suggestions to the Tennis Challenger app, plus close the remaining pre-release gaps — this is **Step 1** of the 5-step final-release plan.

**Architecture:** Backend-first. New Supabase tables (`conversations`, `messages`, `user_blocks`, `user_reports`) with strict RLS + SECURITY DEFINER RPCs; a `send-message` Edge Function that mirrors the existing `create-match-request` pattern (insert + notification + push). Mobile follows the established Plan 8 design pattern (NavHeader + theme tokens + TanStack Query hooks), reusing the existing realtime/push/notification infrastructure. Opponent suggestions are a pure, unit-tested scoring lib fed by existing hooks.

**Tech Stack:** Supabase (Postgres + RLS + Deno Edge Functions + Realtime + pg_cron), Expo SDK 56, React Native, NativeWind 4, TanStack Query 5, Zustand 5, Bun + Turborepo. Deno tests for migrations/functions; bun tests for pure libs.

**Spec:** `docs/superpowers/specs/2026-06-17-messaging-opponent-suggestions-final-release-design.md`

**Reference patterns to read before starting:**
- `packages/supabase/functions/create-match-request/index.ts` — Edge Function shape (cors, auth-guard, zod, insert, notification, push)
- `packages/supabase/functions/_shared/` — `cors.ts`, `errors.ts`, `auth-guard.ts`, `supabase-client.ts`, `expo-push.ts`
- `apps/mobile/app/notifications.tsx` + `apps/mobile/hooks/use-notifications.ts` — live-data screen + query hook house style
- `apps/mobile/hooks/use-realtime-channel.ts` — the realtime subscription helper
- `apps/mobile/lib/match-opponent.ts` + `lib/match-dates.ts` — pure-lib + bun-test pattern
- `apps/mobile/hooks/use-ladder.ts`, `use-players.ts`, `use-match-history.ts` — data the suggestion engine consumes

---

## File Structure

### New backend
```
packages/supabase/migrations/
├── 20260617000001_messaging.sql            # conversations, messages, RLS, indexes
├── 20260617000002_messaging_rpcs.sql       # get_or_create_conversation, mark_conversation_read, unread_message_count
├── 20260617000003_moderation.sql           # user_blocks, user_reports, RLS
└── 20260617000004_notif_category_message.sql # ADD VALUE 'message_received'
packages/supabase/functions/send-message/index.ts
packages/supabase/tests/migrations/messaging.deno-test.ts
packages/supabase/tests/migrations/moderation.deno-test.ts
packages/supabase/tests/functions/send-message.deno-test.ts
```

### New mobile
```
apps/mobile/lib/opponent-suggest.ts                # pure scoring
apps/mobile/lib/__tests__/opponent-suggest.test.ts
apps/mobile/hooks/use-conversations.ts             # inbox list + unread count
apps/mobile/hooks/use-messages.ts                  # thread messages + realtime + send + mark-read
apps/mobile/hooks/use-moderation.ts                # block + report
apps/mobile/hooks/use-opponent-suggestions.ts
apps/mobile/app/messages/index.tsx                 # inbox
apps/mobile/app/messages/[conversationId].tsx      # thread
apps/mobile/components/matches/OpponentSuggestStrip.tsx
```

### Modified mobile
```
apps/mobile/lib/query-keys.ts                      # conversations/messages/suggestions keys
apps/mobile/app/_layout.tsx                        # register messages routes; remove dead legacy routes
apps/mobile/app/(tabs)/matches.tsx                 # header Mesajlar icon + suggestion strip
apps/mobile/app/(tabs)/index.tsx                   # compact suggestion strip
apps/mobile/app/match/[id]/index.tsx               # "Mesaj" entry point
apps/mobile/app/match/open-applicants/[requestId].tsx  # per-applicant "Mesaj" entry point
apps/mobile/hooks/use-notification-preferences.ts  # add message_received label (if shared categories list is here)
packages/shared/src/notifications/categories.ts    # add message_received
```

---

## Phase A — Backend

### Task A1: `conversations` + `messages` tables + RLS

**Files:**
- Create: `packages/supabase/migrations/20260617000001_messaging.sql`
- Create: `packages/supabase/tests/migrations/messaging.deno-test.ts`

- [ ] **Step 1: Write the failing deno test**

```typescript
// packages/supabase/tests/migrations/messaging.deno-test.ts
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser } from '../functions/helpers.ts';

Deno.test('messaging: participants can read/write, outsiders cannot', async () => {
  const supa = adminClient();
  const a = await createTestUser({ email: 'msg-a@std.bogazici.edu.tr' });
  const b = await createTestUser({ email: 'msg-b@std.bogazici.edu.tr' });
  const c = await createTestUser({ email: 'msg-c@std.bogazici.edu.tr' });

  // A direct-challenge request a -> b (court from seed)
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { data: req } = await supa.from('match_requests').insert({
    creator_id: a.userId, target_id: b.userId, type: 'direct_challenge',
    category: 'erkek_tek', format: 'bu_klasik', court_id: court!.id,
  }).select('id').single();

  const low = a.userId < b.userId ? a.userId : b.userId;
  const high = a.userId < b.userId ? b.userId : a.userId;
  const { data: conv, error: convErr } = await supa.from('conversations').insert({
    request_id: req!.id, participant_low: low, participant_high: high,
  }).select('id').single();
  assertEquals(convErr, null);
  assertExists(conv);

  // Insert a message as A (service role bypasses RLS; we assert the row constraints)
  const { error: msgErr } = await supa.from('messages').insert({
    conversation_id: conv!.id, sender_id: a.userId, body: 'Kort 1 olur mu?',
  });
  assertEquals(msgErr, null);

  // Body length guard
  const { error: tooLong } = await supa.from('messages').insert({
    conversation_id: conv!.id, sender_id: a.userId, body: 'x'.repeat(1001),
  });
  assertExists(tooLong);

  await cleanupTestData();
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd packages/supabase && deno test --allow-all tests/migrations/messaging.deno-test.ts`
Expected: FAIL with `relation "conversations" does not exist`.

- [ ] **Step 3: Write the migration**

```sql
-- packages/supabase/migrations/20260617000001_messaging.sql
-- Match-context 1:1 messaging.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.match_requests(id) on delete cascade,
  participant_low uuid not null references public.profiles(user_id) on delete cascade,
  participant_high uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  constraint participants_ordered check (participant_low < participant_high),
  unique (request_id, participant_low, participant_high)
);
create index conversations_low_idx on public.conversations (participant_low);
create index conversations_high_idx on public.conversations (participant_high);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conv_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- A participant of a conversation is one of the two stored ids.
create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv_id and auth.uid() in (c.participant_low, c.participant_high)
  );
$$;

create policy "participants read conversations" on public.conversations
  for select to authenticated
  using (auth.uid() in (participant_low, participant_high));

-- Insert is done via the get_or_create_conversation RPC (security definer);
-- direct inserts are still gated to participants who belong to the request.
create policy "participants create conversations" on public.conversations
  for insert to authenticated
  with check (
    auth.uid() in (participant_low, participant_high)
    and exists (
      select 1 from public.match_requests r
      where r.id = request_id
        and (r.creator_id = auth.uid() or r.target_id = auth.uid()
             or exists (select 1 from public.match_request_applications a
                        where a.request_id = r.id and a.applicant_id = auth.uid()))
    )
  );

create policy "participants read messages" on public.messages
  for select to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "participants send messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    and not exists (
      -- recipient must not have blocked the sender, and vice versa
      select 1 from public.user_blocks ub
      join public.conversations c on c.id = conversation_id
      where (ub.blocker_id, ub.blocked_id) in (
        (c.participant_low, c.participant_high),
        (c.participant_high, c.participant_low)
      )
    )
  );

create policy "recipient marks read" on public.messages
  for update to authenticated
  using (public.is_conversation_participant(conversation_id) and sender_id <> auth.uid())
  with check (public.is_conversation_participant(conversation_id));
```

> **Note for executor:** `user_blocks` is created in Task A3 but referenced by the
> messages INSERT policy here. Order the migration timestamps so A1 < A3 but the policy
> references a table created later — instead, create `user_blocks` FIRST. **Resolution:**
> move the `user_blocks` table definition into THIS migration (A1) and keep only
> `user_reports` + its RLS in A3. Update A3 accordingly. (Do this; it removes the forward
> reference.)

- [ ] **Step 4: Apply user_blocks-first fix, reset DB, run test**

Run: `supabase db reset && cd packages/supabase && deno test --allow-all tests/migrations/messaging.deno-test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/migrations/20260617000001_messaging.sql packages/supabase/tests/migrations/messaging.deno-test.ts
git commit -m "feat(msg): conversations + messages tables with participant RLS"
```

---

### Task A2: messaging RPCs

**Files:**
- Create: `packages/supabase/migrations/20260617000002_messaging_rpcs.sql`
- Modify: `packages/supabase/tests/migrations/messaging.deno-test.ts` (add RPC test)

- [ ] **Step 1: Add the failing RPC test** (append to the messaging deno-test):

```typescript
Deno.test('messaging: get_or_create_conversation is idempotent + marks read', async () => {
  const supa = adminClient();
  const a = await createTestUser({ email: 'rpc-a@std.bogazici.edu.tr' });
  const b = await createTestUser({ email: 'rpc-b@std.bogazici.edu.tr' });
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { data: req } = await supa.from('match_requests').insert({
    creator_id: a.userId, target_id: b.userId, type: 'direct_challenge',
    category: 'erkek_tek', format: 'bu_klasik', court_id: court!.id,
  }).select('id').single();

  const c1 = await supa.rpc('get_or_create_conversation', { p_request_id: req!.id, p_other_user_id: b.userId });
  const c2 = await supa.rpc('get_or_create_conversation', { p_request_id: req!.id, p_other_user_id: b.userId });
  assertEquals(c1.error, null);
  assertEquals(c1.data, c2.data); // same conversation id

  await supa.from('messages').insert({ conversation_id: c1.data, sender_id: a.userId, body: 'selam' });
  const read = await supa.rpc('mark_conversation_read', { p_conversation_id: c1.data });
  assertEquals(read.error, null);
  await cleanupTestData();
});
```

- [ ] **Step 2: Run, verify fail** (`function get_or_create_conversation does not exist`).

- [ ] **Step 3: Write the RPC migration**

```sql
-- packages/supabase/migrations/20260617000002_messaging_rpcs.sql

create or replace function public.get_or_create_conversation(
  p_request_id uuid, p_other_user_id uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  lo uuid := least(uid, p_other_user_id);
  hi uuid := greatest(uid, p_other_user_id);
  conv_id uuid;
begin
  if uid = p_other_user_id then raise exception 'cannot message yourself' using errcode='22023'; end if;
  -- Caller must belong to the request, and so must the other user.
  if not exists (
    select 1 from public.match_requests r
    where r.id = p_request_id
      and uid in (r.creator_id, r.target_id) is not false
  ) and not exists (
    select 1 from public.match_request_applications a
    where a.request_id = p_request_id and a.applicant_id = uid
  ) then
    raise exception 'not a participant of this request' using errcode='42501';
  end if;

  select id into conv_id from public.conversations
    where request_id = p_request_id and participant_low = lo and participant_high = hi;
  if conv_id is null then
    insert into public.conversations (request_id, participant_low, participant_high)
      values (p_request_id, lo, hi) returning id into conv_id;
  end if;
  return conv_id;
end; $$;

revoke all on function public.get_or_create_conversation(uuid, uuid) from public;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'not a participant' using errcode='42501';
  end if;
  update public.messages
    set read_at = now()
    where conversation_id = p_conversation_id and sender_id <> auth.uid() and read_at is null;
end; $$;
revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.unread_message_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where auth.uid() in (c.participant_low, c.participant_high)
    and m.sender_id <> auth.uid() and m.read_at is null;
$$;
revoke all on function public.unread_message_count() from public;
grant execute on function public.unread_message_count() to authenticated;
```

- [ ] **Step 4: Reset + test** → Expected: PASS.
- [ ] **Step 5: Commit** `feat(msg): get_or_create_conversation + mark_read + unread_count RPCs`

---

### Task A3: moderation (`user_blocks` moved to A1; `user_reports` here)

**Files:**
- Create: `packages/supabase/migrations/20260617000003_moderation.sql`
- Create: `packages/supabase/tests/migrations/moderation.deno-test.ts`

- [ ] **Step 1: Failing test** — assert a blocked sender's message INSERT is rejected under RLS (use two real JWT clients via helpers; see `helpers.ts` for `userClient(accessToken)`), and a report row inserts.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Migration** — `user_blocks` lives in A1 (see A1 note). Here create `user_reports` with RLS (reporter manages own rows; admins select all via `public.is_admin()`), per the spec §2.2/§2.3.
- [ ] **Step 4: Reset + test** → PASS.
- [ ] **Step 5: Commit** `feat(msg): user_reports table + RLS (blocks live with messaging)`

---

### Task A4: `message_received` notification category

**Files:**
- Create: `packages/supabase/migrations/20260617000004_notif_category_message.sql`
- Modify: `packages/shared/src/notifications/categories.ts`

- [ ] **Step 1: Migration**

```sql
-- packages/supabase/migrations/20260617000004_notif_category_message.sql
alter type public.notification_category add value if not exists 'message_received';
```
(Also extend `create_default_notification_preferences()` to seed it `true` — copy the
existing function body from `20260610000003_*` and add the row.)

- [ ] **Step 2: Update shared categories**

Append `'message_received'` to `NOTIFICATION_CATEGORIES`, `DEFAULT_ON` (true), and
`CATEGORY_LABELS` (`{ title: 'Mesajlar', subtitle: 'Yeni mesajlar', icon: 'chat' }`) in
`packages/shared/src/notifications/categories.ts`.

- [ ] **Step 3: Reset + `bun run typecheck`** → zero errors.
- [ ] **Step 4: Commit** `feat(msg): add message_received notification category`

---

### Task A5: `send-message` Edge Function

**Files:**
- Create: `packages/supabase/functions/send-message/index.ts`
- Create: `packages/supabase/tests/functions/send-message.deno-test.ts`

Mirror `create-match-request/index.ts`. Behaviour:
1. `requireUser`; zod-validate `{ conversationId: uuid, body: string(1..1000) }`.
2. Verify caller is a participant (`is_conversation_participant`) — else 403.
3. Insert the message (service client); update `conversations.last_message_at` + `last_message_preview` (first ~80 chars).
4. Insert a `message_received` notification for the OTHER participant with `data = { conversationId }`.
5. Call `send-push-notification` (reuse `_shared/expo-push.ts`) to the recipient's tokens.
6. Return the inserted message row.

- [ ] **Step 1:** Failing deno test (two users, send → recipient gets a message row + a notification row; non-participant → 403).
- [ ] **Step 2:** Run with `supabase functions serve`, verify fail (404).
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run tests → PASS (both cases).
- [ ] **Step 5:** Commit `feat(msg): send-message Edge Function (insert + notify + push)`

---

## Phase B — Opponent suggestions

### Task B1: pure scoring lib + tests

**Files:**
- Create: `apps/mobile/lib/opponent-suggest.ts`
- Create: `apps/mobile/lib/__tests__/opponent-suggest.test.ts`

- [ ] **Step 1: Write the failing test** (bun:test). Cover: closer-ELO ranks higher; an
  availability overlap adds score; an opponent played within the recency window is
  penalized vs a never-played one; self / blocked / non-matching-category are excluded.

```typescript
import { describe, expect, test } from 'bun:test';
import { scoreCandidates, type Candidate, type Me } from '../opponent-suggest';

const me: Me = { userId: 'me', rating: 1500, availability: ['mon-eve','wed-eve'], blocked: new Set(['x']) };
const base = (over: Partial<Candidate>): Candidate => ({
  userId: 'c', rating: 1500, availability: [], playedDaysAgo: null, ...over,
});

describe('scoreCandidates', () => {
  test('closer ELO scores higher', () => {
    const out = scoreCandidates(me, [base({ userId: 'near', rating: 1510 }), base({ userId: 'far', rating: 1800 })]);
    expect(out[0].userId).toBe('near');
  });
  test('availability overlap boosts', () => {
    const out = scoreCandidates(me, [
      base({ userId: 'overlap', availability: ['mon-eve'] }),
      base({ userId: 'none', availability: ['fri-am'] }),
    ]);
    expect(out[0].userId).toBe('overlap');
  });
  test('recently played is penalized vs never played', () => {
    const out = scoreCandidates(me, [
      base({ userId: 'fresh', playedDaysAgo: null }),
      base({ userId: 'recent', playedDaysAgo: 2 }),
    ]);
    expect(out[0].userId).toBe('fresh');
  });
  test('excludes self and blocked', () => {
    const out = scoreCandidates(me, [base({ userId: 'me' }), base({ userId: 'x' }), base({ userId: 'ok' })]);
    expect(out.map((c) => c.userId)).toEqual(['ok']);
  });
});
```

- [ ] **Step 2: Run, verify fail.** `cd apps/mobile && bun test lib/__tests__/opponent-suggest.test.ts`
- [ ] **Step 3: Implement `scoreCandidates`** — pure function: filter out self/blocked, score = `eloProximity (e.g. max(0, 1 - |Δ|/400)) * W1 + overlapCount * W2 + freshnessBonus`, sort desc, return with a `.score`. No RN imports.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(suggest): pure opponent scoring lib + tests`

### Task B2: `useOpponentSuggestions` hook

**Files:** Create `apps/mobile/hooks/use-opponent-suggestions.ts`; Modify `lib/query-keys.ts`.

Compose `usePlayers({ gender })`, `useLadder(category)`, my profile (auth store availability), `useMyMatchHistory` (recent opponents → playedDaysAgo) into `Candidate[]`, call `scoreCandidates`, return top N (default 5) as `{ userId, name, rating, score }`. Read each source hook before mapping. Typecheck clean.
- [ ] Steps: write hook → `npx tsc --noEmit` (exit 0) → commit `feat(suggest): useOpponentSuggestions hook`.

### Task B3: suggestion strips on Matches hub + Home

**Files:** Create `components/matches/OpponentSuggestStrip.tsx`; Modify `app/(tabs)/matches.tsx`, `app/(tabs)/index.tsx`.

`OpponentSuggestStrip` — horizontal scroll of suggestion cards (Avatar + name + EloChip + a "Meydan oku" mini-button routing to the new-match flow prefilled with that opponent, reusing the existing prefill used by `user/[userId].tsx`). Add a full strip ("Sana uygun rakipler") on the Matches hub and a compact top-3 on Home. Empty/loading states; preserve design tokens.
- [ ] Steps: build component → wire both screens → `npx tsc --noEmit` (exit 0) → commit `feat(suggest): opponent suggestion strips on Matches + Home`.

---

## Phase C — Messaging mobile

### Task C1: messaging hooks
**Files:** Create `hooks/use-conversations.ts`, `hooks/use-messages.ts`, `hooks/use-moderation.ts`; Modify `lib/query-keys.ts`.
- `use-conversations.ts`: `useConversations()` (list joined with the other participant's public profile + last preview/time + unread per-conversation) and `useUnreadMessageCount()` (calls `unread_message_count` RPC, staleTime 30s).
- `use-messages.ts`: `useMessages(conversationId)` (ordered messages) + realtime subscription via `useRealtimeChannel` scoped to `messages` INSERT where `conversation_id = X` **only while mounted**; `useSendMessage()` (invokes `send-message` function); `useMarkConversationRead()` (RPC, called on mount/focus).
- `use-moderation.ts`: `useBlockUser()` / `useReportUser()` (insert into `user_blocks` / `user_reports`).
- [ ] Steps: write hooks → tsc exit 0 → commit `feat(msg): conversation/message/moderation hooks`.

### Task C2: inbox screen
**Files:** Create `app/messages/index.tsx`; Modify `app/_layout.tsx` (register `messages` route, headerShown:false).
Inbox list (NavHeader large "Mesajlar"): each row = Avatar + name + last preview + relative time + unread dot; tap → `/messages/[conversationId]`. Empty + loading states (mirror `notifications.tsx`).
- [ ] Steps: build → tsc exit 0 → commit `feat(msg): conversations inbox screen`.

### Task C3: thread screen
**Files:** Create `app/messages/[conversationId].tsx`.
NavHeader with the other player's name + a "…" action opening a Sheet (Şikâyet et / Engelle → `use-moderation`, with confirm). Message list (sent/received bubbles using theme tokens), `KeyboardAvoidingView` composer (TextInput + send button → `useSendMessage`). Realtime appends incoming; `useMarkConversationRead` on mount. Empty/loading/error states.
- [ ] Steps: build → tsc exit 0 → commit `feat(msg): conversation thread screen + block/report`.

### Task C4: entry points + push deep-link
**Files:** Modify `app/match/[id]/index.tsx`, `app/match/open-applicants/[requestId].tsx`, the Matches hub header (add a "Mesajlar" icon with unread badge), and `hooks/use-push-registration.ts` (route `message_received` taps to the thread).
Each entry calls `get_or_create_conversation(requestId, otherUserId)` then routes to the thread. Read each screen first; don't disturb existing wiring.
- [ ] Steps: wire → tsc exit 0 → commit `feat(msg): message entry points + push deep-link`.

---

## Phase D — Cleanup + polish

### Task D1: remove dead legacy routes
**Files:** Modify `app/_layout.tsx`. Remove the Plan 4-7 leftover `Stack.Screen` entries that are no longer reachable in the Plan 8 flow (`create-match`, `play/[matchId]`, `play/confirm/[matchId]`, `match-request/[id]`, `dispute/[matchId]`, `applications/[requestId]`, root `notification-preferences`, and the `(app)` group **only if** nothing routes to it — verify with a grep for each route string across `app/` before removing). For each removal, confirm zero `router.push`/`href` references remain. Delete the now-orphaned route files too.
- [ ] Steps: grep each route → remove unreferenced entries + files → `npx tsc --noEmit` (exit 0) → manual smoke that the app still builds the route tree → commit `chore(plan-8): remove dead Plan 4-7 routes`.

### Task D2: small polish
**Files:** `app/match/[id]/result.tsx` + `app/profile/elo-history.tsx` (pass real first name from `useAuthStore` profile to the share cards instead of "Sen"); `app/match/new/opponent.tsx` (show "—" instead of ELO 0 for unranked). Keep each change minimal.
- [ ] Steps: edit → tsc exit 0 → commit `polish(plan-8): real name on share cards; unranked ELO dash`.

---

## Phase E — Verify the whole Step 1

- [ ] **E1:** `supabase db reset` → zero errors; `cd packages/supabase && deno test --allow-all` → all green (migrations + functions, incl. new messaging/moderation/send-message tests).
- [ ] **E2:** `cd apps/mobile && npx tsc --noEmit` → exit 0; `bun test lib/__tests__/` → all pure-lib tests pass.
- [ ] **E3:** App-wide scan: `grep -rE "const MOCK|TODO\(plan-8-[A-Z]-polish\)" apps/mobile/app` (excluding dev gallery) → none.
- [ ] **E4:** Commit any test/verification notes; this completes **Step 1** of the 5-step plan. Hand off to **Step 2** (user simulator testing).

---

## Self-Review

**Spec coverage:** Messaging data model (A1/A3) ✓ · RLS (A1/A3) ✓ · RPCs (A2) ✓ · delivery
Realtime-while-open + push (A5, C1, C3) ✓ · inbox + thread + entry points (C2/C3/C4) ✓ ·
report/block (A3, C3) ✓ · opponent suggestion algorithm + placement (B1/B2/B3) ✓ · gaps:
legacy routes (D1), share-card name + unranked ELO (D2) ✓ · backend validated from scratch (E1) ✓.

**Deferred to later steps (intentionally, per spec §5):** Privacy/KVKK + metadata + APNs +
EAS build (Step 3); full security audit incl. message rate-limiting (Step 4); season
auto-close, accessibility/slow-network QA, final comprehensive verification (Step 5).

**Type consistency:** RPC names `get_or_create_conversation` / `mark_conversation_read` /
`unread_message_count` and hook names `useConversations` / `useMessages` / `useSendMessage` /
`useMarkConversationRead` / `useUnreadMessageCount` / `useOpponentSuggestions` are used
consistently across tasks. `user_blocks` is created in A1 (not A3) to avoid a forward
reference from the messages INSERT policy.
