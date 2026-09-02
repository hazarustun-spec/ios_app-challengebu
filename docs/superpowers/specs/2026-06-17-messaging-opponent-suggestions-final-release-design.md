# Messaging + Opponent Suggestions + Final Release — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design); pending implementation plan
**Context:** ChallengeBu! — Plan 8 polish complete (all screens live, no
mocks). This spec adds two competitive-gap features (in-app messaging, opponent
suggestions) and defines the 5-step roadmap to an App Store-ready final build.

---

## 1. Goals

1. **Match-context messaging** — two players coordinate (e.g. which court) via a 1:1
   thread tied to a match offer / open call, from the offer stage through the match.
2. **Opponent suggestions** — surface "players you should challenge" using data we
   already have (ELO, category, availability, match history).
3. Document the remaining gaps and the 5-step plan to a final, App Store-ready build.

Non-goals: general free-form DMs unrelated to a match; group chat; court booking
integration; multi-sport.

---

## 2. Feature A — Match-context messaging

### 2.1 Scope
A 1:1 conversation between two players, **anchored to a `match_request`** (both direct
challenges and open calls create a `match_request`). Available from the moment the
offer/open-call exists; continues after acceptance into the resulting match.

- **Direct challenge:** conversation = creator ↔ target.
- **Open call:** conversation = creator ↔ each applicant (one thread per pair).

### 2.2 Data model (new migrations)
```
conversations
  id                uuid pk default gen_random_uuid()
  request_id        uuid not null references match_requests(id) on delete cascade
  participant_low   uuid not null references profiles(user_id) on delete cascade
  participant_high  uuid not null references profiles(user_id) on delete cascade  -- sorted pair
  created_at        timestamptz not null default now()
  last_message_at   timestamptz
  last_message_preview text
  unique (request_id, participant_low, participant_high)
  check (participant_low < participant_high)

messages
  id              uuid pk default gen_random_uuid()
  conversation_id uuid not null references conversations(id) on delete cascade
  sender_id       uuid not null references profiles(user_id) on delete cascade
  body            text not null check (char_length(body) between 1 and 1000)
  created_at      timestamptz not null default now()
  read_at         timestamptz                     -- when the OTHER participant read it
  index (conversation_id, created_at)

user_blocks
  blocker_id uuid not null references profiles(user_id) on delete cascade
  blocked_id uuid not null references profiles(user_id) on delete cascade
  created_at timestamptz not null default now()
  primary key (blocker_id, blocked_id)

user_reports
  id          uuid pk default gen_random_uuid()
  reporter_id uuid not null references profiles(user_id) on delete cascade
  reported_id uuid not null references profiles(user_id) on delete cascade
  reason      text not null
  message_id  uuid references messages(id) on delete set null
  created_at  timestamptz not null default now()
  status      text not null default 'open'    -- open | reviewed | dismissed
```

### 2.3 RLS
- `conversations`: SELECT/INSERT only when `auth.uid()` ∈ (participant_low, participant_high).
  INSERT additionally checks the caller is a participant of the `request_id` (creator,
  target, or an applicant of that request).
- `messages`: SELECT when caller is a conversation participant. INSERT when
  `sender_id = auth.uid()`, caller is a participant, and the recipient has **not blocked**
  the sender (and sender hasn't blocked recipient). UPDATE (read_at) only by the recipient.
- `user_blocks` / `user_reports`: caller manages own rows; reports readable by admins.
- RPC `get_or_create_conversation(request_id, other_user_id)` (security definer,
  search_path pinned) returns the conversation id, creating it if absent — enforces the
  participant/relationship check server-side.

### 2.4 Delivery (approved: Realtime-while-open + push)
- **Sending:** `send-message` Edge Function — validates input, inserts the message,
  bumps `last_message_at`/preview, inserts a `message_received` notification for the
  recipient, and calls `send-push-notification` (mirrors `create-match-request`).
- **Live updates:** the chat screen subscribes to a Supabase Realtime channel scoped to
  the **open conversation only** (`messages` INSERT where conversation_id = X). One
  channel per actively-viewed thread → respects the free-tier connection budget (#10).
- **Closed app:** push notification (new `message_received` category) deep-links to the
  thread; the inbox refetches on focus / push.
- **Read state:** on opening a thread, mark unread messages from the other participant
  `read_at = now()` via an RPC `mark_conversation_read(conversation_id)`.

### 2.5 Mobile surface
- `app/messages/index.tsx` — **inbox**: conversation list (avatar, name, last preview,
  time, unread dot), reached from a header icon on the Matches hub. Unread count badge.
- `app/messages/[conversationId].tsx` — **thread**: message bubbles, composer, NavHeader
  with the other player's name + a "…" menu (Şikâyet et / Engelle).
- Entry points: "Mesaj" action on the match-request detail / open-applicants card, and on
  the match detail screen — each calls `get_or_create_conversation` then routes to the thread.
- Hooks: `useConversations`, `useMessages(conversationId)` (+ realtime), `useSendMessage`,
  `useMarkConversationRead`, `useBlockUser`, `useReportUser`, `useUnreadMessageCount`.

---

## 3. Feature B — Opponent suggestions

### 3.1 Placement (approved)
- **Matches hub** — primary: a "Sana uygun rakipler" horizontal strip.
- **Home** — compact top-3 strip for discovery.
- Each suggestion card → **"Meydan oku"** prefilling the new-match flow with that opponent
  (reuses the existing opponent prefill path).

### 3.2 Algorithm (client-side, pure + testable)
`lib/opponent-suggest.ts` — given my profile (category, ELO, availability_windows), the
roster (`usePlayers`), the category ladder (`useLadder`), and my recent opponents
(`useMyMatchHistory`), score each active same-category candidate:
- **ELO proximity** — higher score the closer their rating is to mine (within a band).
- **Availability overlap** — count of shared availability windows.
- **Freshness** — penalize opponents played in the last N days; small bonus for
  never-played.
- **Exclusions** — self, anonymized/suspended, blocked users.
Return top N by combined score. Hook: `useOpponentSuggestions(category)`.

(An `RPC`-backed version can replace the client-side join later for scale; not needed at
launch volume.)

---

## 4. Remaining gaps (beyond A/B)

**Functional:** user report/block (part of A); remove dead/duplicate legacy Plan 4-7
routes still registered in `app/_layout.tsx` (create-match, play/*, match-request/[id],
dispute/[matchId], applications/[requestId], `(app)` group, root notification-preferences);
season auto-close + `calculate-yearly-championship` are admin-manual (no cron auto);
doubles deferred to v2 — verify new-match doesn't offer an unsupported doubles path.

**Polish:** share cards label the player "Sen" not the real first name; settings
"Hakkında & kurallar" needs the hosted rules URL; badge icon/color (emoji vs design
IconName); per-category ELO delta on profile; stats sub-counts; opponent picker shows ELO
0 for unranked.

**Release/infra:** Privacy Policy + KVKK texts not written; App Store metadata not
written; APNs key not set up; EAS build not run (ascAppId/appleTeamId placeholders);
component tests don't run under `bun test` (RN ESM); accessibility + slow-network QA not done.

**Ops/security (Step 4 detail):** RLS + pinned `search_path` on the new tables/functions;
Edge Function input validation/authz; Realtime free-tier limit; message-spam rate limiting;
KVKK data-leak review.

---

## 5. Five-step execution plan

**Step 1 — Complete all missing code + backend setup (me):**
- Backend: `conversations` + `messages` + `user_blocks` + `user_reports` migrations (with
  RLS + pinned search_path), `get_or_create_conversation` / `mark_conversation_read` RPCs,
  `send-message` Edge Function, `message_received` notification category. **Validate every
  migration from scratch with `supabase db reset` (idempotent, zero error) and run the deno
  test suite.**
- Mobile: messaging inbox + thread + entry points + realtime + push deep-link; opponent
  suggestion strips + `lib/opponent-suggest.ts` (with unit tests) + `useOpponentSuggestions`;
  report/block UI; legacy route cleanup; the small polish items above.
- Exit: `tsc` clean, migrations green, lib tests pass, committed.

**Step 2 — You test in the simulator (you):** report UI/flow issues; I fix (iterative).

**Step 3 — App Store final touches (me):** Privacy Policy + KVKK (you = data controller,
Hazar Üstün / hazarustun@gmail.com), App Store metadata draft, finalize app.json/eas.json,
"Sen" → real name, "Hakkında" URL, APNs/build runbook.

**Step 4 — Security audit (me):** enumerate + close all findings across RLS policies, Edge
Function authz/`search_path`/input validation, service-role usage, push-token/session
handling, message rate-limiting, KVKK data exposure. Produce a findings list + fixes.

**Step 5 — Final comprehensive verification (me):** end-to-end flow check + **re-verify the
Step-1 backend setup** (migrations, RPCs, functions, RLS), find and close any remaining
gaps, and bring the app to a fully App Store Connect-ready final state.

---

## 6. Self-review checklist
- No placeholders/TBD in the design. ✓
- Messaging anchored to match_request resolves both the direct-challenge and open-call
  cases; multi-applicant handled by per-pair threads. ✓
- Delivery respects the free-tier Realtime budget (channel only while a thread is open). ✓
- Opponent suggestion uses only data already available; pure scoring is unit-testable. ✓
- Scope is one implementation plan's worth (Step 1), with later steps gated on user testing. ✓
