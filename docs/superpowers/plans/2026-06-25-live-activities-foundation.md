# Live Activities Foundation (Local Live Score) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the native Live Activity for ChallengeBu! so that while a player scores a match in `score.tsx`, the live score shows on THEIR own Dynamic Island + Lock Screen, updating locally as they tap points.

**Architecture:** A SwiftUI Widget Extension target (added via `expo-apple-targets`) renders the Live Activity in all presentations (compact / minimal / expanded / lock-screen). A local Expo native module (Swift + ActivityKit) starts / updates / ends the activity. `score.tsx` calls a thin JS wrapper on mount, on each point, and on finish. This plan is **local-only** (no backend, no push) — it is the foundation the two-device-sync plan builds on.

**Tech Stack:** Expo SDK 56, React Native 0.85, `@bacons/apple-targets` (expo-apple-targets), Swift, SwiftUI, ActivityKit, Expo Modules API, expo-router.

## Global Constraints

- Brand palette (verbatim from `apps/mobile/theme/colors.ts`): "Sen" → lime `#8FD43B` (deep `#5C8C1E`); "Rakip" → court blue `#2270BC`; text ink `#161618` / secondary `#65656E`; winner accent win `#5C8C1E`; star `#F5B924`.
- Score model (from `score.tsx`): single set, first to **4 games** (margin ≥ 1), `3-3` → void. Points indices 0–4 → `["0","15","30","40","Ad"]`.
- "Sen/Rakip" mapping: the Live Activity ContentState carries raw `gamesA/gamesB/pointsA/pointsB`; the static attribute `youSide: "a"|"b"` tells SwiftUI which side is "Sen". The scoring user is whichever team they are on in the match row.
- Bundle id: `app.challengebu.ios`. Team id: `4MBWF4RGV7`. iOS deployment: device build via `npx expo run:ios --device "Hazar U." --configuration Release`.
- All Turkish copy must use correct dotted/dotless i and natural phrasing.
- Production-ready only — no temporary stubs. Every Live Activity call in `score.tsx` is wrapped so a failure NEVER breaks scoring.
- Native UI is verified at **runtime on the device** (rebuild + observe), not by unit tests — the user's iPhone has a Dynamic Island.

---

### Task 1: Spike — add a minimal static Live Activity and prove it appears on device

This de-risks the entire native integration (the spec's top risk: manual `ios/` project ↔ `expo-apple-targets` prebuild) before investing in full UI/module code. Deliverable: a hardcoded "Maç sürüyor 🎾" Live Activity that can be started from a temporary dev button and shows in the Dynamic Island.

**Files:**
- Modify: `apps/mobile/package.json` (add `@bacons/apple-targets` devDependency)
- Modify: `apps/mobile/app.json` (add the `@bacons/apple-targets` config plugin + `NSSupportsLiveActivities`)
- Create: `apps/mobile/targets/live-activity/expo-target.config.js` (target config: widget extension)
- Create: `apps/mobile/targets/live-activity/LiveMatchAttributes.swift` (the `ActivityAttributes`)
- Create: `apps/mobile/targets/live-activity/LiveMatchLiveActivity.swift` (minimal `Widget` with `ActivityConfiguration`)
- Create: `apps/mobile/modules/live-match-activity/` (Expo local module skeleton — `expo-module.config.json`, `ios/LiveMatchActivityModule.swift`, `index.ts`)
- Modify: `apps/mobile/app/(dev)/gallery.tsx` (temporary "Start test activity" button — removed in Task 4)

**Interfaces:**
- Produces: native module `LiveMatchActivity` with `start(): void` (hardcoded) and `end(): void`, exported from `apps/mobile/modules/live-match-activity/index.ts`.

- [ ] **Step 1: Install expo-apple-targets**

Run from `apps/mobile`:
```bash
npx expo install @bacons/apple-targets
```
Expected: added to `package.json` devDependencies.

- [ ] **Step 2: Register the plugin + Live Activity Info.plist flag in `app.json`**

In `apps/mobile/app.json`, add to `expo.plugins` (alongside existing plugins):
```json
"@bacons/apple-targets"
```
And add to `expo.ios.infoPlist`:
```json
"NSSupportsLiveActivities": true
```

- [ ] **Step 3: Create the widget target config**

Create `apps/mobile/targets/live-activity/expo-target.config.js`:
```js
/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'LiveMatch',
  deploymentTarget: '16.2',
  frameworks: ['SwiftUI', 'ActivityKit'],
};
```

- [ ] **Step 4: Create the shared attributes**

Create `apps/mobile/targets/live-activity/LiveMatchAttributes.swift`:
```swift
import ActivityKit

struct LiveMatchAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var gamesA: Int
    var gamesB: Int
    var pointsA: Int
    var pointsB: Int
    var phase: String   // "ongoing" | "void" | "finished"
    var winner: String? // "a" | "b" | nil
  }
  var matchId: String
  var youSide: String   // "a" | "b"
  var nameA: String
  var nameB: String
  var categoryLabel: String?
}
```

- [ ] **Step 5: Create a minimal Live Activity widget**

Create `apps/mobile/targets/live-activity/LiveMatchLiveActivity.swift`:
```swift
import ActivityKit
import SwiftUI
import WidgetKit

struct LiveMatchLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveMatchAttributes.self) { context in
      // Lock screen / banner
      HStack {
        Text("🎾 Maç sürüyor")
          .font(.system(.headline, design: .rounded).bold())
        Spacer()
        Text("\(context.state.gamesA)–\(context.state.gamesB)")
          .font(.system(.title3, design: .rounded).bold())
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          Text("🎾 \(context.state.gamesA)–\(context.state.gamesB)")
            .font(.system(.title3, design: .rounded).bold())
        }
      } compactLeading: {
        Text("🎾")
      } compactTrailing: {
        Text("\(context.state.gamesA)–\(context.state.gamesB)")
          .font(.system(.caption, design: .rounded).bold())
      } minimal: {
        Text("🎾")
      }
    }
  }
}
```

- [ ] **Step 6: Create the Expo local module skeleton**

Create `apps/mobile/modules/live-match-activity/expo-module.config.json`:
```json
{ "platforms": ["ios"], "ios": { "modules": ["LiveMatchActivityModule"] } }
```
Create `apps/mobile/modules/live-match-activity/ios/LiveMatchActivityModule.swift`:
```swift
import ExpoModulesCore
import ActivityKit

public class LiveMatchActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveMatchActivity")

    Function("start") {
      if #available(iOS 16.2, *) {
        let attrs = LiveMatchAttributes(
          matchId: "test", youSide: "a", nameA: "Sen", nameB: "Rakip", categoryLabel: nil)
        let state = LiveMatchAttributes.ContentState(
          gamesA: 0, gamesB: 0, pointsA: 0, pointsB: 0, phase: "ongoing", winner: nil)
        _ = try? Activity.request(
          attributes: attrs, content: .init(state: state, staleDate: nil))
      }
    }

    Function("end") {
      if #available(iOS 16.2, *) {
        Task {
          for activity in Activity<LiveMatchAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
          }
        }
      }
    }
  }
}
```
Create `apps/mobile/modules/live-match-activity/index.ts`:
```ts
import { requireNativeModule } from 'expo-modules-core';

const Native = requireNativeModule('LiveMatchActivity');

export function start(): void {
  Native.start();
}

export function end(): void {
  Native.end();
}
```

> Note: `LiveMatchAttributes.swift` must be a member of BOTH the widget target and the app/module target. The spike verifies whether `expo-apple-targets` shares it automatically; if not, Task adjustment: add a copy under `modules/live-match-activity/ios/` or configure shared membership. Record the resolution.

- [ ] **Step 7: Add a temporary dev trigger**

In `apps/mobile/app/(dev)/gallery.tsx`, add near the top of the rendered list a button:
```tsx
import * as LiveMatch from '../../modules/live-match-activity';
// ...inside the screen JSX:
<Button onPress={() => LiveMatch.start()}>Test Live Activity Başlat</Button>
<Button onPress={() => LiveMatch.end()}>Test Live Activity Bitir</Button>
```

- [ ] **Step 8: Prebuild + rebuild on device**

Run from `apps/mobile`:
```bash
npx expo prebuild -p ios
npx expo run:ios --device "Hazar U." --configuration Release
```
Expected: build succeeds; the widget extension target compiles. If prebuild reports it would overwrite manual `ios/` changes (entitlements, signing), STOP and reconcile: re-apply the `aps-environment` entitlement and signing, then continue. Record exactly what prebuild changed.

- [ ] **Step 9: Verify on device (runtime)**

On the phone: open the app → dev gallery → tap "Test Live Activity Başlat". 
Expected: a Live Activity appears in the Dynamic Island showing 🎾 and `0–0`; lock the phone → the lock-screen banner shows "🎾 Maç sürüyor 0–0". Tap "Bitir" → it disappears. Capture a screenshot.

- [ ] **Step 10: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.json apps/mobile/targets apps/mobile/modules apps/mobile/app/\(dev\)/gallery.tsx apps/mobile/ios
git commit -m "feat(live-activity): spike — minimal Live Activity appears on device (Task 1)"
```

---

### Task 2: Full branded SwiftUI Live Activity UI

Replace the placeholder views with the real design (compact / minimal / expanded / lock-screen) in the brand palette, reading the full ContentState. Still driven by the spike's hardcoded state — dynamic values arrive in Task 3.

**Files:**
- Modify: `apps/mobile/targets/live-activity/LiveMatchLiveActivity.swift` (full UI)
- Create: `apps/mobile/targets/live-activity/ScoreFormat.swift` (points-index → "0/15/30/40/Ad", side mapping helper)

**Interfaces:**
- Consumes: `LiveMatchAttributes` + `ContentState` from Task 1.
- Produces: final SwiftUI views; no new JS interface.

- [ ] **Step 1: Add the score-format helper**

Create `apps/mobile/targets/live-activity/ScoreFormat.swift`:
```swift
import SwiftUI

enum ScoreFormat {
  static let pts = ["0", "15", "30", "40", "Ad"]
  static func point(_ i: Int) -> String { pts[max(0, min(4, i))] }

  static let lime = Color(red: 0x8F/255, green: 0xD4/255, blue: 0x3B/255)
  static let limeDeep = Color(red: 0x5C/255, green: 0x8C/255, blue: 0x1E/255)
  static let court = Color(red: 0x22/255, green: 0x70/255, blue: 0xBC/255)
  static let ink = Color(red: 0x16/255, green: 0x16/255, blue: 0x18/255)
}

// Maps raw a/b ContentState to "you" / "opponent" via youSide.
struct Sides {
  let youGames: Int, oppGames: Int, youPoints: Int, oppPoints: Int, youName: String, oppName: String
  init(_ a: LiveMatchAttributes, _ s: LiveMatchAttributes.ContentState) {
    if a.youSide == "a" {
      youGames = s.gamesA; oppGames = s.gamesB; youPoints = s.pointsA; oppPoints = s.pointsB
      youName = a.nameA; oppName = a.nameB
    } else {
      youGames = s.gamesB; oppGames = s.gamesA; youPoints = s.pointsB; oppPoints = s.pointsA
      youName = a.nameB; oppName = a.nameA
    }
  }
}
```

- [ ] **Step 2: Write the full lock-screen + Dynamic Island views**

Replace the body of `LiveMatchLiveActivity.swift` with:
```swift
import ActivityKit
import SwiftUI
import WidgetKit

struct LiveMatchLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveMatchAttributes.self) { context in
      LockScreenView(attributes: context.attributes, state: context.state)
    } dynamicIsland: { context in
      let s = Sides(context.attributes, context.state)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          PlayerRow(name: s.youName, games: s.youGames, point: s.youPoints,
                    color: ScoreFormat.lime, ahead: s.youGames >= s.oppGames)
        }
        DynamicIslandExpandedRegion(.trailing) {
          PlayerRow(name: s.oppName, games: s.oppGames, point: s.oppPoints,
                    color: ScoreFormat.court, ahead: s.oppGames > s.youGames)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(statusText(context.state)).font(.system(.caption2, design: .rounded))
            .foregroundStyle(.secondary)
        }
      } compactLeading: {
        Text("🎾")
      } compactTrailing: {
        Text("\(s.youGames)–\(s.oppGames)")
          .font(.system(.caption, design: .rounded).bold())
          .foregroundStyle(ScoreFormat.lime)
      } minimal: {
        Text("\(s.youGames)–\(s.oppGames)").font(.system(.caption2, design: .rounded).bold())
      }
    }
  }

  func statusText(_ s: LiveMatchAttributes.ContentState) -> String {
    switch s.phase {
    case "finished": return "Bitti 🎾"
    case "void": return "Berabere · void"
    default: return "Maç sürüyor"
    }
  }
}

struct PlayerRow: View {
  let name: String; let games: Int; let point: Int; let color: Color; let ahead: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(name).font(.system(.caption2, design: .rounded)).lineLimit(1)
        .foregroundStyle(.secondary)
      HStack(spacing: 6) {
        Text("\(games)").font(.system(.title3, design: .rounded).bold()).foregroundStyle(color)
        Text(ScoreFormat.point(point)).font(.system(.caption, design: .rounded))
          .foregroundStyle(.secondary)
      }
    }
  }
}

struct LockScreenView: View {
  let attributes: LiveMatchAttributes
  let state: LiveMatchAttributes.ContentState
  var body: some View {
    let s = Sides(attributes, state)
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("🎾 ChallengeBu!").font(.system(.caption, design: .rounded).bold())
        Spacer()
        Text(state.phase == "finished" ? "Bitti" : "Maç sürüyor")
          .font(.system(.caption2, design: .rounded)).foregroundStyle(.secondary)
      }
      scoreRow(s.youName, s.youGames, s.youPoints, ScoreFormat.lime)
      scoreRow(s.oppName, s.oppGames, s.oppPoints, ScoreFormat.court)
    }
    .padding(14)
    .activityBackgroundTint(ScoreFormat.ink)
    .activitySystemActionForegroundColor(.white)
  }
  func scoreRow(_ name: String, _ games: Int, _ point: Int, _ color: Color) -> some View {
    HStack {
      Rectangle().fill(color).frame(width: 4, height: 22).cornerRadius(2)
      Text(name).font(.system(.subheadline, design: .rounded)).foregroundStyle(.white).lineLimit(1)
      Spacer()
      Text("\(games)").font(.system(.title3, design: .rounded).bold()).foregroundStyle(color)
      Text(ScoreFormat.point(point)).font(.system(.subheadline, design: .rounded))
        .foregroundStyle(.white.opacity(0.8)).frame(width: 34, alignment: .trailing)
    }
  }
}
```

- [ ] **Step 3: Rebuild on device**

Run from `apps/mobile`:
```bash
npx expo run:ios --device "Hazar U." --configuration Release
```
Expected: build succeeds.

- [ ] **Step 4: Verify on device (runtime)**

Dev gallery → "Test Live Activity Başlat". Expected: Dynamic Island compact shows 🎾 + `0–0` in lime; long-press expands to two player rows (Sen lime / Rakip court); lock screen shows the ink card with two colored rows + ChallengeBu! header. Capture a screenshot.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/targets/live-activity
git commit -m "feat(live-activity): full branded Dynamic Island + lock-screen UI (Task 2)"
```

---

### Task 3: Native module start/update/end with real data + JS wrapper

Make the module accept dynamic attributes + state, keep a handle to the running activity, and expose a typed JS API.

**Files:**
- Modify: `apps/mobile/modules/live-match-activity/ios/LiveMatchActivityModule.swift`
- Modify: `apps/mobile/modules/live-match-activity/index.ts`
- Create: `apps/mobile/lib/live-match-activity.ts` (typed app-facing wrapper)

**Interfaces:**
- Produces (JS, from `apps/mobile/lib/live-match-activity.ts`):
  - `isSupported(): boolean`
  - `startMatchActivity(a: { matchId: string; youSide: 'a'|'b'; nameA: string; nameB: string; categoryLabel?: string }): Promise<void>`
  - `updateMatchActivity(s: { gamesA: number; gamesB: number; pointsA: number; pointsB: number; phase: 'ongoing'|'void'|'finished'; winner?: 'a'|'b'|null }): Promise<void>`
  - `endMatchActivity(s: { gamesA: number; gamesB: number; pointsA: number; pointsB: number; phase: 'finished'|'void'; winner?: 'a'|'b'|null }): Promise<void>`

- [ ] **Step 1: Rewrite the native module with real params + a stored activity handle**

Replace `apps/mobile/modules/live-match-activity/ios/LiveMatchActivityModule.swift`:
```swift
import ExpoModulesCore
import ActivityKit

public class LiveMatchActivityModule: Module {
  private var current: Any?

  public func definition() -> ModuleDefinition {
    Name("LiveMatchActivity")

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) { return ActivityAuthorizationInfo().areActivitiesEnabled }
      return false
    }

    AsyncFunction("start") { (a: [String: Any]) in
      guard #available(iOS 16.2, *) else { return }
      let attrs = LiveMatchAttributes(
        matchId: a["matchId"] as? String ?? "",
        youSide: a["youSide"] as? String ?? "a",
        nameA: a["nameA"] as? String ?? "Sen",
        nameB: a["nameB"] as? String ?? "Rakip",
        categoryLabel: a["categoryLabel"] as? String)
      let state = LiveMatchAttributes.ContentState(
        gamesA: 0, gamesB: 0, pointsA: 0, pointsB: 0, phase: "ongoing", winner: nil)
      self.current = try? Activity.request(
        attributes: attrs, content: .init(state: state, staleDate: nil))
    }

    AsyncFunction("update") { (s: [String: Any]) in
      guard #available(iOS 16.2, *), let act = self.current as? Activity<LiveMatchAttributes>
      else { return }
      await act.update(.init(state: Self.state(from: s), staleDate: nil))
    }

    AsyncFunction("end") { (s: [String: Any]) in
      guard #available(iOS 16.2, *) else { return }
      if let act = self.current as? Activity<LiveMatchAttributes> {
        await act.end(.init(state: Self.state(from: s), staleDate: nil),
                      dismissalPolicy: .after(.now + 3))
      }
      self.current = nil
    }
  }

  @available(iOS 16.2, *)
  static func state(from s: [String: Any]) -> LiveMatchAttributes.ContentState {
    LiveMatchAttributes.ContentState(
      gamesA: s["gamesA"] as? Int ?? 0, gamesB: s["gamesB"] as? Int ?? 0,
      pointsA: s["pointsA"] as? Int ?? 0, pointsB: s["pointsB"] as? Int ?? 0,
      phase: s["phase"] as? String ?? "ongoing", winner: s["winner"] as? String)
  }
}
```

- [ ] **Step 2: Update the module index**

Replace `apps/mobile/modules/live-match-activity/index.ts`:
```ts
import { requireNativeModule } from 'expo-modules-core';
const Native = requireNativeModule('LiveMatchActivity');
export default Native as {
  isSupported(): boolean;
  start(a: Record<string, unknown>): Promise<void>;
  update(s: Record<string, unknown>): Promise<void>;
  end(s: Record<string, unknown>): Promise<void>;
};
```

- [ ] **Step 3: Write the typed app-facing wrapper**

Create `apps/mobile/lib/live-match-activity.ts`:
```ts
import { Platform } from 'react-native';
import Native from '../modules/live-match-activity';

type Attrs = { matchId: string; youSide: 'a' | 'b'; nameA: string; nameB: string; categoryLabel?: string };
type State = { gamesA: number; gamesB: number; pointsA: number; pointsB: number; phase: 'ongoing' | 'void' | 'finished'; winner?: 'a' | 'b' | null };

export function isSupported(): boolean {
  return Platform.OS === 'ios' && (() => { try { return Native.isSupported(); } catch { return false; } })();
}
export async function startMatchActivity(a: Attrs): Promise<void> {
  if (!isSupported()) return;
  try { await Native.start(a); } catch { /* never break scoring */ }
}
export async function updateMatchActivity(s: State): Promise<void> {
  try { await Native.update(s); } catch { /* never break scoring */ }
}
export async function endMatchActivity(s: State): Promise<void> {
  try { await Native.end(s); } catch { /* never break scoring */ }
}
```

- [ ] **Step 4: Point the dev buttons at the real API + rebuild**

In `apps/mobile/app/(dev)/gallery.tsx`, change the test buttons to:
```tsx
import { startMatchActivity, updateMatchActivity, endMatchActivity } from '../../lib/live-match-activity';
// Başlat:
onPress={() => startMatchActivity({ matchId: 'test', youSide: 'a', nameA: 'Sen', nameB: 'Ahmet' })}
// Güncelle (test):
onPress={() => updateMatchActivity({ gamesA: 2, gamesB: 1, pointsA: 3, pointsB: 1, phase: 'ongoing' })}
// Bitir:
onPress={() => endMatchActivity({ gamesA: 4, gamesB: 1, pointsA: 0, pointsB: 0, phase: 'finished', winner: 'a' })}
```
Then rebuild: `npx expo run:ios --device "Hazar U." --configuration Release`

- [ ] **Step 5: Verify on device (runtime)**

Dev gallery → Başlat (Island shows Sen/Ahmet 0–0) → Güncelle (Island updates to 2–1, points 40–15) → Bitir (shows "Bitti", winner highlighted, disappears after 3s). Capture a screenshot of the updated state.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/modules apps/mobile/lib/live-match-activity.ts apps/mobile/app/\(dev\)/gallery.tsx
git commit -m "feat(live-activity): native start/update/end + typed JS wrapper (Task 3)"
```

---

### Task 4: Integrate into the live scoring screen

Wire the activity to the real scoring flow: start when entering `score.tsx`, update on every point, end on finish/leave. Remove the dev buttons.

**Files:**
- Modify: `apps/mobile/app/match/[id]/score.tsx`
- Modify: `apps/mobile/app/(dev)/gallery.tsx` (remove the temporary test buttons)

**Interfaces:**
- Consumes: `startMatchActivity` / `updateMatchActivity` / `endMatchActivity` from `apps/mobile/lib/live-match-activity.ts` (Task 3).

- [ ] **Step 1: Compute the player names + youSide in `score.tsx`**

`score.tsx` already resolves `oppName`/`oppFirstName` and `userId`. Determine `youSide` from the match row: the scoring user is in `team_a_player_ids` → `'a'`, else `'b'`. Add near the existing derived values (after `oppName`):
```tsx
const youSide: 'a' | 'b' = match?.team_a_player_ids?.includes(userId ?? '') ? 'a' : 'b';
const youFirstName = useAuthStore((s) => s.profile?.firstName) ?? 'Sen';
// nameA/nameB by side so ContentState a/b stays raw:
const nameA = youSide === 'a' ? youFirstName : oppFirstName;
const nameB = youSide === 'a' ? oppFirstName : youFirstName;
```
> If `profile.firstName` is not on the store, use `'Sen'`. Verify the auth store field name during implementation; fall back to `'Sen'`.

- [ ] **Step 2: Start the activity on mount, end on unmount**

Add an effect in `ActiveMatch()` (after the derived values):
```tsx
import { useEffect } from 'react';
import { startMatchActivity, updateMatchActivity, endMatchActivity } from '../../../lib/live-match-activity';

useEffect(() => {
  if (!match || !id) return;
  startMatchActivity({ matchId: id, youSide, nameA, nameB });
  return () => { endMatchActivity({ gamesA: gA, gamesB: gB, pointsA: pA, pointsB: pB, phase: 'finished' }); };
  // start once per match load; cleanup ends it when leaving the screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [match?.id]);
```

- [ ] **Step 3: Update the activity on every score change**

Add an effect that mirrors local score state to the activity:
```tsx
useEffect(() => {
  const phase: 'ongoing' | 'void' | 'finished' = isVoid ? 'void' : someoneWon ? 'finished' : 'ongoing';
  const winner = someoneWon ? (gA === 4 ? 'a' : 'b') : null;
  updateMatchActivity({ gamesA: gA, gamesB: gB, pointsA: pA, pointsB: pB, phase, winner });
}, [gA, gB, pA, pB, isVoid, someoneWon]);
```

- [ ] **Step 4: Remove the temporary dev buttons**

In `apps/mobile/app/(dev)/gallery.tsx`, remove the three test buttons and the live-match-activity import added in Tasks 1/3.

- [ ] **Step 5: Rebuild on device**

Run from `apps/mobile`:
```bash
npx expo run:ios --device "Hazar U." --configuration Release
```

- [ ] **Step 6: Verify on device (runtime — the real flow)**

On the phone: start/score a real match → enter the live score screen. Expected: a Live Activity appears showing both real names + `0–0`; tap "+" → the Dynamic Island + lock screen update live (games + points); lock the phone mid-match → glance at the score; tap "Maçı Bitir" → activity shows the final score then disappears. Confirm scoring still works normally if Live Activities are disabled in Settings (no-op, no crash). Capture screenshots of the live-updating Island and the lock screen.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/match/\[id\]/score.tsx apps/mobile/app/\(dev\)/gallery.tsx
git commit -m "feat(live-activity): live score on Dynamic Island during scoring (Task 4)"
```

---

## Next Plan (not in scope here)

**Two-device sync** (`2026-06-25-live-activities-sync.md`, written after this foundation is verified on device): `live_activity_tokens` table + RLS, `register-activity-token` + `relay-live-score` edge functions, direct APNs (ES256 JWT + `.p8` in Vault, `apns-push-type: liveactivity`), push-to-start (iOS 17.2+), and starting both players' activities at the handshake so the opponent's Dynamic Island mirrors the live score. This foundation's native module gains `getPushToken()` / `start(pushEnabled)` there.
