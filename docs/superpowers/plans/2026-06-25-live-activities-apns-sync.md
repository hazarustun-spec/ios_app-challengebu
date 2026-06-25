# Cross-Device APNs Sync (Live Activities Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the score changes (`live_match_scores` updated by `award_point`), push the new state to BOTH players' Live Activities via **direct APNs** (`apns-push-type: liveactivity`), so the OPPONENT's Dynamic Island / Lock Screen updates even with their app closed — and start the opponent's activity automatically (push-to-start) when a match begins.

**Architecture:** The native module registers each running activity's APNs update-push-token (+ push-to-start token) with `register-activity-token` → `live_activity_tokens`. An AFTER-UPDATE trigger on `live_match_scores` fires `push-live-score` (pg_net), which signs an ES256 APNs JWT from the `.p8` in Vault and POSTs the new `content-state` to every registered token for the match. Expo's push service does NOT support Live Activity pushes, so this is a direct APNs HTTP/2 integration in Deno.

**Tech Stack:** Deno (Web Crypto ES256), APNs HTTP/2, Supabase (pg_net trigger + Vault), ActivityKit push tokens (Swift), the existing `live_match_scores` + `award_point`.

## Global Constraints

- APNs creds in Vault (seeded out-of-band by the user): `apns_key` (the `.p8` PEM), `apns_key_id` = `N89K322383`, `apns_team_id` = `4MBWF4RGV7`. Never commit the `.p8` (gitignored `*.p8`).
- APNs topic for Live Activity: `app.challengebu.ios.push-type.liveactivity`. Push headers: `apns-push-type: liveactivity`, `apns-topic: <above>`, `apns-priority: 10`, `authorization: bearer <ES256 JWT>`.
- Dev build → **sandbox** APNs host `https://api.sandbox.push.apple.com`. (Production/TestFlight → `https://api.push.apple.com`.) Make the host a Vault value `apns_host` so it flips without a redeploy.
- The APNs JWT: header `{alg:"ES256", kid: apns_key_id}`, payload `{iss: apns_team_id, iat: <now>}`, signed with the P-256 key (ES256). Cache ≤ 50 min.
- The `content-state` JSON keys MUST match the Swift `LiveMatchAttributes.ContentState` Codable keys exactly: `gamesA, gamesB, pointsA, pointsB, phase, winner`.
- A push failure must NEVER block `award_point` / the score update (the trigger is wrapped, like the existing notification dispatch trigger).
- Test reality: one cloud user / one device. The APNs push PATH is verified by pushing to the user's OWN activity token (the activity visibly updates from a server push). True opponent-device visuals need a 2nd device.

---

### Task 1: Direct-APNs helper (ES256 JWT) + a self-push test

**Files:**
- Create: `packages/supabase/functions/_shared/apns.ts`
- Create: `packages/supabase/functions/push-live-activity-test/index.ts` (temporary; removed in Task 3)

**Interfaces:**
- Produces: `sendLiveActivityPush(opts: { host: string; jwt: string; topic: string; deviceToken: string; contentState: Record<string, unknown>; event?: 'update'|'end'; dismissalDate?: number }): Promise<{ status: number; body: string }>` and `makeApnsJwt(p8Pem: string, keyId: string, teamId: string): Promise<string>`.

- [ ] **Step 1: Write the APNs helper**

Create `packages/supabase/functions/_shared/apns.ts`:
```ts
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
function b64url(data: ArrayBuffer | string): string {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function makeApnsJwt(p8Pem: string, keyId: string, teamId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(p8Pem),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = b64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const signing = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signing));
  return `${signing}.${b64url(sig)}`;
}

export async function sendLiveActivityPush(opts: {
  host: string; jwt: string; topic: string; deviceToken: string;
  contentState: Record<string, unknown>; event?: 'update' | 'end'; dismissalDate?: number;
}): Promise<{ status: number; body: string }> {
  const aps: Record<string, unknown> = {
    timestamp: Math.floor(Date.now() / 1000),
    event: opts.event ?? 'update',
    'content-state': opts.contentState,
  };
  if (opts.event === 'end' && opts.dismissalDate) aps['dismissal-date'] = opts.dismissalDate;
  const res = await fetch(`${opts.host}/3/device/${opts.deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${opts.jwt}`,
      'apns-topic': opts.topic,
      'apns-push-type': 'liveactivity',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ aps }),
  });
  return { status: res.status, body: await res.text() };
}
```

- [ ] **Step 2: Write a temporary test endpoint**

Create `packages/supabase/functions/push-live-activity-test/index.ts` that reads the Vault creds, signs a JWT, and pushes a fixed `content-state` to a `deviceToken` passed in the body. (Auth: require the service-role/internal key like `dispatch-push` does — reuse that pattern.) This lets you push to your own activity token to prove the path. Full body:
```ts
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { makeApnsJwt, sendLiveActivityPush } from '../_shared/apns.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    const internalKey = (Deno.env.get('INTERNAL_PUSH_KEY') ?? '').trim();
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!internalKey || token !== internalKey) return errorResponse('Forbidden', 401);
    const { deviceToken, contentState } = await req.json();
    const supa = getServiceClient();
    const secret = async (name: string) => {
      const { data } = await supa.schema('vault').from('decrypted_secrets')
        .select('decrypted_secret').eq('name', name).single();
      return ((data?.decrypted_secret as string) ?? '').trim();
    };
    const jwt = await makeApnsJwt(await secret('apns_key'), await secret('apns_key_id'), await secret('apns_team_id'));
    const host = (await secret('apns_host')) || 'https://api.sandbox.push.apple.com';
    const r = await sendLiveActivityPush({
      host, jwt, topic: 'app.challengebu.ios.push-type.liveactivity',
      deviceToken, contentState,
    });
    return jsonResponse({ apns_status: r.status, apns_body: r.body });
  } catch (err) { return internalError(err); }
});
```
> Note: reading Vault from an edge function may require a SECURITY DEFINER RPC if `vault.decrypted_secrets` isn't selectable by service_role directly — if the `.schema('vault')` select returns null, add a small `get_secret(name)` SECURITY DEFINER RPC (like Plan 2a's pattern) and call it instead. Resolve during implementation.

- [ ] **Step 3: Deploy + self-push test**

Deploy: `cd packages/supabase && supabase functions deploy push-live-activity-test --no-verify-jwt`. Then, with a Live Activity running on the device, get its push token (Task 2 surfaces it; for this first test, temporarily `print` the token from the module's `start` and read it from the device console, OR defer this test until after Task 2). Call the function with `{deviceToken, contentState:{gamesA:3,gamesB:1,pointsA:2,pointsB:0,phase:"ongoing",winner:null}}` and confirm `apns_status` is `200` and the activity on the device updates.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/functions/_shared/apns.ts packages/supabase/functions/push-live-activity-test
git commit -m "feat(la-sync): direct APNs helper (ES256 JWT + liveactivity push) + self-push test endpoint"
```

---

### Task 2: Activity push-token registry + native token capture

**Files:**
- Create: `packages/supabase/migrations/20260626000002_live_activity_tokens.sql`
- Create: `packages/supabase/functions/register-activity-token/index.ts`
- Modify: `apps/mobile/modules/live-match-activity/ios/LiveMatchActivityModule.swift` (start with `pushType: .token`, observe `pushTokenUpdates`, return/emit the token)
- Modify: `apps/mobile/lib/live-match-activity.ts` + `apps/mobile/app/match/[id]/score.tsx` (POST the token to `register-activity-token`)

**Interfaces:**
- Produces: table `public.live_activity_tokens(match_id uuid, user_id uuid, update_token text, updated_at, primary key(match_id,user_id))`; edge fn `register-activity-token({matchId, token})` (auth = user JWT; upserts the row for `auth.uid()`); the module starts the activity with a push token and reports it to JS.

- [ ] **Step 1: Migration — table + RLS**
```sql
create table if not exists public.live_activity_tokens (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null,
  update_token text not null,
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
alter table public.live_activity_tokens enable row level security;
-- writes go through the edge fn (service role); participants may read none directly.
```
Push: `supabase db push`.

- [ ] **Step 2: `register-activity-token` edge fn** — verify the caller's user JWT (reuse `requireAuth`), upsert `{match_id, user_id: auth.uid(), update_token}`. Deploy.

- [ ] **Step 3: Native — start with a push token + report it**

In `LiveMatchActivityModule.swift`, change `Activity.request(..., pushType: .token)` and after requesting, spawn a `Task` observing `activity.pushTokenUpdates` → hex-encode the token → send it to JS via an Expo event (`sendEvent("onPushToken", {token})`). Add `Events("onPushToken")` to the module. (iOS 16.2+.)

- [ ] **Step 4: JS — register the token**

In `lib/live-match-activity.ts`, subscribe to the `onPushToken` event and call `register-activity-token` (via `invokeFunction`) with `{matchId, token}`. Wire from `score.tsx` (it has the matchId + session).

- [ ] **Step 5: Rebuild + verify** (controller rebuilds). On device: start a match activity → confirm a row appears in `live_activity_tokens` (query the cloud). Use this token to re-run Task 1's self-push test → the activity updates from the server push.

- [ ] **Step 6: Commit** each piece as you go (`feat(la-sync): activity token registry + native push-token capture`).

---

### Task 3: Trigger `live_match_scores` → push to all activity tokens

**Files:**
- Create: `packages/supabase/migrations/20260626000003_push_live_score_trigger.sql`
- Create: `packages/supabase/functions/push-live-score/index.ts`
- Delete: `packages/supabase/functions/push-live-activity-test/` (replaced)

**Interfaces:**
- Consumes: `apns.ts` (Task 1), `live_activity_tokens` (Task 2).
- Produces: `push-live-score({matchId})` — pushes the current `live_match_scores` content-state to every token in `live_activity_tokens` for that match; AFTER-UPDATE trigger on `live_match_scores` calls it via pg_net (wrapped, never blocks).

- [ ] **Step 1: `push-live-score` edge fn** — load `live_match_scores` for `matchId`, build the `content-state` (`gamesA/gamesB/pointsA/pointsB/phase/winner`), sign one JWT, loop the match's tokens, `sendLiveActivityPush` each (event `end` + `dismissal-date` when `phase != 'ongoing'`). Auth = INTERNAL_PUSH_KEY (like `dispatch-push`). Deploy `--no-verify-jwt`.

- [ ] **Step 2: Trigger** — AFTER UPDATE on `public.live_match_scores`, a SECURITY DEFINER function reading `edge_functions_url` + `service_role_key` from Vault (whitespace-stripped, like the existing `dispatch_push_on_notification`) → `net.http_post` to `/push-live-score` with `{notificationId: null, matchId: new.match_id}`, wrapped in `exception when others then null`. Push the migration.

- [ ] **Step 3: Verify** — score a point (app or, once Task 4 lands, the lock-screen button) → the activity updates via the server push (not the local update). On one device, confirm the push path end-to-end (the activity reflects the server state).

- [ ] **Step 4: Commit.**

---

### Task 4: push-to-start (opponent's activity auto-starts)

**Files:**
- Modify: `LiveMatchActivityModule.swift` (capture `Activity.pushToStartTokenUpdates`), `live_activity_tokens` (+ `push_to_start_token` column), a `start-opponent-activity` edge fn + a hook at match start.

- [ ] Capture the push-to-start token (iOS 17.2+) → register it. When a match becomes active (the handshake completes), push a start payload to the opponent's push-to-start token so their activity appears without opening the app. Verify both-device behavior (needs a 2nd device). Commit.

> If push-to-start proves too device-dependent to verify with one device, ship Tasks 1-3 (the sync of an already-running activity) and treat Task 4 as a follow-up — both players starting their own activity in-app at the handshake is the fallback.
