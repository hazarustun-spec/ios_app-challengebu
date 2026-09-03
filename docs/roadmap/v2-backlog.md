# ChallengeBu — v2 Backlog

Consciously deferred from the v1 UI/UX polish pass (2026-06-30). **None are
user-critical** — v1 ships fully functional and polished without them. Grouped by
category. Each item has a plain-language "what", why it was deferred, what
finishing it needs, and rough effort.

---

## 1 · Testing & CI infrastructure (developers only — users never see this)

### 1a. Maestro E2E flow tuning
- **What:** Maestro is a "robot test user" that drives the app automatically
  (tap → type → assert the right screen appeared), so we don't hand-test every
  change.
- **Status:** Flows are *written* in `apps/mobile/.maestro/` — `onboarding`,
  `leaderboard`, `profile`, `messages`, `settings`, `match-lifecycle`. Only
  **`login` + `score-undo` are green**; the rest need per-screen selector tuning.
- **Needs:** For each flow, run → fix the selectors the robot can't find → repeat
  (~10 iterations/flow), on a stable simulator + a 2-user seed for lifecycle.
- **Effort:** High (marathon). Path is proven (login was tuned the same way).

### 1b. CI Maestro lane
- **What:** Run the Maestro robot tests automatically on a server on every code
  change (a "night-watch" that catches regressions early), not just locally.
- **Status:** Not set up (there's a guarded stub).
- **Needs:** A macOS CI runner with an iOS simulator + Mailpit (for OTP) + the
  local Supabase stack wired up. Can be authored but **can't be fully verified
  without an actual CI run**.
- **Effort:** Medium–high; CI-environment-dependent.

---

## 2 · Delight / Tier 4 polish

### 2a. Sound effects
- **What:** Small sounds — a tick on each point, a flourish on match win — with an
  on/off toggle in settings.
- **Status:** Not started.
- **Needs:** The wiring (expo-audio + a `useSound` hook + settings toggle) is
  easy, **but we have no audio asset files** (.mp3/.wav). Source/commission the
  sounds first, then wire them.
- **Effort:** Low once assets exist; **blocked on assets**.

---

## 3 · Native features

### 3a. Home-screen widget
- **What:** A Home-screen widget (like the weather widget) showing ELO + next
  match without opening the app. (The Live Activities infra already exists, so the
  data plumbing is partly there.)
- **Status:** Not started.
- **Needs:** A separate native iOS target — a WidgetKit (Swift) extension — plus a
  native rebuild. EAS cloud build is the clean path for the native side.
- **Effort:** High (big native).

---

## 4 · Engagement, retention & growth (product — v1.1+)

From the pre-launch product discussion. Not launch-critical; the core loop (ELO,
seasons, leaderboard, badges, streaks, live score) already ships.

### Admin
- **Enrich the admin Users screen** — show department, self-level, ELO, match
  count, last-active, phone at a glance (currently email + role only), so the
  operator manages from the app instead of the Supabase Table Editor.

### Onboarding / profile data (collect progressively — mind friction + App Privacy)
- **Campus / preferred court** (Güney / Kuzey / Kandilli) → proximity matchmaking.
- **Goal** (competition / fun / training) → personalization + better opponents.
- **Weekly play-frequency target** → reminders + retention.
- **Instagram / WhatsApp handle** (optional) → easier match coordination.
- **Experience** (years played / tournament history) → better starting ELO.
- Keep onboarding SHORT; collect the rest post-signup ("complete your profile").

### Competition
- **League / division system** (weekly promotion & relegation, Duolingo-style) —
  strongest retention mechanic.
- **Rivalry card** (head-to-head record) + **rematch** prompts.
- **"X is about to pass you"** notification → FOMO.
- **Department-vs-department derby** → team belonging.

### Retention
- **Weekly recap** ("3 matches, +24 ELO, up 2 spots").
- **Re-engagement push** ("you haven't played in 3 days; X is waiting").
- **Weekly goals + streak rewards** (extend the existing win-streak flame).

### Growth
- **Invite / referral system** (invite a friend → both earn a badge) → viral + engagement.
- **Social feed** (see friends' matches / rank climbs).

### Progression
- More **badges / achievements** + **season rewards** (digital medal / certificate).

---

## 5 · More v2 ideas (raw — from the operator, 2026-07-01)

### Features
- **Friend system** — add/follow friends (pairs with the social feed in §4).
- **Post-match photo** — attach a photo to a finished match (memory + social).
- **Match deletion** — let a user delete/cancel a match they created.
- **Court-reservation warning before a match offer** — "Listings created without a
  court reservation may affect your ELO; reserve a court first." (ELO integrity +
  logistics nudge; possibly integrate court booking.)
- **In-app mascot** — a character for personality / onboarding / engagement.
- **Add-to-Calendar** — when a match is scheduled (offer accepted or created),
  offer a one-tap "Takvime ekle" that drops the event on the user's Apple
  Calendar or Google Calendar. Title = "ChallengeBu · <opponent> · <format>",
  location = the court, notes = link back into the app (`tennischallenger://
  match/<id>`), alarms 24h + 1h before. Reduces no-shows and pulls the app
  into a habit surface (calendar) users already open daily.
  - **iOS Apple Calendar:** `expo-calendar` — request `WRITE_CALENDAR`
    permission, `Calendar.createEventAsync` after user picks the target
    calendar; add `NSCalendarsUsageDescription` to `app.json`.
  - **Google Calendar:** open a pre-filled `https://calendar.google.com/
    calendar/render?action=TEMPLATE&text=…&dates=…&location=…` URL — works
    without OAuth and covers non-native clients (web, Android later).
  - **Where in-app:** the match detail screen + the accept-confirmation toast
    ("Kabul edildi — takvime ekle?"). Store `calendar_event_id` on the match
    row for future updates/deletion if the match is voided or rescheduled.
  - **Effort:** Low (Apple side is one hook + a bottom-sheet picker; Google
    is a URL builder). Blocked on: adding the permission string to
    `Info.plist` on the next EAS build.

### Messaging redesign (v1.1 priority — users complain it feels slow and hard to use)

Detailed brief for the messaging subsystem. Today's implementation is
functional but every interaction goes network round-trip, there is no
pagination, the inbox surface is thin, and the compose flow only kicks in
after an accepted match offer.

**A. Send path — instant feedback.**
- Optimistic append: `useSendMessage` should insert a stub row into the
  cache (`queryKeys.conversations.messages(id)`) BEFORE the mutation
  fires; roll back on error. Today the input clears + the message sits
  invisible until the round-trip returns → feels laggy on 4G.
- Retry queue: keep a failed message in a "pending" state with a Retry
  chip instead of a modal alert. iMessage-style red exclamation.
- Delivery ticks: single tick (sent), double tick (delivered), blue
  ticks (read) — read state already exists (`read_at`), just surface it.

**B. Inbox (`app/messages/index.tsx`) — richer preview.**
- Show last message preview + timestamp (relative — "2 dk", "dün")
  instead of the current name-only rows.
- Unread badge per thread + inbox-level unread count on the tab bar.
- Swipe-to-archive / swipe-to-mute (long-term).
- Empty state today just says "no messages"; replace with a "Match
  teklifin olduğunda mesajlaşabilirsin" nudge + CTA to /(tabs)/matches.

**C. Thread (`app/messages/[conversationId].tsx`) — perf + polish.**
- **Pagination.** `useMessages` currently `SELECT * FROM messages
  ORDER BY created_at ASC` — loads every message in the thread. Switch
  to reverse-chronological + `limit(50)` + `keyset` on `created_at`;
  render into an inverted `FlatList` (or the new @shopify/flash-list)
  and load-older-on-scroll-top.
- Typing indicator via a Postgres channel broadcast (Supabase realtime
  supports broadcast, no DB rows needed).
- Date separators between messages > 1h apart.
- Message reactions (❤️👍😂). Small `reactions` table keyed on
  `message_id` + `user_id`.
- Long-press menu: Reply, Copy, Delete (own only), Report (other).
- Deleted-message tombstone renders "Bu mesaj silindi" italic + faded,
  not a blank row.

**D. Composer.**
- Grow the input up to 6 lines instead of a single-line field.
- Attach button — start with sending a photo (expo-image-picker →
  Supabase Storage bucket `message-attachments` → append URL to body OR
  a proper `attachments` column). Voice notes deferred.
- Send-on-return toggle (default off in TR — most Turkish users
  paragraph-break intentionally).
- Emoji picker (bottom-sheet, native OS emoji is fine — no custom).

**E. Push + deep-link (partly fixed 2026-09-02).**
- Fixed: in-app + system push tap routes to the thread by
  `conversationId` (`d6da339`). Still TODO: preserve the notification
  banner on iOS while the app is foregrounded on ANOTHER thread (today
  we suppress it since setNotificationHandler returns
  shouldShowBanner:true for every source).
- Ensure the notification tap deep-link scrolls the thread to the NEW
  message (append highlight animation) so the reason for the tap is
  visible.

**F. Reachability + safety.**
- Blocked user: today the send silently fails; toast + disable composer
  when the other participant is in `user_blocks`. (Audit finding #1
  from `docs/audit-2026-09-daily-use.md` is the immediate patch — this
  brief plans the full experience.)
- Report flow already exists (in-thread ⋯); surface it in the
  long-press menu (per D above).

**Effort estimate:** 5-8 days for A–D, another 2-3 days for E–F. Split
into 3 shipping milestones:
  1. Optimistic send + inbox previews + pagination (biggest UX win).
  2. Composer expansion + attachments + typing indicator.
  3. Reactions + polish.

### Gamification
- **Stars currency** — earn stars for **playing** a match (win OR lose → rewards
  participation, not just winning); spend stars on profile/app customizations.
  Strong retention hook (shows up even after losses). Ties into §4 league/badges.

### Onboarding & admin
- **Additional onboarding questions** (see the data list in §4).
- **Admin panel enrichment** (see §4).

### Growth & platform
- **Android version.**
- **Website** — expand beyond the current landing (live at shimal.app/challengebu).

### Monetization (decisions to make)
- **Monetization strategy — "how does it make money?"** — options: subscriptions
  (premium stats/features), court-booking commissions/partnerships, sponsorships,
  paid tournaments. Pick a model.
- **Data selling — decision.** Currently declared **NO** in App Privacy (no
  tracking, no selling). If ever monetizing via data, it requires re-declaring App
  Privacy + updating the privacy policy / KVKK + explicit user consent. Default
  stance: **do not sell** (trust > short-term revenue).

### UI
- **General UI polish** (ongoing).

### Already shipped (noted so it isn't re-planned)
- **Report / şikayet et** — done (in-thread ⋯ menu + admin moderation queue).
- **Block + blocked-list + unblock** — done (App Store Guideline 1.2).

---

## Also consciously deferred (noted, out of this list's scope)

- **Dark mode** — the user explicitly declined it for v1.
- **APNs production host flip + App Store Connect registration** — release-time +
  Apple-account work; see `docs/RELEASE.md`.
- **Deno full-suite residual flake** — a few global-state tests occasionally trip
  on the shared local stack; documented + accepted in
  `packages/supabase/tests/functions/README.md` (not an app bug).

---

## Done in v1 (for reference — these were once on the "remaining" list)
- Tier 3 swipe actions on match cards ✅
- Pre-existing Deno test failures (publish-announcement / raise-dispute) ✅
- Premium Cards redesign + tab bar + emoji cleanup + radius + haptics ✅
