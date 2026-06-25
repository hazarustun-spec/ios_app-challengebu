# Interactive Lock-Screen Scoring (Live Activities Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put **"Sen +1" / "Rakip +1" buttons on the Live Activity** (lock screen + Dynamic Island expanded) so the scorer can change the match score WITHOUT opening the app. Each tap calls the server `award_point` RPC (Phase 1-2, done) and updates the activity from the returned authoritative score.

**Architecture:** Live Activity buttons run a `LiveActivityIntent` (App Intent, iOS 17+ — iOS 26 here) in the app's process. The intent reads the signed-in user's Supabase access token + the match id from a shared **App Group** container (written by the app when the activity starts), POSTs to `…/rest/v1/rpc/award_point`, and calls `Activity.update(...)` with the new score. No app launch, no JS. This is local-device only; pushing the change to the OPPONENT's device is the next plan (Phase 3, direct APNs).

**Tech Stack:** Swift, ActivityKit, App Intents (`LiveActivityIntent`), App Groups (shared `UserDefaults`), `@bacons/apple-targets`, Expo Modules API, the existing `award_point` PostgREST RPC.

## Global Constraints

- Buttons: **"Sen +1"** (`side='a'` or `'b'` depending on `youSide`) and **"Rakip +1"** (the other side). The intent must award to the correct raw `a`/`b` side using the activity's `youSide` attribute, NOT a fixed side.
- Auth: the App Intent has no JS bridge; it reads `{ supabaseUrl, supabaseAnonKey, accessToken, matchId }` from App Group `UserDefaults` (suite `group.app.challengebu.ios`). The app writes these when it starts the activity, and refreshes `accessToken` on start (good for a match's duration).
- App Group id: `group.app.challengebu.ios` — added to BOTH the app target and the widget target entitlements.
- `award_point(p_match_id uuid, p_side text)` returns the new `live_match_scores` row (`games_a/games_b/points_a/points_b/phase/winner`). Call it via `POST {url}/rest/v1/rpc/award_point` with headers `apikey`, `Authorization: Bearer {accessToken}`, body `{"p_match_id": "...","p_side":"a|b"}`.
- The shared `LiveMatchAttributes` struct (duplicated in widget target + module per Plan 1) gains nothing here; the intent + buttons live in the widget target with the attributes.
- Production-ready; an intent failure must not crash — on any error the intent returns without updating (the score stays; the app's Realtime corrects on next open).
- Device: `npx expo run:ios --device "Hazar U." --configuration Release`. Verified on device (iOS 26, Dynamic Island).

---

### Task 1: App Group + the app writes auth context when the activity starts

**Files:**
- Modify: `apps/mobile/app.json` (App Group entitlement on the app)
- Modify: `apps/mobile/targets/live-activity/expo-target.config.js` (App Group entitlement on the widget)
- Modify: `apps/mobile/modules/live-match-activity/ios/LiveMatchActivityModule.swift` (write auth context to the App Group in `start`)
- Modify: `apps/mobile/lib/live-match-activity.ts` + `apps/mobile/app/match/[id]/score.tsx` (pass `supabaseUrl/anonKey/accessToken` into `start`)

**Interfaces:**
- Produces: App Group `group.app.challengebu.ios` readable by the widget; `LiveMatchActivity.start` now also accepts `supabaseUrl`, `supabaseAnonKey`, `accessToken` and writes `{supabaseUrl, supabaseAnonKey, accessToken, matchId}` to `UserDefaults(suiteName: "group.app.challengebu.ios")`.

- [ ] **Step 1: Add the App Group to the app**

In `apps/mobile/app.json` `expo.ios`, add:
```json
"entitlements": {
  "com.apple.security.application-groups": ["group.app.challengebu.ios"]
}
```

- [ ] **Step 2: Add the App Group to the widget target**

In `apps/mobile/targets/live-activity/expo-target.config.js`, add `entitlements`:
```js
module.exports = () => ({
  type: 'widget',
  name: 'LiveMatch',
  deploymentTarget: '16.2',
  frameworks: ['SwiftUI', 'ActivityKit', 'AppIntents'],
  entitlements: {
    'com.apple.security.application-groups': ['group.app.challengebu.ios'],
  },
});
```

- [ ] **Step 3: Write auth context to the App Group in the module's `start`**

In `apps/mobile/modules/live-match-activity/ios/LiveMatchActivityModule.swift`, in the `start` AsyncFunction, before requesting the activity, persist the auth context:
```swift
if let defaults = UserDefaults(suiteName: "group.app.challengebu.ios") {
  defaults.set(a["supabaseUrl"] as? String ?? "", forKey: "supabaseUrl")
  defaults.set(a["supabaseAnonKey"] as? String ?? "", forKey: "supabaseAnonKey")
  defaults.set(a["accessToken"] as? String ?? "", forKey: "accessToken")
  defaults.set(a["matchId"] as? String ?? "", forKey: "matchId")
}
```

- [ ] **Step 4: Pass the auth context from JS**

In `apps/mobile/lib/live-match-activity.ts`, extend `LiveMatchAttrs` with `supabaseUrl?: string; supabaseAnonKey?: string; accessToken?: string;` and pass them through `start`. In `apps/mobile/app/match/[id]/score.tsx`, read them from the supabase client/session and include in the `startMatchActivity({...})` call (grep how the app exposes `EXPO_PUBLIC_SUPABASE_URL` / the session access token — e.g. `supabase.auth.getSession()` or the auth store).

- [ ] **Step 5: Rebuild + verify the App Group write (runtime)**

Run `npx expo run:ios --device "Hazar U." --configuration Release` (the controller runs this). On device: enter a match score screen (starts the activity). No crash; the activity still appears. (The App Group write has no visible effect yet — Task 2 reads it.)

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app.json apps/mobile/targets/live-activity/expo-target.config.js apps/mobile/modules/live-match-activity/ios/LiveMatchActivityModule.swift apps/mobile/lib/live-match-activity.ts apps/mobile/app/match/\[id\]/score.tsx
git commit -m "feat(live-activity): App Group + app writes auth context for the App Intent (Task 1)"
```

---

### Task 2: `AwardPointIntent` + interactive buttons on the Live Activity

**Files:**
- Create: `apps/mobile/targets/live-activity/AwardPointIntent.swift`
- Modify: `apps/mobile/targets/live-activity/LiveMatchLiveActivity.swift` (add the two buttons)

**Interfaces:**
- Consumes: App Group `group.app.challengebu.ios` (Task 1); `award_point` RPC.
- Produces: `AwardPointIntent(side: String)` — a `LiveActivityIntent` that awards a point and updates the running activity.

- [ ] **Step 1: Write the App Intent**

Create `apps/mobile/targets/live-activity/AwardPointIntent.swift`:
```swift
import AppIntents
import ActivityKit

@available(iOS 17.0, *)
struct AwardPointIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Sayı ekle"
  @Parameter(title: "side") var side: String
  init() {}
  init(side: String) { self.side = side }

  func perform() async throws -> some IntentResult {
    guard let d = UserDefaults(suiteName: "group.app.challengebu.ios"),
          let url = d.string(forKey: "supabaseUrl"), !url.isEmpty,
          let anon = d.string(forKey: "supabaseAnonKey"),
          let token = d.string(forKey: "accessToken"),
          let matchId = d.string(forKey: "matchId"), !matchId.isEmpty
    else { return .result() }

    var req = URLRequest(url: URL(string: "\(url)/rest/v1/rpc/award_point")!)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.setValue(anon, forHTTPHeaderField: "apikey")
    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    req.httpBody = try JSONSerialization.data(
      withJSONObject: ["p_match_id": matchId, "p_side": side])

    let (data, _) = try await URLSession.shared.data(for: req)
    guard let row = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    else { return .result() }

    if #available(iOS 16.2, *) {
      let state = LiveMatchAttributes.ContentState(
        gamesA: row["games_a"] as? Int ?? 0, gamesB: row["games_b"] as? Int ?? 0,
        pointsA: row["points_a"] as? Int ?? 0, pointsB: row["points_b"] as? Int ?? 0,
        phase: row["phase"] as? String ?? "ongoing", winner: row["winner"] as? String)
      for activity in Activity<LiveMatchAttributes>.activities
      where activity.attributes.matchId == matchId {
        await activity.update(.init(state: state, staleDate: nil))
      }
    }
    return .result()
  }
}
```
> Note: PostgREST returns the RPC result; for a `RETURNS public.live_match_scores` function it is a JSON OBJECT. If it returns an array, take `[0]`. Verify against the live RPC during implementation.

- [ ] **Step 2: Add the buttons to the Live Activity UI**

In `apps/mobile/targets/live-activity/LiveMatchLiveActivity.swift`, in the `LockScreenView` body (after the two score rows) and in the Dynamic Island `.bottom` expanded region, add (gated `if #available(iOS 17.0, *)`):
```swift
HStack(spacing: 8) {
  Button(intent: AwardPointIntent(side: attributes.youSide)) {
    Text("Sen +1").font(.system(.caption, design: .rounded).bold())
      .frame(maxWidth: .infinity).padding(.vertical, 6)
  }.tint(ScoreFormat.lime)
  Button(intent: AwardPointIntent(side: attributes.youSide == "a" ? "b" : "a")) {
    Text("Rakip +1").font(.system(.caption, design: .rounded).bold())
      .frame(maxWidth: .infinity).padding(.vertical, 6)
  }.tint(ScoreFormat.court)
}
.buttonStyle(.borderedProminent)
```
(`attributes` is `context.attributes` — pass it into `LockScreenView`, which already has it.) Hide the buttons when `state.phase != "ongoing"`.

- [ ] **Step 3: Rebuild on device**

Controller runs `npx expo run:ios --device "Hazar U." --configuration Release`.

- [ ] **Step 4: Verify on device (runtime)**

On the phone: enter a match score screen (starts the activity + writes auth context) → LOCK the phone → on the Lock Screen Live Activity, tap **"Sen +1"** → the activity score increments (40, then a game, etc.) WITHOUT opening the app → tap "Rakip +1" → opponent side increments. Open the app → `score.tsx` shows the same score (loaded from the server). Capture a screenshot of the lock-screen buttons + an incremented score.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/targets/live-activity/AwardPointIntent.swift apps/mobile/targets/live-activity/LiveMatchLiveActivity.swift
git commit -m "feat(live-activity): interactive Sen/Rakip +1 buttons via AwardPointIntent (Task 2)"
```

---

## Next Plan (not in scope here)

**Phase 3 — cross-device APNs sync** (`2026-06-26-live-activities-apns-sync.md`): the `.p8` APNs key + key id `N89K322383` + team id `4MBWF4RGV7` → Supabase Vault; a direct-APNs helper (ES256 JWT, HTTP/2, `apns-push-type: liveactivity`) in an edge function; `live_activity_tokens` + `register-activity-token`; a trigger on `live_match_scores` that pushes the new state to the OTHER player's activity token; and push-to-start so the opponent's activity appears automatically. With this, a point scored on one lock screen updates the other player's Dynamic Island even with their app closed.
