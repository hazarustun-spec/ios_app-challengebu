# Plan 2: Backend Logic (Edge Functions + Cron + Realtime)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all server-side business logic — Edge Functions (Deno/TypeScript) for match flow, ELO calculation, account anonymization, push notifications; SQL functions + pg_cron for scheduled lifecycle tasks; Realtime publication setup for live UI updates.

**Architecture:** Each Edge Function lives in `packages/supabase/functions/<name>/index.ts` and uses Deno's standard HTTP handler signature. Shared utilities (Supabase client, CORS, ELO logic) live in `functions/_shared/`. Edge Functions import ELO logic from `packages/shared` via Deno-compatible relative paths with an `import_map.json`. Integration tests start local Supabase, seed fixtures, invoke via HTTP, and assert DB state. Cron jobs are pure SQL functions registered via `pg_cron` extension.

**Tech Stack:** Supabase CLI (Edge Functions + pg_cron), Deno 1.x runtime, `@supabase/supabase-js` (Deno-compatible), `zod` for input validation, packages/shared (relative import), Expo Push API for notifications, bun:test for integration tests.

**Spec reference:** `docs/superpowers/specs/2026-06-06-tennis-challenger-design.md` sections 4.4-4.7 (match flow), 4.6 (ELO), 3.5 (pasiflik), 3.6 (anonymize), 7.3-7.6 (notifications + cron).

**Plan 1 dependency:** Plan 1 is complete. All 21 tables, seed data, packages/shared/elo + schemas are available.

**Plan 2 NOT in scope:** Mobile app (Plan 3+), admin UI (Plan 7), Apple Push setup details (Plan 7), web admin dashboard (Faz 2).

---

## Dosya Yapısı

```
packages/supabase/
├── functions/
│   ├── _shared/
│   │   ├── cors.ts                    # CORS headers helper
│   │   ├── supabase-client.ts         # service-role + user clients
│   │   ├── auth-guard.ts              # extract + verify caller
│   │   ├── errors.ts                  # JSON error responses
│   │   ├── elo.ts                     # re-exports from packages/shared
│   │   └── deno.json
│   ├── import_map.json                # @tennis/shared alias
│   ├── create-match-request/index.ts
│   ├── accept-match-request/index.ts
│   ├── reject-match-request/index.ts
│   ├── select-open-call-application/index.ts
│   ├── submit-match-score/index.ts
│   ├── confirm-match/index.ts
│   ├── raise-dispute/index.ts
│   ├── resolve-dispute/index.ts
│   ├── anonymize-account/index.ts
│   ├── send-push-notification/index.ts
│   ├── register-push-token/index.ts
│   ├── start-season-finale/index.ts
│   ├── close-season/index.ts
│   └── calculate-yearly-championship/index.ts
├── migrations/
│   ├── 20260607000001_realtime_publications.sql
│   ├── 20260607000002_pg_cron_setup.sql
│   ├── 20260607000003_cron_update_user_status.sql
│   ├── 20260607000004_cron_expire_match_requests.sql
│   ├── 20260607000005_cron_auto_confirm_matches.sql
│   ├── 20260607000006_cron_cleanup_notifications.sql
│   ├── 20260607000007_cron_season_lifecycle.sql
│   └── 20260607000008_cron_cleanup_push_tokens.sql
└── tests/
    └── functions/
        ├── helpers.ts                  # test fixtures + HTTP invoker
        ├── create-match-request.test.ts
        ├── confirm-match.test.ts
        ├── submit-match-score.test.ts
        ├── anonymize-account.test.ts
        └── ... (one test file per Edge Function)
```

**Phase outline:**
- **Phase A — Infrastructure (Tasks 1-4):** Realtime publication, _shared utilities, test harness
- **Phase B — Match Request Flow (Tasks 5-9):** Create, accept, reject, select application
- **Phase C — Match Score + ELO (Tasks 10-14):** Submit score, confirm, apply ELO, raise/resolve dispute
- **Phase D — Account & Push (Tasks 15-17):** Anonymize, push send, register token
- **Phase E — Season Management (Tasks 18-20):** Start finale, close season, yearly championship
- **Phase F — Cron Jobs (Tasks 21-26):** pg_cron setup + 6 scheduled SQL functions
- **Phase G — Integration (Task 27):** End-to-end happy-path test

---

## Phase A — Infrastructure

### Task 1: Realtime publication migration

**Files:**
- Create: `packages/supabase/migrations/20260607000001_realtime_publications.sql`

- [ ] **Step 1: Create migration**

```sql
-- Add tables to supabase_realtime publication for live UI updates
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_score_submissions;
alter publication supabase_realtime add table public.match_requests;
alter publication supabase_realtime add table public.disputes;
alter publication supabase_realtime add table public.notifications;
```

- [ ] **Step 2: Apply and verify**

```bash
cd packages/supabase
supabase start
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select schemaname, tablename from pg_publication_tables where pubname='supabase_realtime' order by tablename;"
```
Expected: 5 rows — matches, match_score_submissions, match_requests, disputes, notifications.

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/migrations/20260607000001_realtime_publications.sql
git commit -m "feat(supabase): enable Realtime for live tables"
```

---

### Task 2: Edge Functions _shared utilities

**Files:**
- Create: `packages/supabase/functions/_shared/cors.ts`
- Create: `packages/supabase/functions/_shared/errors.ts`
- Create: `packages/supabase/functions/_shared/supabase-client.ts`
- Create: `packages/supabase/functions/_shared/auth-guard.ts`
- Create: `packages/supabase/functions/deno.json`

- [ ] **Step 1: Create deno.json**

```json
{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2.46.0",
    "zod": "npm:zod@^3.23.8"
  },
  "lint": { "rules": { "tags": ["recommended"] } },
  "fmt": { "lineWidth": 100, "indentWidth": 2, "singleQuote": true }
}
```

- [ ] **Step 2: Create cors.ts**

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
```

- [ ] **Step 3: Create errors.ts**

```typescript
import { corsHeaders } from './cors.ts';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400, details?: unknown): Response {
  return jsonResponse({ error: { message, details } }, status);
}

export function unauthorized(): Response {
  return errorResponse('Unauthorized', 401);
}

export function forbidden(message = 'Forbidden'): Response {
  return errorResponse(message, 403);
}

export function notFound(message = 'Not found'): Response {
  return errorResponse(message, 404);
}

export function conflict(message: string): Response {
  return errorResponse(message, 409);
}

export function internalError(err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  return errorResponse('Internal server error', 500, { message });
}
```

- [ ] **Step 4: Create supabase-client.ts**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getUserClient(authHeader: string): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY required');
  }
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 5: Create auth-guard.ts**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthContext {
  userId: string;
  isAdmin: boolean;
  authHeader: string;
}

export async function requireAuth(req: Request, serviceClient: SupabaseClient): Promise<AuthContext> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new AuthError('Missing authorization header', 401);
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthError('Invalid token', 401);
  }

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .single();

  return {
    userId: data.user.id,
    isAdmin: profile?.role === 'admin',
    authHeader,
  };
}

export async function requireAdmin(req: Request, serviceClient: SupabaseClient): Promise<AuthContext> {
  const ctx = await requireAuth(req, serviceClient);
  if (!ctx.isAdmin) {
    throw new AuthError('Admin role required', 403);
  }
  return ctx;
}

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message);
    this.name = 'AuthError';
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/supabase/functions/deno.json packages/supabase/functions/_shared/
git commit -m "feat(supabase): add Edge Function _shared utilities"
```

---

### Task 3: Import packages/shared into Edge Functions

**Files:**
- Create: `packages/supabase/functions/import_map.json`
- Create: `packages/supabase/functions/_shared/elo.ts`

The packages/shared TypeScript library uses `.js` extensions in its imports (NodeNext convention). Deno needs them to resolve correctly. We bridge via an import map.

- [ ] **Step 1: Create import_map.json**

```json
{
  "imports": {
    "@tennis/shared/elo": "../../shared/src/elo/index.ts",
    "@tennis/shared/types": "../../shared/src/types/index.ts",
    "@tennis/shared/schemas": "../../shared/src/schemas/index.ts",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2.46.0",
    "zod": "npm:zod@^3.23.8"
  }
}
```

- [ ] **Step 2: Create elo.ts in _shared (relative re-export with extension fix)**

The packages/shared files use `.js` extension imports. Deno will follow them and try to resolve `.js` files that don't exist (only `.ts` does). Workaround: re-export with explicit paths.

```typescript
// Re-export ELO logic for Edge Functions
// Note: paths use .ts extension because Deno resolves them directly.
export * from '../../../shared/src/elo/formula.ts';
export * from '../../../shared/src/elo/k-factor.ts';
export * from '../../../shared/src/elo/margin-multiplier.ts';
export type { MatchFormat } from '../../../shared/src/types/formats.ts';
export { ALL_FORMATS } from '../../../shared/src/types/formats.ts';
```

If the `.js` imports inside formula.ts (`from './k-factor.js'`) cause Deno errors, the implementer should add an `unstable` flag to deno.json or use Deno's resolution plugin. Try without first.

- [ ] **Step 3: Smoke-test the import**

Create a temporary test file `packages/supabase/functions/_shared/elo-smoke.ts`:

```typescript
import { calculateEloChange, DEFAULT_STARTING_ELO } from './elo.ts';

const result = calculateEloChange({
  winnerRating: 1200,
  loserRating: 1200,
  winnerMatchesPlayed: 20,
  loserMatchesPlayed: 20,
  format: 'bu_klasik',
  winnerScore: 4,
  loserScore: 2,
});

console.log('DEFAULT_STARTING_ELO:', DEFAULT_STARTING_ELO);
console.log('ELO change:', result);
```

Run: `cd packages/supabase/functions/_shared && deno run --allow-read --no-check elo-smoke.ts`

Expected: prints `DEFAULT_STARTING_ELO: 1200` and a result object with `winnerChange` > 0.

If Deno fails with "Module not found" for `.js` files, the implementer should fix it by:
1. Adding `"compilerOptions": { "noEmit": true, "allowImportingTsExtensions": true }` to deno.json
2. Or creating thin wrapper `.ts` files that re-export without the `.js` indirection

**Once the smoke test passes, DELETE `elo-smoke.ts`.** It's not for production.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/functions/import_map.json packages/supabase/functions/_shared/elo.ts
git commit -m "feat(supabase): bridge packages/shared ELO logic into Edge Functions"
```

---

### Task 4: Test harness for Edge Functions

**Files:**
- Create: `packages/supabase/tests/functions/helpers.ts`
- Modify: `packages/supabase/package.json` (add `test:functions` script)

- [ ] **Step 1: Create helpers.ts**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'http://127.0.0.1:54321';
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
export const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createTestUser(opts: {
  email: string;
  role?: 'player' | 'admin';
  firstName?: string;
  lastName?: string;
  genderCategory?: 'erkek' | 'kadin' | 'open_only';
  departmentName?: string;
}): Promise<{ userId: string; accessToken: string }> {
  const supa = adminClient();

  const { data: created, error: signUpErr } = await supa.auth.admin.createUser({
    email: opts.email,
    password: 'test-password-123',
    email_confirm: true,
  });
  if (signUpErr || !created.user) throw new Error(`createUser: ${signUpErr?.message}`);

  let departmentId: string | null = null;
  if (opts.departmentName) {
    const { data: dept } = await supa
      .from('departments')
      .select('id')
      .eq('name', opts.departmentName)
      .single();
    departmentId = dept?.id ?? null;
  }
  if (!departmentId) {
    const { data: anyDept } = await supa.from('departments').select('id').limit(1).single();
    departmentId = anyDept!.id;
  }

  const { error: profileErr } = await supa.from('profiles').insert({
    user_id: created.user.id,
    role: opts.role ?? 'player',
    first_name: opts.firstName ?? 'Test',
    last_name: opts.lastName ?? 'User',
    email: opts.email,
    pronoun: 'they/them',
    gender_category: opts.genderCategory ?? 'erkek',
    department_id: departmentId,
    class_year: '3',
    skill_self_assessment: 'orta',
    dominant_hand: 'sag',
    availability_windows: ['weekday_evening'],
  });
  if (profileErr) throw new Error(`profile insert: ${profileErr.message}`);

  const { data: session, error: sessionErr } = await supa.auth.admin.generateLink({
    type: 'magiclink',
    email: opts.email,
  });
  if (sessionErr) throw new Error(`generateLink: ${sessionErr.message}`);

  const userSupa = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signIn, error: signInErr } = await userSupa.auth.signInWithPassword({
    email: opts.email,
    password: 'test-password-123',
  });
  if (signInErr || !signIn.session) throw new Error(`signIn: ${signInErr?.message}`);

  return { userId: created.user.id, accessToken: signIn.session.access_token };
}

export async function invokeFunction(
  name: string,
  body: unknown,
  accessToken?: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') ?? '';
  const responseBody = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, body: responseBody };
}

export async function cleanupTestData(): Promise<void> {
  const supa = adminClient();
  // Delete test users by email pattern; profiles cascade
  const { data: users } = await supa.auth.admin.listUsers();
  for (const u of users.users) {
    if (u.email?.endsWith('@test.local')) {
      await supa.auth.admin.deleteUser(u.id);
    }
  }
}
```

- [ ] **Step 2: Update package.json**

Find:
```json
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:status": "supabase status",
    "test": "psql ..."
  }
```

Replace with:
```json
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:status": "supabase status",
    "functions:serve": "supabase functions serve --no-verify-jwt",
    "test:schema": "psql \"postgresql://postgres:postgres@127.0.0.1:54322/postgres\" -v ON_ERROR_STOP=1 -f tests/schema-verification.sql",
    "test:functions": "deno test --allow-net --allow-env --allow-read tests/functions/",
    "test": "bun run test:schema && bun run test:functions"
  }
```

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/tests/functions/helpers.ts packages/supabase/package.json
git commit -m "test(supabase): add Edge Function integration test harness"
```

---
## Phase B — Match Request Flow

### Task 5: create-match-request Edge Function

**Files:**
- Create: `packages/supabase/functions/create-match-request/index.ts`
- Create: `packages/supabase/tests/functions/create-match-request.test.ts`

Validates input, enforces 3-pending-request limit (rated only), inserts match_request with `expires_at = now() + 24h`.

- [ ] **Step 1: Write failing test**

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('create-match-request: direct challenge happy path', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { status, body } = await invokeFunction(
    'create-match-request',
    {
      type: 'direct_challenge',
      targetId: bob.userId,
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    alice.accessToken,
  );

  assertEquals(status, 200);
  const created = body as { id: string; status: string; expiresAt: string };
  assertEquals(created.status, 'pending');

  const { data: row } = await supa.from('match_requests').select('*').eq('id', created.id).single();
  assertEquals(row!.creator_id, alice.userId);
  assertEquals(row!.target_id, bob.userId);
});

Deno.test('create-match-request: enforces 3 pending limit for rated', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const base = {
    type: 'direct_challenge' as const,
    targetId: bob.userId,
    category: 'erkek_tek' as const,
    format: 'bu_klasik' as const,
    isRated: true,
    proposedDate: '2026-07-01',
    proposedTime: '19:00',
    courtId: court!.id,
  };

  for (let i = 0; i < 3; i++) {
    const r = await invokeFunction('create-match-request', base, alice.accessToken);
    assertEquals(r.status, 200);
  }

  const fourth = await invokeFunction('create-match-request', base, alice.accessToken);
  assertEquals(fourth.status, 409);
});

Deno.test('create-match-request: dostluk (unrated) is exempt from limit', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const base = {
    type: 'direct_challenge' as const,
    targetId: bob.userId,
    category: 'erkek_tek' as const,
    format: 'bu_klasik' as const,
    isRated: false,
    proposedDate: '2026-07-01',
    proposedTime: '19:00',
    courtId: court!.id,
  };

  for (let i = 0; i < 5; i++) {
    const r = await invokeFunction('create-match-request', base, alice.accessToken);
    assertEquals(r.status, 200);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Start Supabase + functions serve in two terminals:
```bash
cd packages/supabase
supabase start
# in second terminal:
supabase functions serve --no-verify-jwt
```

Then: `deno test --allow-net --allow-env --allow-read tests/functions/create-match-request.test.ts`
Expected: FAIL — function not deployed.

- [ ] **Step 3: Implement create-match-request/index.ts**

```typescript
import { z } from 'zod';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, conflict, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  type: z.enum(['direct_challenge', 'open_call']),
  targetId: z.string().uuid().optional(),
  category: z.enum([
    'erkek_tek', 'kadin_tek', 'open_tek',
    'erkek_cift', 'kadin_cift', 'karma_cift', 'open_cift',
  ]),
  format: z.enum(['bu_klasik', 'hizli_tiebreak', 'pro_set_8', '3set_klasik']),
  isRated: z.boolean(),
  proposedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proposedTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  courtId: z.string().uuid(),
  creatorPartnerId: z.string().uuid().optional(),
  targetPartnerId: z.string().uuid().optional(),
});

const MAX_PENDING_RATED = 3;
const EXPIRY_HOURS = 24;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);

    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse('Invalid input', 400, parsed.error.format());
    }
    const input = parsed.data;

    if (input.type === 'direct_challenge' && !input.targetId) {
      return errorResponse('targetId required for direct_challenge', 400);
    }
    if (input.type === 'open_call' && input.targetId) {
      return errorResponse('targetId must be null for open_call', 400);
    }

    if (input.isRated) {
      const { count } = await supa
        .from('match_requests')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', auth.userId)
        .eq('is_rated', true)
        .eq('status', 'pending');
      if ((count ?? 0) >= MAX_PENDING_RATED) {
        return conflict(`Maximum ${MAX_PENDING_RATED} pending rated requests allowed`);
      }
    }

    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const { data: row, error: insertErr } = await supa
      .from('match_requests')
      .insert({
        creator_id: auth.userId,
        type: input.type,
        target_id: input.targetId ?? null,
        category: input.category,
        format: input.format,
        is_rated: input.isRated,
        proposed_date: input.proposedDate,
        proposed_time: input.proposedTime,
        court_id: input.courtId,
        creator_partner_id: input.creatorPartnerId ?? null,
        target_partner_id: input.targetPartnerId ?? null,
        expires_at: expiresAt,
      })
      .select('id, status, expires_at')
      .single();

    if (insertErr) return errorResponse('Failed to create match request', 500, insertErr);

    return jsonResponse({
      id: row!.id,
      status: row!.status,
      expiresAt: row!.expires_at,
    });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] **Step 4: Run test to verify pass**

Restart `supabase functions serve`. Then:
`deno test --allow-net --allow-env --allow-read tests/functions/create-match-request.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/functions/create-match-request/ packages/supabase/tests/functions/create-match-request.test.ts
git commit -m "feat(functions): add create-match-request with 3-pending-rated limit"
```

---

### Task 6: accept-match-request Edge Function

**Files:**
- Create: `packages/supabase/functions/accept-match-request/index.ts`
- Create: `packages/supabase/tests/functions/accept-match-request.test.ts`

Accepting a direct challenge sets request status to `accepted` AND creates the `matches` row in `awaiting_confirmation` status.

- [ ] **Step 1: Write failing test**

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

async function makeRequest(aliceToken: string, bobUserId: string): Promise<string> {
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body } = await invokeFunction(
    'create-match-request',
    {
      type: 'direct_challenge',
      targetId: bobUserId,
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    aliceToken,
  );
  return (body as { id: string }).id;
}

Deno.test('accept-match-request: target accepts → match created', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });

  const reqId = await makeRequest(alice.accessToken, bob.userId);
  const { status, body } = await invokeFunction(
    'accept-match-request',
    { requestId: reqId },
    bob.accessToken,
  );

  assertEquals(status, 200);
  const result = body as { matchId: string; requestStatus: string };
  assertEquals(result.requestStatus, 'accepted');

  const supa = adminClient();
  const { data: m } = await supa.from('matches').select('*').eq('id', result.matchId).single();
  assertEquals(m!.status, 'awaiting_confirmation');
  assertEquals(m!.team_a_player_ids[0], alice.userId);
  assertEquals(m!.team_b_player_ids[0], bob.userId);
});

Deno.test('accept-match-request: non-target cannot accept', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const carol = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });

  const reqId = await makeRequest(alice.accessToken, bob.userId);
  const { status } = await invokeFunction(
    'accept-match-request',
    { requestId: reqId },
    carol.accessToken,
  );
  assertEquals(status, 403);
});

Deno.test('accept-match-request: cannot accept expired', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { data: req } = await supa
    .from('match_requests')
    .insert({
      creator_id: alice.userId,
      target_id: bob.userId,
      type: 'direct_challenge',
      category: 'erkek_tek',
      format: 'bu_klasik',
      is_rated: true,
      proposed_date: '2026-07-01',
      proposed_time: '19:00',
      court_id: court!.id,
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      status: 'pending',
    })
    .select('id')
    .single();

  const { status, body } = await invokeFunction(
    'accept-match-request',
    { requestId: req!.id },
    bob.accessToken,
  );
  assertEquals(status, 409);
  assertEquals((body as { error: { message: string } }).error.message.includes('expired'), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — function not deployed.

- [ ] **Step 3: Implement accept-match-request/index.ts**

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, forbidden, conflict, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ requestId: z.string().uuid() });

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);

    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: request, error: fetchErr } = await supa
      .from('match_requests')
      .select('*')
      .eq('id', parsed.data.requestId)
      .single();

    if (fetchErr || !request) return errorResponse('Request not found', 404);

    if (request.type !== 'direct_challenge') {
      return errorResponse('Only direct_challenge requests can be accepted this way', 400);
    }
    if (request.target_id !== auth.userId) {
      return forbidden('Only the target can accept this challenge');
    }
    if (request.status !== 'pending') {
      return conflict(`Request is ${request.status}`);
    }
    if (new Date(request.expires_at).getTime() < Date.now()) {
      await supa.from('match_requests').update({ status: 'expired' }).eq('id', request.id);
      return conflict('Request has expired');
    }

    const playedAt = new Date(`${request.proposed_date}T${request.proposed_time}:00Z`).toISOString();
    const teamA = request.creator_partner_id
      ? [request.creator_id, request.creator_partner_id]
      : [request.creator_id];
    const teamB = request.target_partner_id
      ? [request.target_id, request.target_partner_id]
      : [request.target_id];

    const { data: match, error: matchErr } = await supa
      .from('matches')
      .insert({
        match_request_id: request.id,
        category: request.category,
        format: request.format,
        court_id: request.court_id,
        played_at: playedAt,
        is_rated: request.is_rated,
        team_a_player_ids: teamA,
        team_b_player_ids: teamB,
        status: 'awaiting_confirmation',
      })
      .select('id')
      .single();

    if (matchErr) return errorResponse('Failed to create match', 500, matchErr);

    const { error: updateErr } = await supa
      .from('match_requests')
      .update({ status: 'accepted' })
      .eq('id', request.id);

    if (updateErr) return errorResponse('Failed to update request', 500, updateErr);

    return jsonResponse({ matchId: match!.id, requestStatus: 'accepted' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] **Step 4: Run test to verify pass**

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/functions/accept-match-request/ packages/supabase/tests/functions/accept-match-request.test.ts
git commit -m "feat(functions): add accept-match-request creating awaiting_confirmation match"
```

---

### Task 7: reject-match-request Edge Function

**Files:**
- Create: `packages/supabase/functions/reject-match-request/index.ts`
- Create: `packages/supabase/tests/functions/reject-match-request.test.ts`

Simple: target updates request to `rejected`.

- [ ] **Step 1: Write failing test**

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('reject-match-request: target rejects pending request', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: created } = await invokeFunction(
    'create-match-request',
    {
      type: 'direct_challenge',
      targetId: bob.userId,
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    alice.accessToken,
  );

  const { status } = await invokeFunction(
    'reject-match-request',
    { requestId: (created as { id: string }).id },
    bob.accessToken,
  );
  assertEquals(status, 200);

  const { data: row } = await supa
    .from('match_requests')
    .select('status')
    .eq('id', (created as { id: string }).id)
    .single();
  assertEquals(row!.status, 'rejected');
});

Deno.test('reject-match-request: non-target forbidden', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const carol = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: created } = await invokeFunction(
    'create-match-request',
    {
      type: 'direct_challenge',
      targetId: bob.userId,
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    alice.accessToken,
  );

  const { status } = await invokeFunction(
    'reject-match-request',
    { requestId: (created as { id: string }).id },
    carol.accessToken,
  );
  assertEquals(status, 403);
});
```

- [ ] **Step 2: Verify fail, then implement**

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, forbidden, conflict, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ requestId: z.string().uuid() });

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);

    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: request } = await supa
      .from('match_requests')
      .select('id, target_id, status')
      .eq('id', parsed.data.requestId)
      .single();
    if (!request) return errorResponse('Request not found', 404);
    if (request.target_id !== auth.userId) return forbidden('Only the target can reject');
    if (request.status !== 'pending') return conflict(`Request is ${request.status}`);

    const { error } = await supa
      .from('match_requests')
      .update({ status: 'rejected' })
      .eq('id', request.id);
    if (error) return errorResponse('Failed to reject', 500, error);

    return jsonResponse({ status: 'rejected' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] **Step 3: Run + commit**

```bash
git add packages/supabase/functions/reject-match-request/ packages/supabase/tests/functions/reject-match-request.test.ts
git commit -m "feat(functions): add reject-match-request"
```

---

### Task 8: apply-to-open-call Edge Function

**Files:**
- Create: `packages/supabase/functions/apply-to-open-call/index.ts`
- Create: `packages/supabase/tests/functions/apply-to-open-call.test.ts`

User applies to an open_call match request.

- [ ] **Step 1: Write failing test**

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('apply-to-open-call: user applies to open call', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { body: created } = await invokeFunction(
    'create-match-request',
    {
      type: 'open_call',
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    alice.accessToken,
  );

  const { status } = await invokeFunction(
    'apply-to-open-call',
    { requestId: (created as { id: string }).id },
    bob.accessToken,
  );
  assertEquals(status, 200);

  const { data: apps } = await supa
    .from('open_call_applications')
    .select('*')
    .eq('match_request_id', (created as { id: string }).id);
  assertEquals(apps!.length, 1);
  assertEquals(apps![0].applicant_id, bob.userId);
});

Deno.test('apply-to-open-call: cannot apply to own call', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { body: created } = await invokeFunction(
    'create-match-request',
    {
      type: 'open_call',
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    alice.accessToken,
  );

  const { status } = await invokeFunction(
    'apply-to-open-call',
    { requestId: (created as { id: string }).id },
    alice.accessToken,
  );
  assertEquals(status, 400);
});
```

- [ ] **Step 2: Implement**

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, conflict, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  requestId: z.string().uuid(),
  applicantPartnerId: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: request } = await supa
      .from('match_requests')
      .select('id, creator_id, type, status, expires_at')
      .eq('id', parsed.data.requestId)
      .single();
    if (!request) return errorResponse('Request not found', 404);
    if (request.type !== 'open_call') return errorResponse('Only open_call accepts applications', 400);
    if (request.creator_id === auth.userId) return errorResponse('Cannot apply to your own call', 400);
    if (request.status !== 'pending') return conflict(`Request is ${request.status}`);
    if (new Date(request.expires_at).getTime() < Date.now()) {
      return conflict('Request has expired');
    }

    const { error } = await supa.from('open_call_applications').insert({
      match_request_id: request.id,
      applicant_id: auth.userId,
      applicant_partner_id: parsed.data.applicantPartnerId ?? null,
    });
    if (error) {
      if (error.code === '23505') return conflict('You already applied');
      return errorResponse('Failed to apply', 500, error);
    }

    return jsonResponse({ status: 'applied' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] **Step 3: Run + commit**

```bash
git add packages/supabase/functions/apply-to-open-call/ packages/supabase/tests/functions/apply-to-open-call.test.ts
git commit -m "feat(functions): add apply-to-open-call"
```

---

### Task 9: select-open-call-application Edge Function

**Files:**
- Create: `packages/supabase/functions/select-open-call-application/index.ts`
- Create: `packages/supabase/tests/functions/select-open-call-application.test.ts`

Creator picks one of the applicants; this creates the `matches` row and marks other applications declined.

- [ ] **Step 1: Write failing test**

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('select-application: creator selects applicant', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const carol = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { body: created } = await invokeFunction(
    'create-match-request',
    {
      type: 'open_call',
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    alice.accessToken,
  );
  const requestId = (created as { id: string }).id;

  await invokeFunction('apply-to-open-call', { requestId }, bob.accessToken);
  await invokeFunction('apply-to-open-call', { requestId }, carol.accessToken);

  const { data: bobApp } = await supa
    .from('open_call_applications')
    .select('id')
    .eq('applicant_id', bob.userId)
    .single();

  const { status, body } = await invokeFunction(
    'select-open-call-application',
    { applicationId: bobApp!.id },
    alice.accessToken,
  );
  assertEquals(status, 200);

  const result = body as { matchId: string };
  const { data: match } = await supa.from('matches').select('*').eq('id', result.matchId).single();
  assertEquals(match!.team_b_player_ids[0], bob.userId);

  const { data: carolApp } = await supa
    .from('open_call_applications')
    .select('status')
    .eq('applicant_id', carol.userId)
    .single();
  assertEquals(carolApp!.status, 'declined');
});

Deno.test('select-application: non-creator forbidden', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const carol = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: created } = await invokeFunction(
    'create-match-request',
    {
      type: 'open_call',
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    alice.accessToken,
  );
  const requestId = (created as { id: string }).id;
  await invokeFunction('apply-to-open-call', { requestId }, bob.accessToken);
  const { data: bobApp } = await supa
    .from('open_call_applications')
    .select('id')
    .eq('applicant_id', bob.userId)
    .single();

  const { status } = await invokeFunction(
    'select-open-call-application',
    { applicationId: bobApp!.id },
    carol.accessToken,
  );
  assertEquals(status, 403);
});
```

- [ ] **Step 2: Implement**

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, forbidden, conflict, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ applicationId: z.string().uuid() });

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: app } = await supa
      .from('open_call_applications')
      .select('id, match_request_id, applicant_id, applicant_partner_id, status')
      .eq('id', parsed.data.applicationId)
      .single();
    if (!app) return errorResponse('Application not found', 404);
    if (app.status !== 'pending') return conflict(`Application is ${app.status}`);

    const { data: request } = await supa
      .from('match_requests')
      .select('*')
      .eq('id', app.match_request_id)
      .single();
    if (!request) return errorResponse('Request not found', 404);
    if (request.creator_id !== auth.userId) return forbidden('Only the creator can select');
    if (request.status !== 'pending') return conflict(`Request is ${request.status}`);

    const playedAt = new Date(`${request.proposed_date}T${request.proposed_time}:00Z`).toISOString();
    const teamA = request.creator_partner_id
      ? [request.creator_id, request.creator_partner_id]
      : [request.creator_id];
    const teamB = app.applicant_partner_id
      ? [app.applicant_id, app.applicant_partner_id]
      : [app.applicant_id];

    const { data: match, error: matchErr } = await supa
      .from('matches')
      .insert({
        match_request_id: request.id,
        category: request.category,
        format: request.format,
        court_id: request.court_id,
        played_at: playedAt,
        is_rated: request.is_rated,
        team_a_player_ids: teamA,
        team_b_player_ids: teamB,
        status: 'awaiting_confirmation',
      })
      .select('id')
      .single();
    if (matchErr) return errorResponse('Failed to create match', 500, matchErr);

    await supa.from('open_call_applications').update({ status: 'selected' }).eq('id', app.id);
    await supa
      .from('open_call_applications')
      .update({ status: 'declined' })
      .eq('match_request_id', app.match_request_id)
      .neq('id', app.id);
    await supa.from('match_requests').update({ status: 'accepted' }).eq('id', request.id);

    return jsonResponse({ matchId: match!.id, requestStatus: 'accepted' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] **Step 3: Run + commit**

```bash
git add packages/supabase/functions/select-open-call-application/ packages/supabase/tests/functions/select-open-call-application.test.ts
git commit -m "feat(functions): add select-open-call-application creating match"
```

---

## Phase C — Match Score + ELO

### Task 10: submit-match-score Edge Function

**Files:**
- Create: `packages/supabase/functions/submit-match-score/index.ts`
- Create: `packages/supabase/tests/functions/submit-match-score.test.ts`

Inserts a row into `match_score_submissions`. Compares latest submission from each player; when they match, sets the match's `score_team_a`, `score_team_b`, `winner_team`, `score_details`. Status stays `awaiting_confirmation` until both players run `confirm-match`.

- [ ] **Step 1: Write failing test**

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

async function setupMatch(): Promise<{
  aliceToken: string; bobToken: string; matchId: string;
}> {
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: req } = await invokeFunction('create-match-request', {
    type: 'direct_challenge',
    targetId: bob.userId,
    category: 'erkek_tek',
    format: 'bu_klasik',
    isRated: true,
    proposedDate: '2026-07-01',
    proposedTime: '19:00',
    courtId: court!.id,
  }, alice.accessToken);
  const { body: accept } = await invokeFunction(
    'accept-match-request',
    { requestId: (req as { id: string }).id },
    bob.accessToken,
  );
  return {
    aliceToken: alice.accessToken,
    bobToken: bob.accessToken,
    matchId: (accept as { matchId: string }).matchId,
  };
}

const matchingScore = {
  els: [
    { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'b' },
    { el: 4, winner: 'b' }, { el: 5, winner: 'a' }, { el: 6, winner: 'a' },
  ],
  scoreTeamA: 4,
  scoreTeamB: 2,
  winnerTeam: 'a' as const,
};

Deno.test('submit-match-score: matching submissions populate match', async () => {
  await cleanupTestData();
  const { aliceToken, bobToken, matchId } = await setupMatch();

  const r1 = await invokeFunction('submit-match-score', { matchId, ...matchingScore }, aliceToken);
  assertEquals(r1.status, 200);
  assertEquals((r1.body as { matched: boolean }).matched, false);

  const r2 = await invokeFunction('submit-match-score', { matchId, ...matchingScore }, bobToken);
  assertEquals(r2.status, 200);
  assertEquals((r2.body as { matched: boolean }).matched, true);

  const { data: m } = await adminClient().from('matches').select('*').eq('id', matchId).single();
  assertEquals(m!.score_team_a, 4);
  assertEquals(m!.score_team_b, 2);
  assertEquals(m!.winner_team, 'a');
  assertEquals(m!.status, 'awaiting_confirmation');
});

Deno.test('submit-match-score: mismatched submissions stay pending', async () => {
  await cleanupTestData();
  const { aliceToken, bobToken, matchId } = await setupMatch();

  await invokeFunction('submit-match-score', { matchId, ...matchingScore }, aliceToken);
  const r2 = await invokeFunction('submit-match-score', {
    matchId,
    scoreTeamA: 4,
    scoreTeamB: 1,
    winnerTeam: 'a',
    els: [
      { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'a' },
      { el: 4, winner: 'b' }, { el: 5, winner: 'a' },
    ],
  }, bobToken);
  assertEquals(r2.status, 200);
  assertEquals((r2.body as { matched: boolean }).matched, false);

  const { data: m } = await adminClient().from('matches').select('winner_team').eq('id', matchId).single();
  assertEquals(m!.winner_team, null);
});

Deno.test('submit-match-score: non-participant forbidden', async () => {
  await cleanupTestData();
  const { matchId } = await setupMatch();
  const carol = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });
  const r = await invokeFunction('submit-match-score', { matchId, ...matchingScore }, carol.accessToken);
  assertEquals(r.status, 403);
});
```

- [ ] **Step 2: Verify test fails, then implement**

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, forbidden, conflict, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  matchId: z.string().uuid(),
  scoreTeamA: z.number().int().min(0),
  scoreTeamB: z.number().int().min(0),
  winnerTeam: z.enum(['a', 'b', 'void']),
  els: z.array(z.object({ el: z.number().int().min(1), winner: z.enum(['a', 'b']) })).optional(),
  sets: z.array(z.object({ set: z.number().int(), a: z.number().int(), b: z.number().int() })).optional(),
  games: z.object({ a: z.number().int(), b: z.number().int() }).optional(),
  tiebreakScore: z.object({ a: z.number().int(), b: z.number().int() }).optional(),
  points: z.object({ a: z.number().int(), b: z.number().int() }).optional(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
    const input = parsed.data;

    const { data: match } = await supa
      .from('matches')
      .select('id, status, team_a_player_ids, team_b_player_ids')
      .eq('id', input.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);
    if (match.status !== 'awaiting_confirmation') return conflict(`Match is ${match.status}`);

    const isParticipant =
      match.team_a_player_ids.includes(auth.userId) ||
      match.team_b_player_ids.includes(auth.userId);
    if (!isParticipant) return forbidden('Only participants can submit scores');

    const scoreDetails = {
      scoreTeamA: input.scoreTeamA,
      scoreTeamB: input.scoreTeamB,
      winnerTeam: input.winnerTeam,
      ...(input.els ? { els: input.els } : {}),
      ...(input.sets ? { sets: input.sets } : {}),
      ...(input.games ? { games: input.games } : {}),
      ...(input.tiebreakScore ? { tiebreakScore: input.tiebreakScore } : {}),
      ...(input.points ? { points: input.points } : {}),
    };

    await supa.from('match_score_submissions').insert({
      match_id: match.id,
      submitted_by: auth.userId,
      score_details: scoreDetails,
    });

    // Fetch latest submission per player
    const { data: submissions } = await supa
      .from('match_score_submissions')
      .select('submitted_by, score_details, submitted_at')
      .eq('match_id', match.id)
      .order('submitted_at', { ascending: false });
    if (!submissions) return jsonResponse({ matched: false });

    const latestPerPlayer = new Map<string, unknown>();
    for (const s of submissions) {
      if (!latestPerPlayer.has(s.submitted_by)) {
        latestPerPlayer.set(s.submitted_by, s.score_details);
      }
    }

    const allPlayers = [...match.team_a_player_ids, ...match.team_b_player_ids];
    const allSubmitted = allPlayers.every((p) => latestPerPlayer.has(p));
    if (!allSubmitted) return jsonResponse({ matched: false });

    const first = JSON.stringify(latestPerPlayer.get(allPlayers[0]));
    const allMatch = allPlayers.every((p) => JSON.stringify(latestPerPlayer.get(p)) === first);
    if (!allMatch) return jsonResponse({ matched: false });

    await supa.from('matches').update({
      score_team_a: input.scoreTeamA,
      score_team_b: input.scoreTeamB,
      winner_team: input.winnerTeam,
      score_details: scoreDetails,
    }).eq('id', match.id);

    return jsonResponse({ matched: true });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/functions/submit-match-score/ packages/supabase/tests/functions/submit-match-score.test.ts
git commit -m "feat(functions): add submit-match-score with mismatch detection"
```

---

### Task 11: confirm-match Edge Function (applies ELO when both confirm)

**Files:**
- Create: `packages/supabase/functions/confirm-match/index.ts`
- Create: `packages/supabase/functions/_shared/apply-elo.ts`
- Create: `packages/supabase/tests/functions/confirm-match.test.ts`

When a participant confirms, append to `confirmed_by`. When all participants have confirmed AND a winner is set AND match `is_rated`, run ELO calculation and update `elo_ratings` + `matches.rating_*` + `profiles.last_match_at`.

The `void` case (3-3 BÜ Klasik) sets status `voided` without ELO change.

- [ ] **Step 1: Create _shared/apply-elo.ts**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateEloChange, calculateDoublesEloChange, type MatchFormat } from './elo.ts';

interface MatchRow {
  id: string;
  category: string;
  format: MatchFormat;
  is_rated: boolean;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  score_team_a: number;
  score_team_b: number;
  winner_team: 'a' | 'b' | 'void' | null;
}

export async function applyEloForMatch(supa: SupabaseClient, match: MatchRow): Promise<void> {
  if (!match.is_rated) return;
  if (match.winner_team === 'void' || match.winner_team === null) return;

  const winnerIds = match.winner_team === 'a' ? match.team_a_player_ids : match.team_b_player_ids;
  const loserIds = match.winner_team === 'a' ? match.team_b_player_ids : match.team_a_player_ids;

  const allIds = [...winnerIds, ...loserIds];
  const { data: ratings } = await supa
    .from('elo_ratings')
    .select('profile_id, rating, matches_played')
    .eq('category', match.category)
    .in('profile_id', allIds);

  const ratingOf = new Map<string, { rating: number; matchesPlayed: number }>();
  for (const id of allIds) {
    const existing = ratings?.find((r) => r.profile_id === id);
    ratingOf.set(id, {
      rating: existing?.rating ?? 1200,
      matchesPlayed: existing?.matches_played ?? 0,
    });
  }

  const winnerScore = match.winner_team === 'a' ? match.score_team_a : match.score_team_b;
  const loserScore = match.winner_team === 'a' ? match.score_team_b : match.score_team_a;

  if (winnerIds.length === 1 && loserIds.length === 1) {
    const w = ratingOf.get(winnerIds[0])!;
    const l = ratingOf.get(loserIds[0])!;
    const result = calculateEloChange({
      winnerRating: w.rating,
      loserRating: l.rating,
      winnerMatchesPlayed: w.matchesPlayed,
      loserMatchesPlayed: l.matchesPlayed,
      format: match.format,
      winnerScore,
      loserScore,
    });

    await supa.from('matches').update({
      rating_before_team_a: match.winner_team === 'a' ? w.rating : l.rating,
      rating_after_team_a: match.winner_team === 'a' ? result.winnerNewRating : result.loserNewRating,
      rating_before_team_b: match.winner_team === 'a' ? l.rating : w.rating,
      rating_after_team_b: match.winner_team === 'a' ? result.loserNewRating : result.winnerNewRating,
    }).eq('id', match.id);

    await upsertRating(supa, winnerIds[0], match.category, result.winnerNewRating, w.matchesPlayed + 1);
    await upsertRating(supa, loserIds[0], match.category, result.loserNewRating, l.matchesPlayed + 1);
  } else if (winnerIds.length === 2 && loserIds.length === 2) {
    const w1 = ratingOf.get(winnerIds[0])!;
    const w2 = ratingOf.get(winnerIds[1])!;
    const l1 = ratingOf.get(loserIds[0])!;
    const l2 = ratingOf.get(loserIds[1])!;
    const result = calculateDoublesEloChange({
      winnerTeamRatings: [w1.rating, w2.rating],
      loserTeamRatings: [l1.rating, l2.rating],
      winnerTeamMatchesPlayed: [w1.matchesPlayed, w2.matchesPlayed],
      loserTeamMatchesPlayed: [l1.matchesPlayed, l2.matchesPlayed],
      format: match.format,
      winnerScore,
      loserScore,
    });

    await upsertRating(supa, winnerIds[0], match.category, result.winnerNewRatings[0], w1.matchesPlayed + 1);
    await upsertRating(supa, winnerIds[1], match.category, result.winnerNewRatings[1], w2.matchesPlayed + 1);
    await upsertRating(supa, loserIds[0], match.category, result.loserNewRatings[0], l1.matchesPlayed + 1);
    await upsertRating(supa, loserIds[1], match.category, result.loserNewRatings[1], l2.matchesPlayed + 1);
  } else {
    throw new Error(`Unsupported team sizes: ${winnerIds.length} vs ${loserIds.length}`);
  }

  // Update last_match_at for all participants
  const now = new Date().toISOString();
  await supa.from('profiles').update({ last_match_at: now, status: 'active' }).in('user_id', allIds);
}

async function upsertRating(
  supa: SupabaseClient,
  profileId: string,
  category: string,
  rating: number,
  matchesPlayed: number,
): Promise<void> {
  await supa
    .from('elo_ratings')
    .upsert(
      { profile_id: profileId, category, rating, matches_played: matchesPlayed },
      { onConflict: 'profile_id,category' },
    );
}
```

- [ ] **Step 2: Write failing test**

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

async function playedMatch(): Promise<{ aliceToken: string; bobToken: string; matchId: string; aliceId: string; bobId: string }> {
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: req } = await invokeFunction('create-match-request', {
    type: 'direct_challenge', targetId: bob.userId, category: 'erkek_tek',
    format: 'bu_klasik', isRated: true, proposedDate: '2026-07-01',
    proposedTime: '19:00', courtId: court!.id,
  }, alice.accessToken);
  const { body: acc } = await invokeFunction('accept-match-request', { requestId: (req as { id: string }).id }, bob.accessToken);
  const matchId = (acc as { matchId: string }).matchId;

  const score = {
    matchId,
    scoreTeamA: 4, scoreTeamB: 2, winnerTeam: 'a' as const,
    els: [
      { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'b' },
      { el: 4, winner: 'b' }, { el: 5, winner: 'a' }, { el: 6, winner: 'a' },
    ],
  };
  await invokeFunction('submit-match-score', score, alice.accessToken);
  await invokeFunction('submit-match-score', score, bob.accessToken);

  return { aliceToken: alice.accessToken, bobToken: bob.accessToken, matchId, aliceId: alice.userId, bobId: bob.userId };
}

Deno.test('confirm-match: both confirm → ELO applied', async () => {
  await cleanupTestData();
  const { aliceToken, bobToken, matchId, aliceId, bobId } = await playedMatch();

  const r1 = await invokeFunction('confirm-match', { matchId }, aliceToken);
  assertEquals(r1.status, 200);
  assertEquals((r1.body as { confirmed: boolean }).confirmed, false); // only 1 of 2

  const r2 = await invokeFunction('confirm-match', { matchId }, bobToken);
  assertEquals(r2.status, 200);
  assertEquals((r2.body as { confirmed: boolean }).confirmed, true);

  const supa = adminClient();
  const { data: m } = await supa.from('matches').select('*').eq('id', matchId).single();
  assertEquals(m!.status, 'confirmed');

  const { data: aliceRating } = await supa
    .from('elo_ratings')
    .select('rating')
    .eq('profile_id', aliceId)
    .eq('category', 'erkek_tek')
    .single();
  const { data: bobRating } = await supa
    .from('elo_ratings')
    .select('rating')
    .eq('profile_id', bobId)
    .eq('category', 'erkek_tek')
    .single();

  // Alice won, started at 1200, K=40 (new player), expected=0.5, margin=1.1, change ≈ 22
  if (!aliceRating || !bobRating) throw new Error('ratings missing');
  if (aliceRating.rating <= 1200) throw new Error(`alice rating ${aliceRating.rating} should be > 1200`);
  if (bobRating.rating >= 1200) throw new Error(`bob rating ${bobRating.rating} should be < 1200`);
  assertEquals(aliceRating.rating - 1200, 1200 - bobRating.rating);
});

Deno.test('confirm-match: unrated match → status confirmed, no ELO change', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: req } = await invokeFunction('create-match-request', {
    type: 'direct_challenge', targetId: bob.userId, category: 'erkek_tek',
    format: 'bu_klasik', isRated: false, proposedDate: '2026-07-01',
    proposedTime: '19:00', courtId: court!.id,
  }, alice.accessToken);
  const { body: acc } = await invokeFunction('accept-match-request', { requestId: (req as { id: string }).id }, bob.accessToken);
  const matchId = (acc as { matchId: string }).matchId;

  const score = {
    matchId, scoreTeamA: 4, scoreTeamB: 0, winnerTeam: 'a' as const,
    els: [
      { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'a' }, { el: 4, winner: 'a' },
    ],
  };
  await invokeFunction('submit-match-score', score, alice.accessToken);
  await invokeFunction('submit-match-score', score, bob.accessToken);
  await invokeFunction('confirm-match', { matchId }, alice.accessToken);
  await invokeFunction('confirm-match', { matchId }, bob.accessToken);

  const { data: m } = await supa.from('matches').select('status').eq('id', matchId).single();
  assertEquals(m!.status, 'confirmed');

  const { data: r } = await supa
    .from('elo_ratings')
    .select('rating')
    .eq('category', 'erkek_tek');
  // No ELO rows for unrated match (or unchanged from default)
  for (const row of r ?? []) {
    assertEquals(row.rating, 1200);
  }
});
```

- [ ] **Step 3: Implement confirm-match/index.ts**

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, forbidden, conflict, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';
import { applyEloForMatch } from '../_shared/apply-elo.ts';
import type { MatchFormat } from '../_shared/elo.ts';

const inputSchema = z.object({ matchId: z.string().uuid() });

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: match } = await supa
      .from('matches')
      .select('*')
      .eq('id', parsed.data.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);
    if (match.status !== 'awaiting_confirmation') return conflict(`Match is ${match.status}`);

    const allPlayers: string[] = [...match.team_a_player_ids, ...match.team_b_player_ids];
    if (!allPlayers.includes(auth.userId)) return forbidden('Only participants can confirm');

    if (!match.winner_team) {
      return conflict('Scores must be submitted before confirmation');
    }

    const confirmedBy: string[] = match.confirmed_by ?? [];
    if (confirmedBy.includes(auth.userId)) {
      return jsonResponse({ confirmed: false, alreadyConfirmed: true });
    }
    const newConfirmed = [...confirmedBy, auth.userId];

    const allConfirmed = allPlayers.every((p) => newConfirmed.includes(p));

    if (!allConfirmed) {
      await supa.from('matches').update({ confirmed_by: newConfirmed }).eq('id', match.id);
      return jsonResponse({ confirmed: false });
    }

    // All confirmed
    const newStatus = match.winner_team === 'void' ? 'voided' : 'confirmed';
    await supa.from('matches').update({
      confirmed_by: newConfirmed,
      confirmed_at: new Date().toISOString(),
      status: newStatus,
    }).eq('id', match.id);

    if (newStatus === 'confirmed') {
      await applyEloForMatch(supa, {
        id: match.id,
        category: match.category,
        format: match.format as MatchFormat,
        is_rated: match.is_rated,
        team_a_player_ids: match.team_a_player_ids,
        team_b_player_ids: match.team_b_player_ids,
        score_team_a: match.score_team_a,
        score_team_b: match.score_team_b,
        winner_team: match.winner_team,
      });
    }

    return jsonResponse({ confirmed: true, status: newStatus });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/functions/confirm-match/ packages/supabase/functions/_shared/apply-elo.ts packages/supabase/tests/functions/confirm-match.test.ts
git commit -m "feat(functions): add confirm-match with ELO application"
```

---

### Task 12: raise-dispute Edge Function

**Files:**
- Create: `packages/supabase/functions/raise-dispute/index.ts`
- Create: `packages/supabase/tests/functions/raise-dispute.test.ts`

Participant raises a dispute; match goes to `disputed`, admin gets notified.

- [ ] **Step 1: Implement** (test pattern same as previous; assert 1 row in `disputes`, match.status='disputed')

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, forbidden, conflict, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  matchId: z.string().uuid(),
  reason: z.string().trim().min(1).max(500),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: match } = await supa
      .from('matches')
      .select('id, status, team_a_player_ids, team_b_player_ids')
      .eq('id', parsed.data.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);
    const allPlayers: string[] = [...match.team_a_player_ids, ...match.team_b_player_ids];
    if (!allPlayers.includes(auth.userId)) return forbidden('Only participants can raise disputes');
    if (match.status === 'confirmed' || match.status === 'voided') {
      return conflict(`Match is ${match.status} — cannot dispute`);
    }

    const { data: dispute, error } = await supa.from('disputes').insert({
      match_id: match.id,
      raised_by: auth.userId,
      reason: parsed.data.reason,
    }).select('id').single();
    if (error) return errorResponse('Failed to create dispute', 500, error);

    await supa.from('matches').update({ status: 'disputed' }).eq('id', match.id);

    return jsonResponse({ disputeId: dispute!.id, status: 'disputed' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

Tests: happy path + non-participant 403 + confirmed match 409.

- [ ] **Step 2: Commit**

```bash
git add packages/supabase/functions/raise-dispute/ packages/supabase/tests/functions/raise-dispute.test.ts
git commit -m "feat(functions): add raise-dispute"
```

---

### Task 13: resolve-dispute Edge Function (admin)

**Files:**
- Create: `packages/supabase/functions/resolve-dispute/index.ts`
- Create: `packages/supabase/tests/functions/resolve-dispute.test.ts`

Admin chooses outcome: `approve_a` / `approve_b` / `void` / `replay`. If admin is in the match, auto-resolves to favor opponent (anti-conflict rule from spec 4.7).

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, forbidden, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';
import { applyEloForMatch } from '../_shared/apply-elo.ts';
import type { MatchFormat } from '../_shared/elo.ts';

const inputSchema = z.object({
  disputeId: z.string().uuid(),
  outcome: z.enum(['approve_a', 'approve_b', 'void', 'replay']),
  notes: z.string().max(1000).optional(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: dispute } = await supa
      .from('disputes')
      .select('id, match_id, status')
      .eq('id', parsed.data.disputeId)
      .single();
    if (!dispute) return errorResponse('Dispute not found', 404);
    if (dispute.status !== 'open') return errorResponse('Dispute already resolved', 409);

    const { data: match } = await supa.from('matches').select('*').eq('id', dispute.match_id).single();
    if (!match) return errorResponse('Match not found', 404);

    let outcome = parsed.data.outcome;
    const adminInMatch =
      match.team_a_player_ids.includes(auth.userId) || match.team_b_player_ids.includes(auth.userId);
    if (adminInMatch) {
      // Auto-resolve favoring opponent
      const adminOnA = match.team_a_player_ids.includes(auth.userId);
      outcome = adminOnA ? 'approve_b' : 'approve_a';
    }

    if (outcome === 'replay') {
      await supa.from('matches').update({
        status: 'awaiting_confirmation',
        confirmed_by: [],
        confirmed_at: null,
        winner_team: null,
        score_team_a: 0,
        score_team_b: 0,
        score_details: null,
      }).eq('id', match.id);
    } else if (outcome === 'void') {
      await supa.from('matches').update({
        status: 'voided',
        voided_reason: parsed.data.notes ?? 'Voided by admin',
      }).eq('id', match.id);
    } else {
      const winner = outcome === 'approve_a' ? 'a' : 'b';
      await supa.from('matches').update({
        status: 'confirmed',
        winner_team: winner,
        confirmed_at: new Date().toISOString(),
      }).eq('id', match.id);

      await applyEloForMatch(supa, { ...match, format: match.format as MatchFormat, winner_team: winner });
    }

    await supa.from('disputes').update({
      status: 'resolved',
      resolution_notes: parsed.data.notes ?? null,
      resolved_by: auth.userId,
      resolved_at: new Date().toISOString(),
    }).eq('id', dispute.id);

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'resolve_dispute',
      entity_type: 'dispute',
      entity_id: dispute.id,
      details: { outcome, adminInMatch },
    });

    return jsonResponse({ outcome, status: 'resolved' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

Tests: admin resolves → ELO applied; non-admin 403; admin in match → auto-favor opponent.

- [ ] **Step 2: Commit**

```bash
git add packages/supabase/functions/resolve-dispute/ packages/supabase/tests/functions/resolve-dispute.test.ts
git commit -m "feat(functions): add resolve-dispute with admin-conflict auto-resolve"
```

---

### Task 14: Verify ELO logic via shared elo unit tests still pass

This task adds NO new code; it's a sanity check that confirm-match's ELO application matches the canonical `calculateEloChange` from packages/shared.

- [ ] **Step 1: Run shared tests** — `cd packages/shared && bun test` — expect 94/94 still pass.

- [ ] **Step 2: Run all Edge Function tests** — `cd packages/supabase && bun run test:functions` — expect all green.

- [ ] **Step 3: No commit needed.**

---

## Phase D — Account & Push

### Task 15: anonymize-account Edge Function (App Store policy)

**Files:**
- Create: `packages/supabase/functions/anonymize-account/index.ts`
- Create: `packages/supabase/tests/functions/anonymize-account.test.ts`

Required by App Store. Atomically anonymizes profile, deletes auth.users row, deletes push tokens, writes audit log. Match history preserved.

```typescript
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, forbidden, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);

    // Block deletion if user is the only admin
    const { data: profile } = await supa.from('profiles').select('role').eq('user_id', auth.userId).single();
    if (profile?.role === 'admin') {
      const { count: adminCount } = await supa
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((adminCount ?? 0) <= 1) {
        return forbidden('Cannot delete last admin. Assign another admin first.');
      }
    }

    // Anonymize profile
    await supa.from('profiles').update({
      first_name: 'Eski',
      last_name: 'Üye',
      email: `anonymized-${auth.userId}@deleted.local`,
      phone: null,
      avatar_url: null,
      pinned_badge_ids: [],
      status: 'anonymized',
      pronoun_custom: null,
    }).eq('user_id', auth.userId);

    // Remove push tokens
    await supa.from('push_tokens').delete().eq('profile_id', auth.userId);

    // Audit
    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'anonymize_account',
      entity_type: 'profile',
      entity_id: auth.userId,
      details: {},
    });

    // Delete auth.users (cascade removes session)
    await supa.auth.admin.deleteUser(auth.userId);

    return jsonResponse({ status: 'anonymized' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

Tests: user anonymizes self → profile updated, auth user deleted, last admin protected.

- [ ] Commit:

```bash
git add packages/supabase/functions/anonymize-account/ packages/supabase/tests/functions/anonymize-account.test.ts
git commit -m "feat(functions): add anonymize-account (App Store policy compliance)"
```

---

### Task 16: register-push-token Edge Function

**Files:**
- Create: `packages/supabase/functions/register-push-token/index.ts`
- Create: `packages/supabase/tests/functions/register-push-token.test.ts`

Inserts or upserts a push token for the authenticated user.

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['ios', 'android']),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    await supa.from('push_tokens').upsert(
      {
        profile_id: auth.userId,
        token: parsed.data.token,
        platform: parsed.data.platform,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );

    return jsonResponse({ status: 'registered' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] Commit:

```bash
git add packages/supabase/functions/register-push-token/ packages/supabase/tests/functions/register-push-token.test.ts
git commit -m "feat(functions): add register-push-token"
```

---

### Task 17: send-push-notification Edge Function (internal, called by other functions)

**Files:**
- Create: `packages/supabase/functions/send-push-notification/index.ts`
- Create: `packages/supabase/functions/_shared/expo-push.ts`
- Create: `packages/supabase/tests/functions/send-push-notification.test.ts`

Internal Edge Function — called by other functions (or directly by admin). Inserts notification row, checks user preferences, sends to Expo Push API if enabled.

- [ ] **Step 1: Create _shared/expo-push.ts**

```typescript
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendToExpo(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    throw new Error(`Expo Push failed: ${res.status} ${await res.text()}`);
  }
}
```

- [ ] **Step 2: Implement send-push-notification/index.ts**

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, forbidden, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';
import { sendToExpo, type ExpoPushMessage } from '../_shared/expo-push.ts';

const inputSchema = z.object({
  recipientId: z.string().uuid(),
  category: z.enum([
    'match_proposals', 'match_reminders', 'score_confirmations',
    'elo_and_ranking', 'badges', 'season_and_tournament',
    'community_announcements', 'inactivity_warning',
  ]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    await requireAdmin(req, supa); // internal/admin only
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
    const input = parsed.data;

    // Always insert notification row (visible in-app even if push disabled)
    const { data: notification } = await supa.from('notifications').insert({
      recipient_id: input.recipientId,
      category: input.category,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
    }).select('id').single();

    // Check user preference
    const { data: pref } = await supa
      .from('notification_preferences')
      .select('enabled')
      .eq('profile_id', input.recipientId)
      .eq('category', input.category)
      .single();

    if (pref?.enabled === false) {
      return jsonResponse({ notificationId: notification!.id, pushed: false, reason: 'preference_off' });
    }

    // Fetch push tokens
    const { data: tokens } = await supa
      .from('push_tokens')
      .select('token')
      .eq('profile_id', input.recipientId);

    if (!tokens || tokens.length === 0) {
      return jsonResponse({ notificationId: notification!.id, pushed: false, reason: 'no_tokens' });
    }

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: input.title,
      body: input.body,
      data: input.data,
    }));

    try {
      await sendToExpo(messages);
      await supa.from('notifications').update({ push_sent_at: new Date().toISOString() }).eq('id', notification!.id);
      return jsonResponse({ notificationId: notification!.id, pushed: true, tokenCount: tokens.length });
    } catch (pushErr) {
      console.error('Push failed:', pushErr);
      return jsonResponse({ notificationId: notification!.id, pushed: false, reason: 'expo_error' });
    }
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

Tests: admin sends → notification row + push attempted; user with pref OFF → no push; user with no tokens → no push.

- [ ] Commit:

```bash
git add packages/supabase/functions/send-push-notification/ packages/supabase/functions/_shared/expo-push.ts packages/supabase/tests/functions/send-push-notification.test.ts
git commit -m "feat(functions): add send-push-notification with Expo Push integration"
```

---

## Phase E — Season Management

### Task 18: start-season-finale Edge Function

**Files:**
- Create: `packages/supabase/functions/start-season-finale/index.ts`
- Create: `packages/supabase/tests/functions/start-season-finale.test.ts`

Admin starts a sezon finale: snapshots top N players from `elo_ratings`, creates `tournaments` rows per category, creates first-round `tournament_matches`.

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ seasonId: z.string().uuid() });

const SINGLES_CATEGORIES = ['erkek_tek', 'kadin_tek', 'open_tek'] as const;
const DOUBLES_CATEGORIES = ['erkek_cift', 'kadin_cift', 'karma_cift', 'open_cift'] as const;
const SINGLES_BRACKET_SIZE = 8;
const DOUBLES_BRACKET_SIZE = 4;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: season } = await supa.from('seasons').select('*').eq('id', parsed.data.seasonId).single();
    if (!season) return errorResponse('Season not found', 404);

    const tournamentsCreated: string[] = [];

    for (const category of [...SINGLES_CATEGORIES, ...DOUBLES_CATEGORIES]) {
      const bracketSize = (SINGLES_CATEGORIES as readonly string[]).includes(category)
        ? SINGLES_BRACKET_SIZE : DOUBLES_BRACKET_SIZE;

      // Fetch top N from elo_ratings for this category (active players only)
      const { data: topPlayers } = await supa
        .from('elo_ratings')
        .select('profile_id, rating, profiles!inner(status)')
        .eq('category', category)
        .neq('profiles.status', 'inactive_90')
        .order('rating', { ascending: false })
        .limit(bracketSize);

      if (!topPlayers || topPlayers.length < bracketSize) continue; // skip insufficient

      // Snapshot standings
      for (let i = 0; i < topPlayers.length; i++) {
        const p = topPlayers[i];
        await supa.from('season_standings').insert({
          season_id: season.id,
          profile_id: p.profile_id,
          category,
          final_rating: p.rating,
          rank: i + 1,
          matches_played: 0,
        });
      }

      // Create tournament
      const { data: tournament } = await supa.from('tournaments').insert({
        season_id: season.id,
        category,
        bracket_size: bracketSize,
        status: 'seeded',
      }).select('id').single();
      tournamentsCreated.push(tournament!.id);

      // Seed first-round matches: 1v8 4v5 3v6 2v7 (or 1v4 2v3 for size 4)
      const seedPairs = bracketSize === 8
        ? [[1, 8], [4, 5], [3, 6], [2, 7]]
        : [[1, 4], [2, 3]];
      for (let pos = 0; pos < seedPairs.length; pos++) {
        await supa.from('tournament_matches').insert({
          tournament_id: tournament!.id,
          round: 1,
          bracket_position: pos + 1,
          seed_a: seedPairs[pos][0],
          seed_b: seedPairs[pos][1],
        });
      }
    }

    await supa.from('seasons').update({ status: 'finale' }).eq('id', season.id);

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'start_season_finale',
      entity_type: 'season',
      entity_id: season.id,
      details: { tournamentsCreated: tournamentsCreated.length },
    });

    return jsonResponse({ seasonStatus: 'finale', tournamentCount: tournamentsCreated.length });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

Tests: seed 8 fake erkek_tek players, call function as admin, assert tournament + 4 first-round matches.

- [ ] Commit:

```bash
git add packages/supabase/functions/start-season-finale/ packages/supabase/tests/functions/start-season-finale.test.ts
git commit -m "feat(functions): add start-season-finale with bracket seeding"
```

---

### Task 19: close-season Edge Function

**Files:**
- Create: `packages/supabase/functions/close-season/index.ts`
- Create: `packages/supabase/tests/functions/close-season.test.ts`

After finale completes: awards finale points (100/70/50/25), grants season badges, applies soft ELO reset (`(last + 1200) / 2`) to all profiles.

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ seasonId: z.string().uuid() });

const FINALE_POINTS = { champion: 100, finalist: 70, semifinalist: 50, quarterfinalist: 25 };

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: season } = await supa.from('seasons').select('*').eq('id', parsed.data.seasonId).single();
    if (!season) return errorResponse('Season not found', 404);
    if (season.status === 'closed') return errorResponse('Season already closed', 409);

    // Apply soft reset to all elo_ratings
    const { data: ratings } = await supa.from('elo_ratings').select('id, rating');
    for (const r of ratings ?? []) {
      const newRating = Math.round((r.rating + 1200) / 2);
      await supa.from('elo_ratings').update({ rating: newRating, matches_played: 0 }).eq('id', r.id);
    }

    // Mark season closed
    await supa.from('seasons').update({ status: 'closed' }).eq('id', season.id);

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'close_season',
      entity_type: 'season',
      entity_id: season.id,
      details: { ratingsReset: ratings?.length ?? 0 },
    });

    return jsonResponse({ status: 'closed', ratingsReset: ratings?.length ?? 0 });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

Note: badge granting for sezon top 10/3, finale champion/finalist/semifinalist deferred to Plan 5 (gamification). This task handles ELO reset + state transition only.

- [ ] Commit:

```bash
git add packages/supabase/functions/close-season/ packages/supabase/tests/functions/close-season.test.ts
git commit -m "feat(functions): add close-season with soft ELO reset"
```

---

### Task 20: calculate-yearly-championship Edge Function

**Files:**
- Create: `packages/supabase/functions/calculate-yearly-championship/index.ts`
- Create: `packages/supabase/tests/functions/calculate-yearly-championship.test.ts`

After year-end (3 closed seasons): sums finale points across the year, populates `yearly_championship` table, grants yearly champion badge (badge insert deferred).

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ year: z.number().int().min(2025).max(2100) });

const CATEGORIES = [
  'erkek_tek', 'kadin_tek', 'open_tek',
  'erkek_cift', 'kadin_cift', 'karma_cift', 'open_cift',
];

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { year } = parsed.data;
    let totalChampions = 0;

    for (const category of CATEGORIES) {
      // Sum finale points per profile across all seasons in this year
      // Finale points come from tournament results; for MVP we approximate via season_standings rank.
      // Real implementation will read tournament_matches outcomes; deferred until Plan 6 polishes.
      const { data: standings } = await supa
        .from('season_standings')
        .select('profile_id, rank, seasons!inner(year)')
        .eq('category', category)
        .eq('seasons.year', year);

      const pointsByProfile = new Map<string, number>();
      for (const s of standings ?? []) {
        const points = s.rank === 1 ? 100 : s.rank === 2 ? 70 : s.rank <= 4 ? 50 : s.rank <= 8 ? 25 : 0;
        pointsByProfile.set(s.profile_id, (pointsByProfile.get(s.profile_id) ?? 0) + points);
      }

      const sorted = [...pointsByProfile.entries()].sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < sorted.length; i++) {
        await supa.from('yearly_championship').upsert(
          {
            year,
            category,
            profile_id: sorted[i][0],
            total_finale_points: sorted[i][1],
            rank: i + 1,
          },
          { onConflict: 'year,category,profile_id' },
        );
      }
      if (sorted.length > 0) totalChampions++;
    }

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'calculate_yearly_championship',
      entity_type: 'year',
      details: { year, totalChampions },
    });

    return jsonResponse({ year, categoriesCalculated: totalChampions });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
```

- [ ] Commit:

```bash
git add packages/supabase/functions/calculate-yearly-championship/ packages/supabase/tests/functions/calculate-yearly-championship.test.ts
git commit -m "feat(functions): add calculate-yearly-championship"
```

---

## Phase F — Cron Jobs (SQL + pg_cron)

### Task 21: Enable pg_cron extension

**Files:**
- Create: `packages/supabase/migrations/20260607000002_pg_cron_setup.sql`

```sql
create extension if not exists pg_cron with schema extensions;

grant usage on schema cron to postgres;
```

- [ ] Apply (`supabase db reset`), verify with:
```sql
select extname from pg_extension where extname='pg_cron';
```
Expected: 1 row.

- [ ] Commit:
```bash
git add packages/supabase/migrations/20260607000002_pg_cron_setup.sql
git commit -m "feat(supabase): enable pg_cron extension"
```

---

### Task 22: Cron — update_user_status (daily 03:00 TR)

**Files:**
- Create: `packages/supabase/migrations/20260607000003_cron_update_user_status.sql`

```sql
create or replace function public.update_user_status()
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles set status =
    case
      when last_match_at is null then status -- never played, leave alone
      when last_match_at < now() - interval '90 days' then 'inactive_90'::user_status
      when last_match_at < now() - interval '60 days' then 'hibernating_60'::user_status
      when last_match_at < now() - interval '30 days' then 'frozen_30'::user_status
      else 'active'::user_status
    end
  where status != 'anonymized';
end;
$$;

select cron.schedule(
  'update_user_status_daily',
  '0 0 * * *',  -- 00:00 UTC = 03:00 TR
  $$select public.update_user_status();$$
);
```

- [ ] Apply, verify:
```sql
select jobname, schedule from cron.job where jobname='update_user_status_daily';
```
Expected: 1 row.

- [ ] Commit:
```bash
git add packages/supabase/migrations/20260607000003_cron_update_user_status.sql
git commit -m "feat(supabase): add update_user_status daily cron"
```

---

### Task 23: Cron — expire_match_requests (hourly)

**Files:**
- Create: `packages/supabase/migrations/20260607000004_cron_expire_match_requests.sql`

```sql
create or replace function public.expire_match_requests()
returns void
language plpgsql
security definer
as $$
begin
  update public.match_requests
  set status = 'expired'
  where status = 'pending' and expires_at < now();
end;
$$;

select cron.schedule(
  'expire_match_requests_hourly',
  '0 * * * *',
  $$select public.expire_match_requests();$$
);
```

- [ ] Apply + commit.
```bash
git add packages/supabase/migrations/20260607000004_cron_expire_match_requests.sql
git commit -m "feat(supabase): add expire_match_requests hourly cron"
```

---

### Task 24: Cron — auto_confirm_matches (hourly)

**Files:**
- Create: `packages/supabase/migrations/20260607000005_cron_auto_confirm_matches.sql`

48h after last submission, auto-confirm. Note: this only flips status; ELO application requires the confirm-match Edge Function logic. For SQL, we do a simpler version that marks status='confirmed' and lets a follow-up Edge Function pick it up. For MVP, also apply ELO via SQL? Too complex. Defer ELO to manual admin sweep; cron only flags.

```sql
create or replace function public.auto_confirm_matches()
returns void
language plpgsql
security definer
as $$
begin
  update public.matches
  set
    status = case when winner_team = 'void' then 'voided' else 'confirmed' end,
    confirmed_at = now(),
    voided_reason = case when winner_team = 'void' then 'Auto-voided after 48h' else voided_reason end
  where status = 'awaiting_confirmation'
    and winner_team is not null
    and updated_at < now() - interval '48 hours';
end;
$$;

select cron.schedule(
  'auto_confirm_matches_hourly',
  '15 * * * *',
  $$select public.auto_confirm_matches();$$
);
```

**Note:** ELO application happens via the `confirm-match` Edge Function flow only when participants confirm manually. Auto-confirmed matches via this cron DO NOT update ELO (this is a known limitation tracked for Plan 5 polish — a follow-up trigger or admin sweep tool will handle stale ELO for auto-confirmed matches).

- [ ] Commit:
```bash
git add packages/supabase/migrations/20260607000005_cron_auto_confirm_matches.sql
git commit -m "feat(supabase): add auto_confirm_matches hourly cron (no ELO)"
```

---

### Task 25: Cron — cleanup_notifications (daily 04:00 TR) + cleanup_push_tokens (weekly)

**Files:**
- Create: `packages/supabase/migrations/20260607000006_cron_cleanup_notifications.sql`
- Create: `packages/supabase/migrations/20260607000007_cron_cleanup_push_tokens.sql`

cleanup_notifications.sql:
```sql
create or replace function public.cleanup_notifications()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.notifications where created_at < now() - interval '30 days';
end;
$$;

select cron.schedule(
  'cleanup_notifications_daily',
  '0 1 * * *',  -- 01:00 UTC = 04:00 TR
  $$select public.cleanup_notifications();$$
);
```

cleanup_push_tokens.sql:
```sql
create or replace function public.cleanup_push_tokens()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.push_tokens where last_active_at < now() - interval '60 days';
end;
$$;

select cron.schedule(
  'cleanup_push_tokens_weekly',
  '0 3 * * 0',  -- Sunday 03:00 UTC
  $$select public.cleanup_push_tokens();$$
);
```

- [ ] Apply both, verify with `select jobname from cron.job;` — expect 5 cron jobs total (3 existing + 2 new).

- [ ] Commit:
```bash
git add packages/supabase/migrations/20260607000006_cron_cleanup_notifications.sql packages/supabase/migrations/20260607000007_cron_cleanup_push_tokens.sql
git commit -m "feat(supabase): add cleanup notifications and push tokens crons"
```

---

### Task 26: Cron — season_lifecycle_check (daily 06:00 TR)

**Files:**
- Create: `packages/supabase/migrations/20260607000008_cron_season_lifecycle.sql`

Transitions season status `upcoming → active → finale → closed` based on dates. Admin gets a notification at the start of finale window.

```sql
create or replace function public.season_lifecycle_check()
returns void
language plpgsql
security definer
as $$
declare
  s record;
  admin_id uuid;
begin
  -- Transition: upcoming → active
  update public.seasons
  set status = 'active'
  where status = 'upcoming' and starts_at <= now();

  -- Transition: active → finale (when finale_starts_at reached)
  for s in
    select id, name, year from public.seasons
    where status = 'active' and finale_starts_at <= now()
  loop
    update public.seasons set status = 'finale' where id = s.id;

    -- Notify all admins (insert in-app notification rows)
    for admin_id in select user_id from public.profiles where role = 'admin' loop
      insert into public.notifications (recipient_id, category, title, body, data)
      values (
        admin_id,
        'season_and_tournament',
        'Sezon finali zamanı',
        format('%s %s sezonu finale dönemine girdi. Bracket''i başlat.', s.name, s.year),
        jsonb_build_object('season_id', s.id, 'action', 'start_finale')
      );
    end loop;
  end loop;

  -- Note: finale → closed transition is admin-triggered via close-season Edge Function
  -- (we don't auto-close because tournament matches may still be in progress)
end;
$$;

select cron.schedule(
  'season_lifecycle_daily',
  '0 3 * * *',  -- 03:00 UTC = 06:00 TR
  $$select public.season_lifecycle_check();$$
);
```

- [ ] Apply, verify 6 cron jobs registered: `select count(*) from cron.job;` → 6.

- [ ] Commit:
```bash
git add packages/supabase/migrations/20260607000008_cron_season_lifecycle.sql
git commit -m "feat(supabase): add season_lifecycle_check daily cron"
```

---

## Phase G — Integration

### Task 27: End-to-end happy-path integration test

**Files:**
- Create: `packages/supabase/tests/functions/e2e-happy-path.test.ts`

Full match flow: create-match-request → accept → submit×2 (matching) → confirm×2 → ELO applied → verify standings.

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('E2E: full direct challenge → ELO applied', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  // 1. Create
  const { body: created } = await invokeFunction('create-match-request', {
    type: 'direct_challenge', targetId: bob.userId, category: 'erkek_tek',
    format: 'bu_klasik', isRated: true, proposedDate: '2026-07-01',
    proposedTime: '19:00', courtId: court!.id,
  }, alice.accessToken);
  const requestId = (created as { id: string }).id;

  // 2. Accept
  const { body: accepted } = await invokeFunction('accept-match-request', { requestId }, bob.accessToken);
  const matchId = (accepted as { matchId: string }).matchId;

  // 3. Submit scores (both matching)
  const score = {
    matchId, scoreTeamA: 4, scoreTeamB: 0, winnerTeam: 'a' as const,
    els: [
      { el: 1, winner: 'a' }, { el: 2, winner: 'a' },
      { el: 3, winner: 'a' }, { el: 4, winner: 'a' },
    ],
  };
  const s1 = await invokeFunction('submit-match-score', score, alice.accessToken);
  assertEquals((s1.body as { matched: boolean }).matched, false);
  const s2 = await invokeFunction('submit-match-score', score, bob.accessToken);
  assertEquals((s2.body as { matched: boolean }).matched, true);

  // 4. Confirm
  const c1 = await invokeFunction('confirm-match', { matchId }, alice.accessToken);
  assertEquals((c1.body as { confirmed: boolean }).confirmed, false);
  const c2 = await invokeFunction('confirm-match', { matchId }, bob.accessToken);
  assertEquals((c2.body as { confirmed: boolean }).confirmed, true);

  // 5. Verify state
  const { data: match } = await supa.from('matches').select('*').eq('id', matchId).single();
  assertEquals(match!.status, 'confirmed');
  assertEquals(match!.rating_after_team_a! > match!.rating_before_team_a!, true);

  const { data: aliceRating } = await supa
    .from('elo_ratings')
    .select('rating, matches_played')
    .eq('profile_id', alice.userId)
    .eq('category', 'erkek_tek')
    .single();
  assertEquals(aliceRating!.matches_played, 1);
  assertEquals(aliceRating!.rating > 1200, true); // bagel win, big margin
});
```

- [ ] Run: `cd packages/supabase && bun run test:functions` — all green.

- [ ] Commit:
```bash
git add packages/supabase/tests/functions/e2e-happy-path.test.ts
git commit -m "test(functions): add end-to-end happy-path integration test"
```

---

## Plan 2 Sonu

Bu plan tamamlandığında:

- **14 Edge Function** deployed locally
- **8 yeni migration** (1 realtime + 1 pg_cron + 6 cron functions)
- **6 cron job** registered (4 hourly/daily + 1 weekly + 1 daily season lifecycle)
- **~25 integration test** geçiyor (her function + E2E)
- Full match flow works server-side: create request → accept → submit score (with mismatch detection) → confirm → ELO update → ratings persisted

**Bilinen sınırlamalar (Plan 5+ için not):**
- `auto_confirm_matches` cron ELO uygulamıyor — admin sweep tool veya trigger eklenecek
- Badge granting (sezon top 10/3, finale şampiyonu, milestone'lar) Plan 5'te eklenecek
- `calculate-yearly-championship` rank-based puan kullanıyor; gerçek tournament outcome-based hesap Plan 6'da iyileştirilecek
- Push notification calls (other Edge Functions → send-push-notification) Plan 7'de bağlanacak — şu an sadece function var, çağrılmıyor

**Sonraki plan:** Plan 3 — Mobile Skeleton + Auth + Onboarding (Expo app, magic link, 11-step onboarding flow).


