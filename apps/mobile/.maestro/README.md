# Maestro E2E flows

Mobile UI flow tests for the live-scoring journey (Maestro 2.6+, JDK 17+).

## App id reconciliation
These flows target the CURRENT app id **`app.challengebu.ios`** (deep-link
scheme `tennischallenger://`). The legacy `qa/maestro/*` flows targeted the old
`tr.edu.boun.tennischallenger` id; the auto-login technique was carried over and
adapted here (Splash → Welcome was added in front of the email screen).

## Flows
- `smoke.yaml` — launches the app (target sanity check).
- `review-login.yaml` — App Store review path (`appreview42@proton.me` + code
  `424242` via `review-login` Edge Function; no Mailpit). Use for CI / resubmit QA.
- `ci-suite.yaml` — chains smoke → login → onboarding → leaderboard → profile → settings.
- `login.yaml` — full email-OTP sign-in: Welcome → email → KVKK → "Kod gönder"
  → `get-otp.js` (reads the code from local Mailpit) → 6-digit entry. Lands a
  NEW account on onboarding step 1. Pass `-e EMAIL=…`.
- `onboarding.yaml` — completes the 10-step onboarding wizard (name, phone,
  pronoun, category=**Kadın**, year, department, level, hand, availability,
  photo → done) and enters the home tabs. Runs right after `login.yaml`.
- `match-lifecycle.yaml` — **full match journey on one device** (see below).
- `score-undo.yaml` — deep-links to a match's score screen, awards a point
  ("Sana sayı": 0 → 15), then undoes it ("Geri Al": 15 → 0). Proves the
  in-app award + server-authoritative event-sourced undo.

## Two-user match lifecycle (`match-lifecycle.yaml`)
A single device can only be signed in as ONE user, but a complete match needs a
second player to accept, start, and confirm. So the signed-in user (Alice)
drives THEIR half **in-UI**, and the OPPONENT's half is **seeded** against the
local Supabase stack between Maestro steps:

| Stage | Driver | File |
|-------|--------|------|
| login + onboarding (Alice, `kadin`) | in-UI | `login.yaml` + `onboarding.yaml` |
| create opponent (`kadin`, active)   | seed  | `seed-opponent.js` |
| send direct ranking challenge       | in-UI | `match/new/*` |
| opponent **accepts** → match row    | seed  | `seed-accept.js` (→ `output.matchId`) |
| start handshake (Alice taps + opp)  | in-UI + seed | `seed-start.js` |
| live scoring → Alice wins 4-0       | in-UI | "Sana sayı" ×16 |
| submit score → "Kazandın!"          | in-UI | — |
| opponent **confirms** → settled     | seed  | `seed-confirm.js` |

### Why REST and not `psql` inside the flow
Maestro's `runScript` JS sandbox only exposes `http` (same as `get-otp.js`) —
there is **no shell**, so it cannot run
`psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'` from within a
flow. The `seed-*.js` scripts therefore perform the identical writes via the
LOCAL service-role REST + GoTrue admin API. Each script documents its SQL
equivalent, and `.maestro/seed/*.sql` mirrors them 1:1 for anyone driving
seeding EXTERNALLY (e.g. a wrapper that interleaves `maestro test` segments with
`psql -f`, or for manual debugging). The local demo service-role key is embedded
(safe — it is never valid against a real project) and overridable via the flow
`env` block / `-e`.

```sh
# Run the whole lifecycle on a booted simulator with the app installed:
maestro test -e EMAIL=alice@std.bogazici.edu.tr .maestro/match-lifecycle.yaml
```

## Prerequisites
1. **JDK 17+** and the Maestro CLI on PATH:
   ```sh
   export JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home"
   export PATH="$HOME/.maestro/bin:$JAVA_HOME/bin:$PATH"
   ```
2. **A running target with the app installed + LOGGED IN.** Maestro cannot
   automate the magic-link / email-OTP login, so use one of:
   - a target with a persisted session (log in once manually), or
   - a test account + a deterministic sign-in (recommended for CI — e.g. a
     password-auth test user, or inject a Supabase session into storage).
3. **`MATCH_ID`** — a match the signed-in user participates in, at 0-0 (fresh
   `point_events`). Create one via SQL/API in a setup step.

## Running

### iOS Simulator (recommended — no driver signing)
```sh
# build + boot the app on a simulator (eas dev profile has simulator:true)
npx expo run:ios                       # from apps/mobile, no --device
# log in once on the simulator, create a 0-0 match, then:
maestro test -e MATCH_ID=<uuid> .maestro/score-undo.yaml
```

### Physical iOS device (extra setup)
Maestro detects the device but must build+sign its own XCUITest driver app:
```sh
maestro test --apple-team-id 4MBWF4RGV7 -e MATCH_ID=<uuid> .maestro/score-undo.yaml
```
On a personal/free Apple team the driver build often fails to provision
(`Failed to build iOS driver`). Use the simulator, or provision the Maestro
driver bundle ids in your Apple Developer account / sign them manually in Xcode.

## CI note
A real CI run needs (a) a simulator build, (b) a test-auth strategy so the app
starts logged in, and (c) a setup step that seeds a 0-0 `MATCH_ID`. The flows
above are runner-agnostic and ready once those three are in place.
