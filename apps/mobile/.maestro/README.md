# Maestro E2E flows

Mobile UI flow tests for the live-scoring journey (Maestro 2.6+, JDK 17+).

## Flows
- `smoke.yaml` — launches the app (target sanity check).
- `score-undo.yaml` — deep-links to a match's score screen, awards a point
  ("Sana sayı": 0 → 15), then undoes it ("Geri Al": 15 → 0). Proves the
  in-app award + server-authoritative event-sourced undo.

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
