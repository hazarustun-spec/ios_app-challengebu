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
