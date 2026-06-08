# Plan 6: Sezon + Turnuva Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the season + tournament surface end-to-end on top of the data model, cron job and three Edge Functions Plan 1/2 already shipped. The work ships: (1) an audit + hardening pass on the existing `close-season` / `start-season-finale` / `calculate-yearly-championship` functions, (2) a shared `@tennis/shared/seasons` package (academic-year calendar + finale-points table), (3) a new `advance-tournament-bracket` Edge Function that promotes winners QF → SF → F, (4) a season banner on the Maçlar tab, (5) season-boundary vertical markers + soft-reset visual break on the ELO Geçmişi chart (Plan 5 Faz D deferred items), (6) a tournament bracket viewer at `/tournament/[id]`, (7) yearly championship standings screen at `/yearly-championship/[year]`, (8) a "geçen sezon şampiyonu" 👑 highlight on the Profile header, and (9) a backend E2E script that exercises the full close-season → start-finale → award-season-badges loop.

**Architecture:** All seasonal lifecycle transitions stay backend-driven by the existing `season_lifecycle_daily` `pg_cron` job (Plan 1 migration `20260607000008_cron_season_lifecycle.sql`). The mobile app **reads** seasons + tournament state and surfaces it, but never mutates lifecycle directly — admin actions go through the Edge Functions. Shared utilities (`getCurrentSeasonWindow`, `getFinalePoints`) live in `@tennis/shared/seasons/` so both Deno (Edge Functions) and React Native can import them. The bracket viewer is a pure component over the existing `tournament_matches` table — no new schema. The `advance-tournament-bracket` Edge Function is the only new server-side piece; it's invoked by `confirm-match` after a confirmed match whose `match_request_id` belongs to a `tournament_matches` row, and it populates the next-round slot. Season banner + ELO chart markers reuse the existing `react-native-svg` chart from Plan 5 — no new chart library.

**Tech Stack:** Deno 1.x + Supabase Edge Functions, Postgres 15 + `pg_cron`, TanStack Query v5, Expo Router 4, `react-native-svg` (already installed in Plan 5 Task 11), NativeWind 4, `@tennis/shared` (with new `seasons/` folder), `bun:test` for shared unit tests, `bun` for the backend E2E script runner.

**Spec reference:** `docs/superpowers/specs/2026-06-06-tennis-challenger-design.md`
- Section 2 — data model (`seasons`, `season_standings`, `tournaments`, `tournament_matches`, `yearly_championship`, `badges` seasonal subset)
- Section 5.1 — Takvim (akademik yıl bazlı)
- Section 5.2 — Sezon başında soft reset `(rating + 1200) / 2`
- Section 5.3 — Sezon Finali Turnuva (8/4 bracket seed)
- Section 5.4 — Sezon Finali puanları (Yıllık Şampiyonluk için)
- Section 5.5 — Geçen sezon şampiyonu vurgusu
- Section 5.6 — Yıllık Şampiyonluk (3 sezon toplam)
- Section 5.7 — ELO Geçmişi sayfası (sezon başlangıçları + soft reset kırılması)
- Section 6.1 — Rozet kataloğu (Sezon ve Yıllık bölümleri)
- Section 7.6 — Cron job listesi (`season_lifecycle_check` günlük 06:00 TR)

**Plan dependencies:**
- Plan 1 (migrations `20260606000006_seasons_tournaments.sql`, `20260607000008_cron_season_lifecycle.sql`)
- Plan 2 (Edge Functions `close-season`, `start-season-finale`, `calculate-yearly-championship` + deno tests)
- Plan 4b (`confirm-match` Edge Function — Plan 6 Task 4 hooks bracket advancement into the same path)
- Plan 5 (`useEloHistory` hook, `EloHistoryChart`, `EloHistoryTab`, `ProfileHeader`, seasonal badge codes in catalog migration `20260608000001_seed_badges.sql`)

**Plan 6 NOT in scope:**
- Admin UI for "withdraw player from bracket → replace with 9th seed" — Plan 7 (admin panel)
- Realtime subscription on bracket updates (poll/refocus only) — Plan 7
- Animations / confetti for season champion reveal — Plan 8
- Kategori değişim window UI (the data check is in `useUpcomingFinaleStatus`, but the actual category switcher lives in the Profili Düzenle screen — Plan 5) — already shipped, Plan 6 only consumes the window status
- Web admin dashboard for season management — Faz 2

**Known limitations (documented in code, fixed later):**
- The bracket viewer assumes 8-slot singles / 4-slot doubles; non-standard sizes are rendered as a flat list with a warning banner
- `useCurrentSeason` returns the **first** row with `status='active'` (or `status='finale'`); if more than one is ever active simultaneously this is a data error caught by a unique partial index added in Task 3
- Season banner "Top 8'desin / Top 8'e girmek için X puan lazım" computes the gap client-side from `useMyRankings` + the current 8th-seed ELO — this is approximate (doesn't account for finale window inactivity filtering by `last_match_at < now() - 90 days`)
- The Plan 5 ELO chart limit of 100 points is unchanged; season markers only render for boundaries that fall inside that window

---

## Dosya Yapısı

```
packages/
├── shared/
│   ├── src/
│   │   └── seasons/
│   │       ├── index.ts                        # NEW: barrel
│   │       ├── calendar.ts                     # NEW: getCurrentSeasonWindow + helpers
│   │       └── finale-points.ts                # NEW: getFinalePoints + table
│   ├── src/index.ts                            # MODIFY: re-export ./seasons/index
│   └── tests/
│       └── seasons/
│           ├── calendar.test.ts                # NEW
│           └── finale-points.test.ts           # NEW
└── supabase/
    ├── migrations/
    │   └── 20260609000001_seasons_unique_active.sql  # NEW: partial unique index on status
    ├── functions/
    │   ├── advance-tournament-bracket/
    │   │   └── index.ts                        # NEW: promotes confirmed bracket matches
    │   ├── close-season/index.ts               # AUDIT (no edit unless audit finds an issue)
    │   ├── start-season-finale/index.ts        # AUDIT (no edit unless audit finds an issue)
    │   ├── calculate-yearly-championship/index.ts # AUDIT (no edit unless audit finds an issue)
    │   └── confirm-match/index.ts              # MODIFY: call advance-tournament-bracket
    └── tests/
        ├── functions/
        │   └── advance-tournament-bracket.deno-test.ts  # NEW
        └── e2e/
            └── season-lifecycle.e2e.ts         # NEW: backend E2E script

apps/mobile/
├── app/
│   ├── (app)/
│   │   └── matches.tsx                         # MODIFY: mount SeasonBanner at top
│   ├── tournament/
│   │   ├── _layout.tsx                         # NEW: stack
│   │   └── [id].tsx                            # NEW: bracket viewer screen
│   └── yearly-championship/
│       ├── _layout.tsx                         # NEW: stack
│       └── [year].tsx                          # NEW: yearly standings screen
├── components/
│   ├── profile/
│   │   ├── EloHistoryChart.tsx                 # MODIFY: accept seasonBoundaries + softResetBreaks
│   │   ├── EloHistoryTab.tsx                   # MODIFY: pass new props through
│   │   └── ProfileHeader.tsx                   # MODIFY: render PastChampionPill
│   └── seasons/
│       ├── SeasonBanner.tsx                    # NEW: dashboard banner
│       ├── BracketView.tsx                     # NEW: 8/4-slot bracket UI
│       └── PastChampionPill.tsx                # NEW: 👑 highlight chip
├── hooks/
│   ├── use-current-season.ts                   # NEW
│   ├── use-upcoming-finale-status.ts           # NEW
│   ├── use-tournament-bracket.ts               # NEW
│   ├── use-yearly-standings.ts                 # NEW
│   ├── use-past-champion.ts                    # NEW
│   ├── use-elo-history.ts                      # MODIFY: return seasonBoundaries + softResetBreaks
│   └── use-confirm-match.ts                    # MODIFY: surface bracket-advance result on toast
└── lib/
    └── query-keys.ts                           # MODIFY: add seasons / tournaments / yearly keys
```

**Phase outline:**
- **Phase A — Backend audit + shared utilities (Tasks 1-2):** verify existing season Edge Functions + add `@tennis/shared/seasons`
- **Phase B — Bracket advancement (Tasks 3-4):** unique-active migration + `advance-tournament-bracket` Edge Function + `confirm-match` integration
- **Phase C — Mobile season state (Tasks 5-7):** `useCurrentSeason` + `useUpcomingFinaleStatus` + SeasonBanner on Maçlar tab
- **Phase D — ELO chart season markers (Tasks 8-9):** augment hook + render dashed markers + soft-reset break
- **Phase E — Tournament bracket UI (Tasks 10-12):** bracket query + bracket viewer screen + banner CTA wiring
- **Phase F — Yearly championship + past-champion highlight (Tasks 13-15):** yearly standings hook + screen + PastChampionPill
- **Phase G — Cron verification (Task 16):** confirm `pg_cron` job exists and triggers state transitions
- **Phase H — End-to-end backend script (Task 17):** seed → close-season → start-finale → assert ELO soft reset + seasonal badges awarded

---

## Phase A — Backend audit + shared utilities

### Task 1: Audit + verify existing season Edge Functions

This is a verification task. If the audit surfaces a real bug (wrong `score_details` shape, missing column, etc.) fix it in-place and re-run; otherwise commit an empty marker.

**Files (only modified if audit finds a defect):**
- `packages/supabase/functions/close-season/index.ts`
- `packages/supabase/functions/start-season-finale/index.ts`
- `packages/supabase/functions/calculate-yearly-championship/index.ts`

- [ ] **Step 1: Start the local Supabase stack with reset DB**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
supabase functions serve --no-verify-jwt &
sleep 5
```

- [ ] **Step 2: Read each function's source + test file and check the three audit criteria**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
ls functions/close-season functions/start-season-finale functions/calculate-yearly-championship
ls tests/functions/close-season.deno-test.ts tests/functions/start-season-finale.deno-test.ts tests/functions/calculate-yearly-championship.deno-test.ts
```

Audit checklist for each function:

1. Uses `_shared/auth-guard.ts` `requireAdmin` and catches `AuthError`
2. Uses `_shared/errors.ts` `errorResponse` / `jsonResponse` / `internalError`
3. Reads `score_details` (if at all) as a wrapped object `{ sets?, els?, games?, ... }` — NOT as a bare array. Plan 6 functions don't touch `score_details` directly, so this is only a smoke check.
4. Soft reset uses `Math.round((rating + 1200) / 2)` exactly per spec 5.2

If all four pass, no source edit is needed.

- [ ] **Step 3: Run the three deno tests**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
ANON_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['ANON_KEY'])")
SERVICE_ROLE_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")
SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
  deno test --allow-env --allow-net tests/functions/close-season.deno-test.ts
SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
  deno test --allow-env --allow-net tests/functions/start-season-finale.deno-test.ts
SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
  deno test --allow-env --allow-net tests/functions/calculate-yearly-championship.deno-test.ts
```

Expected: all three test files exit 0.

If a test fails because of a real defect, fix the source file in `functions/<name>/index.ts` and re-run. Common defects to watch for:
- A leftover `match.score_details as Array<...>` cast (must be wrapped object access — see `award-badges` for the canonical fix)
- A `requireAuth` call where it should be `requireAdmin`
- Forgetting to gate the close-season idempotency check (`season.status === 'closed'` → 409)

- [ ] **Step 4: Stop the local stack**

```bash
pkill -f "supabase functions serve" || true
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase stop
```

- [ ] **Step 5: Commit (use `--allow-empty` if no source files changed)**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/functions/close-season packages/supabase/functions/start-season-finale packages/supabase/functions/calculate-yearly-championship 2>/dev/null || true
git commit --allow-empty -m "chore(supabase): audit close-season + start-season-finale + calculate-yearly-championship Edge Functions"
```

---

### Task 2: Shared `seasons` utility in `@tennis/shared`

**Files:**
- Create: `packages/shared/src/seasons/calendar.ts`
- Create: `packages/shared/src/seasons/finale-points.ts`
- Create: `packages/shared/src/seasons/index.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/tests/seasons/calendar.test.ts`
- Create: `packages/shared/tests/seasons/finale-points.test.ts`

- [ ] **Step 1: Create `seasons/calendar.ts`**

The academic-year calendar from spec 5.1 has three windows. **Güz** runs 1 Eylül – 15 Ocak (note: spans the new year), **Bahar** 26 Ocak – 20 Haziran, **Yaz** 1 Temmuz – 20 Ağustos. The finale window is the last 10 days of each. Months are 0-indexed in JS Date math.

```typescript
export type SeasonName = 'guz' | 'bahar' | 'yaz';

export interface SeasonWindow {
  name: SeasonName;
  year: number;
  starts_at: string;
  ends_at: string;
  finale_starts_at: string;
  finale_ends_at: string;
}

function iso(year: number, monthZeroBased: number, day: number, endOfDay = false): string {
  const h = endOfDay ? 23 : 0;
  const m = endOfDay ? 59 : 0;
  const s = endOfDay ? 59 : 0;
  const d = new Date(Date.UTC(year, monthZeroBased, day, h, m, s));
  return d.toISOString();
}

export function buildSeasonWindow(name: SeasonName, year: number): SeasonWindow {
  if (name === 'guz') {
    return {
      name: 'guz',
      year,
      starts_at: iso(year, 8, 1),
      ends_at: iso(year + 1, 0, 25, true),
      finale_starts_at: iso(year + 1, 0, 16),
      finale_ends_at: iso(year + 1, 0, 25, true),
    };
  }
  if (name === 'bahar') {
    return {
      name: 'bahar',
      year,
      starts_at: iso(year, 0, 26),
      ends_at: iso(year, 5, 30, true),
      finale_starts_at: iso(year, 5, 21),
      finale_ends_at: iso(year, 5, 30, true),
    };
  }
  return {
    name: 'yaz',
    year,
    starts_at: iso(year, 6, 1),
    ends_at: iso(year, 7, 31, true),
    finale_starts_at: iso(year, 7, 21),
    finale_ends_at: iso(year, 7, 31, true),
  };
}

export function getCurrentSeasonWindow(at: Date = new Date()): SeasonWindow {
  const t = at.getTime();
  const year = at.getUTCFullYear();
  const month = at.getUTCMonth();
  const day = at.getUTCDate();

  if (month === 0 && day <= 25) {
    const guzWindow = buildSeasonWindow('guz', year - 1);
    if (t <= Date.parse(guzWindow.ends_at)) return guzWindow;
  }
  if (month >= 8 || (month === 0 && day <= 25)) {
    const guzYear = month >= 8 ? year : year - 1;
    return buildSeasonWindow('guz', guzYear);
  }
  if (month === 0 || month === 1 || month === 2 || month === 3 || month === 4 || month === 5) {
    return buildSeasonWindow('bahar', year);
  }
  return buildSeasonWindow('yaz', year);
}

export function isInFinaleWindow(window: SeasonWindow, at: Date = new Date()): boolean {
  const t = at.getTime();
  return t >= Date.parse(window.finale_starts_at) && t <= Date.parse(window.finale_ends_at);
}
```

- [ ] **Step 2: Create `seasons/finale-points.ts`**

```typescript
export type FinalePlacement = 'champion' | 'finalist' | 'semifinalist' | 'qf';

export const FINALE_POINTS: Record<FinalePlacement, number> = {
  champion: 100,
  finalist: 70,
  semifinalist: 50,
  qf: 25,
};

export function getFinalePoints(placement: FinalePlacement): number {
  return FINALE_POINTS[placement];
}

export function placementFromRank(rank: number): FinalePlacement | null {
  if (rank === 1) return 'champion';
  if (rank === 2) return 'finalist';
  if (rank === 3 || rank === 4) return 'semifinalist';
  if (rank >= 5 && rank <= 8) return 'qf';
  return null;
}
```

- [ ] **Step 3: Create `seasons/index.ts` barrel**

```typescript
export * from './calendar';
export * from './finale-points';
```

- [ ] **Step 4: Re-export from package root**

Edit `packages/shared/src/index.ts`. Replace its full contents with:

```typescript
export * from './types/index';
export * from './elo/index';
export * from './schemas/index';
export * from './badges/index';
export * from './seasons/index';
```

- [ ] **Step 5: Create `tests/seasons/calendar.test.ts`**

```typescript
import { describe, expect, test } from 'bun:test';
import {
  buildSeasonWindow,
  getCurrentSeasonWindow,
  isInFinaleWindow,
} from '../../src/seasons/calendar';

describe('buildSeasonWindow', () => {
  test('guz 2026 spans Sept 2026 → Jan 2027', () => {
    const w = buildSeasonWindow('guz', 2026);
    expect(w.starts_at.startsWith('2026-09-01')).toBe(true);
    expect(w.ends_at.startsWith('2027-01-25')).toBe(true);
    expect(w.finale_starts_at.startsWith('2027-01-16')).toBe(true);
    expect(w.finale_ends_at.startsWith('2027-01-25')).toBe(true);
  });

  test('bahar 2026 spans 26 Jan → 30 June 2026', () => {
    const w = buildSeasonWindow('bahar', 2026);
    expect(w.starts_at.startsWith('2026-01-26')).toBe(true);
    expect(w.ends_at.startsWith('2026-06-30')).toBe(true);
    expect(w.finale_starts_at.startsWith('2026-06-21')).toBe(true);
  });

  test('yaz 2026 spans 1 July → 31 Aug 2026', () => {
    const w = buildSeasonWindow('yaz', 2026);
    expect(w.starts_at.startsWith('2026-07-01')).toBe(true);
    expect(w.ends_at.startsWith('2026-08-31')).toBe(true);
    expect(w.finale_starts_at.startsWith('2026-08-21')).toBe(true);
  });
});

describe('getCurrentSeasonWindow', () => {
  test('15 March 2026 → bahar 2026', () => {
    const w = getCurrentSeasonWindow(new Date('2026-03-15T12:00:00Z'));
    expect(w.name).toBe('bahar');
    expect(w.year).toBe(2026);
  });

  test('1 September 2026 → guz 2026', () => {
    const w = getCurrentSeasonWindow(new Date('2026-09-01T12:00:00Z'));
    expect(w.name).toBe('guz');
    expect(w.year).toBe(2026);
  });

  test('10 January 2027 → guz 2026 (finale window extension)', () => {
    const w = getCurrentSeasonWindow(new Date('2027-01-10T12:00:00Z'));
    expect(w.name).toBe('guz');
    expect(w.year).toBe(2026);
  });

  test('5 July 2026 → yaz 2026', () => {
    const w = getCurrentSeasonWindow(new Date('2026-07-05T12:00:00Z'));
    expect(w.name).toBe('yaz');
    expect(w.year).toBe(2026);
  });
});

describe('isInFinaleWindow', () => {
  test('22 June 2026 is inside bahar 2026 finale', () => {
    const w = buildSeasonWindow('bahar', 2026);
    expect(isInFinaleWindow(w, new Date('2026-06-22T12:00:00Z'))).toBe(true);
  });

  test('1 March 2026 is NOT inside bahar 2026 finale', () => {
    const w = buildSeasonWindow('bahar', 2026);
    expect(isInFinaleWindow(w, new Date('2026-03-01T12:00:00Z'))).toBe(false);
  });
});
```

- [ ] **Step 6: Create `tests/seasons/finale-points.test.ts`**

```typescript
import { describe, expect, test } from 'bun:test';
import { getFinalePoints, placementFromRank } from '../../src/seasons/finale-points';

describe('getFinalePoints', () => {
  test('champion = 100', () => {
    expect(getFinalePoints('champion')).toBe(100);
  });
  test('finalist = 70', () => {
    expect(getFinalePoints('finalist')).toBe(70);
  });
  test('semifinalist = 50', () => {
    expect(getFinalePoints('semifinalist')).toBe(50);
  });
  test('qf = 25', () => {
    expect(getFinalePoints('qf')).toBe(25);
  });
});

describe('placementFromRank', () => {
  test('rank 1 → champion', () => {
    expect(placementFromRank(1)).toBe('champion');
  });
  test('rank 2 → finalist', () => {
    expect(placementFromRank(2)).toBe('finalist');
  });
  test('rank 3 and 4 → semifinalist', () => {
    expect(placementFromRank(3)).toBe('semifinalist');
    expect(placementFromRank(4)).toBe('semifinalist');
  });
  test('rank 5..8 → qf', () => {
    expect(placementFromRank(5)).toBe('qf');
    expect(placementFromRank(8)).toBe('qf');
  });
  test('rank 9+ → null', () => {
    expect(placementFromRank(9)).toBeNull();
    expect(placementFromRank(99)).toBeNull();
  });
});
```

- [ ] **Step 7: Run tests**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/shared
bun test tests/seasons/
```

Expected: all 17 tests pass.

- [ ] **Step 8: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/shared/src/seasons packages/shared/src/index.ts packages/shared/tests/seasons
git commit -m "feat(shared): add season calendar + finale point utilities"
```

---

## Phase B — Bracket advancement

### Task 3: Migration — partial unique index for active season

**Files:**
- Create: `packages/supabase/migrations/20260609000001_seasons_unique_active.sql`

- [ ] **Step 1: Write the migration**

The `seasons` table already has `unique(name, year)` from Plan 1, but nothing prevents two rows from having `status='active'` simultaneously (e.g., a bad cron transition). Add a partial unique index so `useCurrentSeason` can rely on at most one active row.

```sql
create unique index if not exists seasons_one_active_idx
  on public.seasons ((1))
  where status in ('active', 'finale');
```

- [ ] **Step 2: Apply + verify**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select indexname, indexdef from pg_indexes where tablename = 'seasons' and indexname = 'seasons_one_active_idx';"
```

Expected: 1 row showing the partial index.

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/migrations/20260609000001_seasons_unique_active.sql
git commit -m "feat(supabase): partial unique index for single active/finale season"
```

---

### Task 4: `advance-tournament-bracket` Edge Function + `confirm-match` integration

**Files:**
- Create: `packages/supabase/functions/advance-tournament-bracket/index.ts`
- Create: `packages/supabase/tests/functions/advance-tournament-bracket.deno-test.ts`
- Modify: `packages/supabase/functions/confirm-match/index.ts`

- [ ] **Step 1: Create `advance-tournament-bracket/index.ts`**

After `confirm-match` flips a `tournament_matches.match_id` match to `confirmed`, this function looks up the tournament match's `(round, bracket_position)` and, if there's a parent slot, writes the winner's seed into the parent. Round 1 (QF, 4 matches) feeds round 2 (SF, 2 matches): bracket positions 1+2 → round-2 position 1, positions 3+4 → round-2 position 2. Round 2 feeds round 3 (F, 1 match) at bracket_position 1.

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const inputSchema = z.object({ matchId: z.string().uuid() });

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: match } = await supa
      .from('matches')
      .select('id, status, winner_team, team_a_player_ids, team_b_player_ids')
      .eq('id', parsed.data.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);
    if (match.status !== 'confirmed' || match.winner_team === 'void' || !match.winner_team) {
      return jsonResponse({ advanced: false, reason: 'match not in confirmable state' });
    }

    const { data: tm } = await supa
      .from('tournament_matches')
      .select('id, tournament_id, round, bracket_position, seed_a, seed_b')
      .eq('match_id', match.id)
      .maybeSingle();
    if (!tm) return jsonResponse({ advanced: false, reason: 'not a tournament match' });

    if (tm.round >= 3) {
      const { data: tournament } = await supa
        .from('tournaments')
        .select('id, status')
        .eq('id', tm.tournament_id)
        .single();
      if (tournament && tournament.status !== 'completed') {
        await supa.from('tournaments').update({ status: 'completed' }).eq('id', tournament.id);
      }
      return jsonResponse({ advanced: false, reason: 'final completed', tournamentCompleted: true });
    }

    const winnerSeed = match.winner_team === 'a' ? tm.seed_a : tm.seed_b;
    const nextRound = tm.round + 1;
    const nextPosition = Math.ceil(tm.bracket_position / 2);
    const isAOfNext = tm.bracket_position % 2 === 1;

    const { data: parent } = await supa
      .from('tournament_matches')
      .select('id, seed_a, seed_b')
      .eq('tournament_id', tm.tournament_id)
      .eq('round', nextRound)
      .eq('bracket_position', nextPosition)
      .maybeSingle();

    if (parent) {
      const patch = isAOfNext ? { seed_a: winnerSeed } : { seed_b: winnerSeed };
      await supa.from('tournament_matches').update(patch).eq('id', parent.id);
      return jsonResponse({
        advanced: true,
        parentMatchId: parent.id,
        side: isAOfNext ? 'a' : 'b',
        seed: winnerSeed,
      });
    }

    await supa.from('tournament_matches').insert({
      tournament_id: tm.tournament_id,
      round: nextRound,
      bracket_position: nextPosition,
      seed_a: isAOfNext ? winnerSeed : null,
      seed_b: isAOfNext ? null : winnerSeed,
    });

    if (nextRound === 2) {
      await supa.from('tournaments').update({ status: 'in_progress' }).eq('id', tm.tournament_id);
    }

    return jsonResponse({
      advanced: true,
      parentMatchId: null,
      side: isAOfNext ? 'a' : 'b',
      seed: winnerSeed,
    });
  } catch (err) {
    return internalError(err);
  }
});
```

- [ ] **Step 2: Create the deno test**

```typescript
import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('advance-tournament-bracket: writes winner seed into parent slot', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();

  const { data: season } = await supa.from('seasons').insert({
    name: 'guz', year: 2026,
    starts_at: '2026-09-01', ends_at: '2027-01-25',
    finale_starts_at: '2027-01-16', finale_ends_at: '2027-01-25',
    status: 'finale',
  }).select('id').single();

  const { data: tournament } = await supa.from('tournaments').insert({
    season_id: season!.id,
    category: 'erkek_tek',
    bracket_size: 8,
    status: 'seeded',
  }).select('id').single();

  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { data: req } = await supa.from('match_requests').insert({
    creator_id: alice.userId,
    type: 'direct_challenge',
    target_id: bob.userId,
    category: 'erkek_tek',
    format: 'bu_klasik',
    is_rated: true,
    proposed_date: '2027-01-20',
    proposed_time: '18:00',
    court_id: court!.id,
    status: 'accepted',
    expires_at: '2027-01-21',
  }).select('id').single();

  const { data: m } = await supa.from('matches').insert({
    match_request_id: req!.id,
    category: 'erkek_tek',
    format: 'bu_klasik',
    court_id: court!.id,
    played_at: '2027-01-20T18:00:00Z',
    is_rated: true,
    team_a_player_ids: [alice.userId],
    team_b_player_ids: [bob.userId],
    score_team_a: 4,
    score_team_b: 0,
    winner_team: 'a',
    status: 'confirmed',
    confirmed_by: [alice.userId, bob.userId],
    confirmed_at: '2027-01-20T19:30:00Z',
  }).select('id').single();

  await supa.from('tournament_matches').insert({
    tournament_id: tournament!.id,
    round: 1,
    bracket_position: 1,
    match_id: m!.id,
    seed_a: 1,
    seed_b: 8,
  });

  const { status, body } = await invokeFunction('advance-tournament-bracket', { matchId: m!.id });
  assertEquals(status, 200);
  assertEquals((body as { advanced: boolean }).advanced, true);

  const { data: parent } = await supa
    .from('tournament_matches')
    .select('seed_a')
    .eq('tournament_id', tournament!.id)
    .eq('round', 2)
    .eq('bracket_position', 1)
    .single();
  assertEquals(parent!.seed_a, 1);
});

Deno.test('advance-tournament-bracket: ignores non-tournament match', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { data: req } = await supa.from('match_requests').insert({
    creator_id: alice.userId,
    type: 'direct_challenge',
    target_id: bob.userId,
    category: 'erkek_tek',
    format: 'bu_klasik',
    is_rated: true,
    proposed_date: '2026-10-01',
    proposed_time: '18:00',
    court_id: court!.id,
    status: 'accepted',
    expires_at: '2026-10-02',
  }).select('id').single();
  const { data: m } = await supa.from('matches').insert({
    match_request_id: req!.id,
    category: 'erkek_tek',
    format: 'bu_klasik',
    court_id: court!.id,
    played_at: '2026-10-01T18:00:00Z',
    is_rated: true,
    team_a_player_ids: [alice.userId],
    team_b_player_ids: [bob.userId],
    score_team_a: 4,
    score_team_b: 1,
    winner_team: 'a',
    status: 'confirmed',
    confirmed_by: [alice.userId, bob.userId],
  }).select('id').single();

  const { status, body } = await invokeFunction('advance-tournament-bracket', { matchId: m!.id });
  assertEquals(status, 200);
  assertEquals((body as { advanced: boolean }).advanced, false);
});
```

Save as `packages/supabase/tests/functions/advance-tournament-bracket.deno-test.ts`.

- [ ] **Step 3: Modify `confirm-match` to call `advance-tournament-bracket` after `award-badges`**

Open `packages/supabase/functions/confirm-match/index.ts`. Locate the block that runs when `newStatus === 'confirmed'`:

```typescript
    let awarded: AwardedPerUser[] = [];
    if (newStatus === 'confirmed') {
      await applyEloForMatch(supa, {
```

Inside that `if (newStatus === 'confirmed')` block, right after the existing `awarded = await invokeAwardBadges(match.id);` line, append:

```typescript
      await invokeAdvanceBracket(match.id);
```

Then add the helper next to `invokeAwardBadges` (anywhere in the file's bottom section):

```typescript
async function invokeAdvanceBracket(matchId: string): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return;
  try {
    const res = await fetch(`${url}/functions/v1/advance-tournament-bracket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ matchId }),
    });
    if (!res.ok) {
      console.error('advance-tournament-bracket failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('advance-tournament-bracket threw', err);
  }
}
```

- [ ] **Step 4: Run the new test**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
supabase functions serve --no-verify-jwt &
sleep 5
ANON_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['ANON_KEY'])")
SERVICE_ROLE_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")
SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
  deno test --allow-env --allow-net tests/functions/advance-tournament-bracket.deno-test.ts
pkill -f "supabase functions serve" || true
supabase stop
```

Expected: 2/2 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/functions/advance-tournament-bracket \
  packages/supabase/functions/confirm-match/index.ts \
  packages/supabase/tests/functions/advance-tournament-bracket.deno-test.ts
git commit -m "feat(supabase): add advance-tournament-bracket Edge Function + confirm-match wiring"
```

---

## Phase C — Mobile season state

### Task 5: `useCurrentSeason` hook + query keys

**Files:**
- Modify: `apps/mobile/lib/query-keys.ts`
- Create: `apps/mobile/hooks/use-current-season.ts`

- [ ] **Step 1: Extend query keys**

Open `apps/mobile/lib/query-keys.ts` and add the three new groups before the trailing `courts:` line. Replace the file with:

```typescript
export const queryKeys = {
  matchRequests: {
    all: ['match-requests'] as const,
    incoming: () => [...queryKeys.matchRequests.all, 'incoming'] as const,
    outgoing: () => [...queryKeys.matchRequests.all, 'outgoing'] as const,
    detail: (id: string) => [...queryKeys.matchRequests.all, 'detail', id] as const,
  },
  openCalls: {
    all: ['open-calls'] as const,
    feed: () => [...queryKeys.openCalls.all, 'feed'] as const,
    detail: (id: string) => [...queryKeys.openCalls.all, 'detail', id] as const,
  },
  applications: {
    all: ['applications'] as const,
    forRequest: (requestId: string) => [...queryKeys.applications.all, 'request', requestId] as const,
    mine: () => [...queryKeys.applications.all, 'mine'] as const,
  },
  activeMatches: {
    all: ['active-matches'] as const,
    list: () => [...queryKeys.activeMatches.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.activeMatches.all, 'detail', id] as const,
  },
  matchHistory: {
    all: ['match-history'] as const,
    mine: () => [...queryKeys.matchHistory.all, 'mine'] as const,
    forUser: (userId: string) => [...queryKeys.matchHistory.all, 'user', userId] as const,
  },
  badges: {
    all: ['badges'] as const,
    catalog: () => [...queryKeys.badges.all, 'catalog'] as const,
    mine: () => [...queryKeys.badges.all, 'mine'] as const,
    forUser: (userId: string) => [...queryKeys.badges.all, 'user', userId] as const,
  },
  rankings: {
    all: ['rankings'] as const,
    mine: () => [...queryKeys.rankings.all, 'mine'] as const,
    forUser: (userId: string) => [...queryKeys.rankings.all, 'user', userId] as const,
  },
  stats: {
    all: ['stats'] as const,
    mine: () => [...queryKeys.stats.all, 'mine'] as const,
    forUser: (userId: string) => [...queryKeys.stats.all, 'user', userId] as const,
  },
  eloHistory: {
    all: ['elo-history'] as const,
    mine: () => [...queryKeys.eloHistory.all, 'mine'] as const,
    forUser: (userId: string) => [...queryKeys.eloHistory.all, 'user', userId] as const,
  },
  headToHead: {
    all: ['head-to-head'] as const,
    between: (otherUserId: string) => [...queryKeys.headToHead.all, 'pair', otherUserId] as const,
  },
  players: {
    all: ['players'] as const,
    list: (filters?: { gender?: string }) => [...queryKeys.players.all, 'list', filters] as const,
    detail: (userId: string) => [...queryKeys.players.all, 'detail', userId] as const,
  },
  seasons: {
    all: ['seasons'] as const,
    current: () => [...queryKeys.seasons.all, 'current'] as const,
    boundaries: () => [...queryKeys.seasons.all, 'boundaries'] as const,
    finaleStatus: () => [...queryKeys.seasons.all, 'finale-status'] as const,
  },
  tournaments: {
    all: ['tournaments'] as const,
    bracket: (tournamentId: string) =>
      [...queryKeys.tournaments.all, 'bracket', tournamentId] as const,
    bySeason: (seasonId: string) =>
      [...queryKeys.tournaments.all, 'by-season', seasonId] as const,
  },
  yearly: {
    all: ['yearly'] as const,
    standings: (year: number) => [...queryKeys.yearly.all, 'standings', year] as const,
    pastChampion: (userId: string) =>
      [...queryKeys.yearly.all, 'past-champion', userId] as const,
  },
  courts: ['courts'] as const,
  departments: ['departments'] as const,
  profile: (userId: string) => ['profile', userId] as const,
} as const;
```

- [ ] **Step 2: Create `use-current-season.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export type SeasonStatus = 'upcoming' | 'active' | 'finale' | 'closed';
export type SeasonName = 'guz' | 'bahar' | 'yaz';

export interface CurrentSeason {
  id: string;
  name: SeasonName;
  year: number;
  starts_at: string;
  ends_at: string;
  finale_starts_at: string;
  finale_ends_at: string;
  status: SeasonStatus;
}

export function useCurrentSeason() {
  return useQuery<CurrentSeason | null>({
    queryKey: queryKeys.seasons.current(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, year, starts_at, ends_at, finale_starts_at, finale_ends_at, status')
        .in('status', ['active', 'finale'])
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CurrentSeason | null;
    },
    staleTime: 1000 * 60 * 60,
  });
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/lib/query-keys.ts apps/mobile/hooks/use-current-season.ts
git commit -m "feat(mobile): add useCurrentSeason hook + seasons/tournaments/yearly query keys"
```

---

### Task 6: `useUpcomingFinaleStatus` hook

**Files:**
- Create: `apps/mobile/hooks/use-upcoming-finale-status.ts`

- [ ] **Step 1: Create the hook**

The hook returns a derived enum from `useCurrentSeason` plus a tournament-existence check. It is used by the SeasonBanner to pick its variant.

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useCurrentSeason } from './use-current-season';

export type FinaleStatus =
  | 'inactive'
  | 'announced'
  | 'qualifying'
  | 'finale_in_progress'
  | 'finale_complete';

const ANNOUNCE_WINDOW_DAYS = 21;

export function useUpcomingFinaleStatus() {
  const seasonQ = useCurrentSeason();
  const seasonId = seasonQ.data?.id;

  return useQuery<FinaleStatus>({
    queryKey: queryKeys.seasons.finaleStatus(),
    enabled: !!seasonId,
    queryFn: async () => {
      if (!seasonQ.data) return 'inactive';
      const s = seasonQ.data;
      const now = Date.now();
      const finaleStart = Date.parse(s.finale_starts_at);
      const finaleEnd = Date.parse(s.finale_ends_at);

      if (s.status === 'closed') return 'finale_complete';

      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, status')
        .eq('season_id', s.id);
      const list = tournaments ?? [];
      const hasAny = list.length > 0;
      const allCompleted = hasAny && list.every((t) => t.status === 'completed');

      if (s.status === 'finale' && allCompleted) return 'finale_complete';
      if (s.status === 'finale' && hasAny) return 'finale_in_progress';

      if (now >= finaleStart && now <= finaleEnd) return 'qualifying';

      const announceFrom = finaleStart - ANNOUNCE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      if (now >= announceFrom && now < finaleStart) return 'announced';
      return 'inactive';
    },
    staleTime: 1000 * 60 * 15,
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-upcoming-finale-status.ts
git commit -m "feat(mobile): add useUpcomingFinaleStatus hook (inactive/announced/qualifying/in-progress/complete)"
```

---

### Task 7: SeasonBanner on Maçlar tab

**Files:**
- Create: `apps/mobile/components/seasons/SeasonBanner.tsx`
- Modify: `apps/mobile/app/(app)/matches.tsx`

- [ ] **Step 1: Create `SeasonBanner.tsx`**

The banner has 5 variants matched to `FinaleStatus`. The `inactive` variant returns null (no banner shown). When `finale_in_progress`, the CTA navigates to the user's category bracket if exactly one tournament is in progress for one of their categories; otherwise to a season-overview prompt that lists all tournaments (we keep it simple here — the CTA navigates to the first in-progress tournament).

```typescript
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import { useCurrentSeason } from '../../hooks/use-current-season';
import { useUpcomingFinaleStatus } from '../../hooks/use-upcoming-finale-status';
import { useMyRankings } from '../../hooks/use-my-rankings';

const SEASON_LABEL: Record<string, string> = {
  guz: 'Güz',
  bahar: 'Bahar',
  yaz: 'Yaz',
};

export function SeasonBanner() {
  const season = useCurrentSeason();
  const finaleStatus = useUpcomingFinaleStatus();
  const rankings = useMyRankings();
  const [firstTournamentId, setFirstTournamentId] = useState<string | null>(null);

  useEffect(() => {
    if (!season.data) return;
    if (finaleStatus.data !== 'finale_in_progress') return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('tournaments')
        .select('id')
        .eq('season_id', season.data!.id)
        .in('status', ['seeded', 'in_progress'])
        .limit(1)
        .maybeSingle();
      if (!cancelled) setFirstTournamentId(data?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [season.data, finaleStatus.data]);

  if (!season.data) return null;
  const status = finaleStatus.data;
  if (!status || status === 'inactive') return null;

  const label = `${SEASON_LABEL[season.data.name] ?? season.data.name} ${season.data.year}`;
  const top8 = computeTop8Status(rankings.data ?? []);

  if (status === 'announced') {
    return (
      <BannerShell>
        <Text className="text-sm font-semibold text-amber-900">
          🏆 {label} Finali yaklaşıyor
        </Text>
        <Text className="mt-1 text-xs text-amber-800">
          {top8.summary}
        </Text>
      </BannerShell>
    );
  }

  if (status === 'qualifying') {
    return (
      <BannerShell>
        <Text className="text-sm font-semibold text-amber-900">
          🎯 {label} Finali sıralama penceresi
        </Text>
        <Text className="mt-1 text-xs text-amber-800">
          Son maçların Top 8 koltuğunu belirleyebilir.
        </Text>
      </BannerShell>
    );
  }

  if (status === 'finale_in_progress') {
    return (
      <BannerShell
        onPress={firstTournamentId ? () => router.push(`/tournament/${firstTournamentId}`) : undefined}
      >
        <Text className="text-sm font-semibold text-amber-900">
          🏆 {label} Finali devam ediyor
        </Text>
        <Text className="mt-1 text-xs text-amber-800">
          {firstTournamentId ? 'Bracket''i görüntülemek için dokun' : 'Bracket hazırlanıyor...'}
        </Text>
      </BannerShell>
    );
  }

  return (
    <BannerShell>
      <Text className="text-sm font-semibold text-amber-900">
        ✅ {label} Finali tamamlandı
      </Text>
      <Text className="mt-1 text-xs text-amber-800">
        Şampiyonlar profilde rozet aldı.
      </Text>
    </BannerShell>
  );
}

function BannerShell({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const inner = (
    <View className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3">{children}</View>
  );
  if (!onPress) return inner;
  return <Pressable onPress={onPress}>{inner}</Pressable>;
}

function computeTop8Status(
  rankings: { category: string; rating: number; rank: number }[],
): { summary: string } {
  if (rankings.length === 0) {
    return { summary: 'Sıralama almak için sıralama maçı oyna.' };
  }
  const best = rankings.reduce((acc, r) => (r.rank < acc.rank ? r : acc));
  if (best.rank <= 8) {
    return { summary: `Top 8'desin — ${best.category} #${best.rank}` };
  }
  return { summary: `En iyi sıran: ${best.category} #${best.rank}. Top 8 hedefini kovala.` };
}
```

- [ ] **Step 2: Mount the banner on the Maçlar screen**

Open `apps/mobile/app/(app)/matches.tsx`. Add the import line near the top (right next to other component imports):

```typescript
import { SeasonBanner } from '../../components/seasons/SeasonBanner';
```

Then, inside the returned `<ScreenContainer>` JSX, insert `<SeasonBanner />` as the **first** child — right above the `<View className="mb-3 flex-row border-b border-gray-200">` tabs row.

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/components/seasons/SeasonBanner.tsx apps/mobile/app/\(app\)/matches.tsx
git commit -m "feat(mobile): add SeasonBanner on Maçlar tab with 5 finale-status variants"
```

---

## Phase D — ELO chart season markers + soft-reset break

### Task 8: Augment `useEloHistory` with season boundaries

**Files:**
- Modify: `apps/mobile/hooks/use-elo-history.ts`

The chart needs (1) season boundary timestamps (vertical dashed lines + "Bahar 2026 başladı" label) and (2) soft-reset breaks (each season-start point is marked as a visual break between the previous-season tail and the new-season head). We keep `EloHistoryByCategory` backward compatible — the new shape is wrapped in a sibling field on the returned object.

- [ ] **Step 1: Replace the file**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface EloPoint {
  matchId: string;
  played_at: string;
  elo: number;
  eloBefore: number;
}

export interface SeasonBoundary {
  timestamp: string;
  label: string;
}

export interface EloHistoryResult {
  byCategory: Record<string, EloPoint[]>;
  seasonBoundaries: SeasonBoundary[];
}

interface MatchRow {
  id: string;
  category: string;
  played_at: string;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  rating_before_team_a: number | null;
  rating_after_team_a: number | null;
  rating_before_team_b: number | null;
  rating_after_team_b: number | null;
}

interface SeasonRow {
  name: string;
  year: number;
  starts_at: string;
}

const SEASON_LABEL: Record<string, string> = {
  guz: 'Güz',
  bahar: 'Bahar',
  yaz: 'Yaz',
};

export function useEloHistory(userId: string | undefined) {
  return useQuery<EloHistoryResult>({
    queryKey: userId ? queryKeys.eloHistory.forUser(userId) : queryKeys.eloHistory.all,
    queryFn: async () => {
      if (!userId) return { byCategory: {}, seasonBoundaries: [] };
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, category, played_at,
          team_a_player_ids, team_b_player_ids,
          rating_before_team_a, rating_after_team_a,
          rating_before_team_b, rating_after_team_b
        `)
        .eq('status', 'confirmed')
        .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`)
        .not('rating_after_team_a', 'is', null)
        .not('rating_after_team_b', 'is', null)
        .order('played_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(100);
      if (error) throw error;

      const rows = (((data ?? []) as unknown) as MatchRow[]).slice().reverse();

      const byCategory: Record<string, EloPoint[]> = {};
      for (const m of rows) {
        const onA = m.team_a_player_ids.includes(userId);
        const eloAfter = onA ? m.rating_after_team_a : m.rating_after_team_b;
        const eloBefore = onA ? m.rating_before_team_a : m.rating_before_team_b;
        if (eloAfter === null || eloBefore === null) continue;
        const list = byCategory[m.category] ?? [];
        list.push({ matchId: m.id, played_at: m.played_at, elo: eloAfter, eloBefore });
        byCategory[m.category] = list;
      }

      let seasonBoundaries: SeasonBoundary[] = [];
      if (rows.length > 0) {
        const earliest = rows[0].played_at;
        const { data: seasons } = await supabase
          .from('seasons')
          .select('name, year, starts_at')
          .gte('starts_at', earliest)
          .order('starts_at', { ascending: true });
        seasonBoundaries = ((seasons ?? []) as SeasonRow[]).map((s) => ({
          timestamp: s.starts_at,
          label: `${SEASON_LABEL[s.name] ?? s.name} ${s.year} başladı`,
        }));
      }

      return { byCategory, seasonBoundaries };
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-elo-history.ts
git commit -m "feat(mobile): extend useEloHistory with seasonBoundaries timestamps"
```

---

### Task 9: Render season markers + soft-reset break on `EloHistoryChart`

**Files:**
- Modify: `apps/mobile/components/profile/EloHistoryChart.tsx`
- Modify: `apps/mobile/components/profile/EloHistoryTab.tsx`

- [ ] **Step 1: Update `EloHistoryChart.tsx` to accept and draw `seasonBoundaries`**

```typescript
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

export interface ChartPoint {
  matchId: string;
  played_at: string;
  elo: number;
}

export interface ChartSeasonBoundary {
  timestamp: string;
  label: string;
}

interface Props {
  points: ChartPoint[];
  seasonBoundaries?: ChartSeasonBoundary[];
  width?: number;
  height?: number;
  onPointPress?: (matchId: string) => void;
}

export function EloHistoryChart({
  points,
  seasonBoundaries = [],
  width = 320,
  height = 200,
  onPointPress,
}: Props) {
  if (points.length === 0) return null;

  const padLeft = 36;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 24;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const elos = points.map((p) => p.elo);
  const minElo = Math.min(...elos);
  const maxElo = Math.max(...elos);
  const range = Math.max(maxElo - minElo, 1);

  const xs = points.map((_, i) =>
    points.length === 1 ? padLeft + innerW / 2 : padLeft + (i / (points.length - 1)) * innerW,
  );
  const ys = points.map((p) => padTop + (1 - (p.elo - minElo) / range) * innerH);

  const firstT = Date.parse(points[0].played_at);
  const lastT = Date.parse(points[points.length - 1].played_at);
  const tRange = Math.max(lastT - firstT, 1);

  const breakIndexes = new Set<number>();
  for (const b of seasonBoundaries) {
    const tb = Date.parse(b.timestamp);
    for (let i = 0; i < points.length - 1; i++) {
      const ti = Date.parse(points[i].played_at);
      const tj = Date.parse(points[i + 1].played_at);
      if (tb > ti && tb <= tj) breakIndexes.add(i);
    }
  }

  const segments: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < points.length; i++) {
    current.push(`${xs[i]},${ys[i]}`);
    if (breakIndexes.has(i)) {
      segments.push(current.join(' '));
      current = [];
    }
  }
  if (current.length > 0) segments.push(current.join(' '));

  const visibleBoundaries = seasonBoundaries.filter((b) => {
    const tb = Date.parse(b.timestamp);
    return tb >= firstT && tb <= lastT;
  });

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerH} stroke="#d1d5db" />
        <Line x1={padLeft} y1={padTop + innerH} x2={padLeft + innerW} y2={padTop + innerH} stroke="#d1d5db" />
        <SvgText x={4} y={padTop + 8} fontSize="10" fill="#6b7280">{maxElo}</SvgText>
        <SvgText x={4} y={padTop + innerH} fontSize="10" fill="#6b7280">{minElo}</SvgText>

        {visibleBoundaries.map((b) => {
          const tb = Date.parse(b.timestamp);
          const x = padLeft + ((tb - firstT) / tRange) * innerW;
          return (
            <Line
              key={b.timestamp}
              x1={x}
              y1={padTop}
              x2={x}
              y2={padTop + innerH}
              stroke="#9ca3af"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          );
        })}
        {visibleBoundaries.map((b) => {
          const tb = Date.parse(b.timestamp);
          const x = padLeft + ((tb - firstT) / tRange) * innerW;
          return (
            <SvgText
              key={`${b.timestamp}-label`}
              x={x + 2}
              y={padTop + 10}
              fontSize="9"
              fill="#6b7280"
            >
              {b.label}
            </SvgText>
          );
        })}

        {segments.map((s, idx) => (
          <Polyline key={idx} points={s} fill="none" stroke="#1e3a8a" strokeWidth={2} />
        ))}
        {points.map((p, i) => (
          <Circle key={p.matchId} cx={xs[i]} cy={ys[i]} r={4} fill="#1e3a8a" />
        ))}
      </Svg>
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
        {points.map((p, i) => (
          <Pressable
            key={p.matchId}
            onPress={() => onPointPress?.(p.matchId)}
            style={{
              position: 'absolute',
              left: xs[i] - 12,
              top: ys[i] - 12,
              width: 24,
              height: 24,
            }}
          />
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Update `EloHistoryTab.tsx` to consume the new shape**

Replace the file with:

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { useEloHistory, type EloPoint } from '../../hooks/use-elo-history';
import { EloHistoryChart } from './EloHistoryChart';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

interface Props {
  userId: string;
}

export function EloHistoryTab({ userId }: Props) {
  const { data, isLoading } = useEloHistory(userId);
  const byCategory = data?.byCategory ?? {};
  const seasonBoundaries = data?.seasonBoundaries ?? [];
  const categories = Object.keys(byCategory);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const selected = activeCat ?? categories[0] ?? null;

  if (isLoading) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }
  if (categories.length === 0 || !selected) {
    return <Text className="mt-4 text-sm text-gray-500">Henüz ELO geçmişi yok.</Text>;
  }

  const points = byCategory[selected] ?? [];
  const peak = points.length > 0 ? Math.max(...points.map((p) => p.elo)) : 0;
  const current = points.length > 0 ? points[points.length - 1].elo : 0;
  const baseline = points.length > 0 ? points[0].eloBefore : 0;
  const trend = current - baseline;
  const screenWidth = Dimensions.get('window').width - 48;

  return (
    <View className="mt-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {categories.map((cat) => {
          const isActive = cat === selected;
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCat(cat)}
              className={`mr-2 rounded-full px-3 py-1 ${
                isActive ? 'bg-primary' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isActive ? 'text-white' : 'text-gray-700'
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mb-3 flex-row gap-2">
        <SummaryCard label="Tepe" value={String(peak)} />
        <SummaryCard label="Şu an" value={String(current)} />
        <SummaryCard
          label="Trend"
          value={`${trend > 0 ? '+' : ''}${trend}`}
          tone={trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat'}
        />
      </View>

      <EloHistoryChart
        points={points as EloPoint[]}
        seasonBoundaries={seasonBoundaries}
        width={screenWidth}
        height={200}
        onPointPress={(matchId) => router.push(`/match/${matchId}`)}
      />
    </View>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'flat',
}: {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'flat';
}) {
  const color =
    tone === 'up' ? 'text-green-700' : tone === 'down' ? 'text-red-700' : 'text-gray-900';
  return (
    <View className="flex-1 rounded-lg border border-gray-200 bg-white p-2">
      <Text className="text-[10px] text-gray-500">{label}</Text>
      <Text className={`mt-1 text-base font-semibold ${color}`}>{value}</Text>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/components/profile/EloHistoryChart.tsx apps/mobile/components/profile/EloHistoryTab.tsx
git commit -m "feat(mobile): draw season-boundary markers + soft-reset polyline break on EloHistoryChart"
```

---

## Phase E — Tournament bracket UI

### Task 10: `useTournamentBracket` hook

**Files:**
- Create: `apps/mobile/hooks/use-tournament-bracket.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface BracketSlot {
  id: string;
  round: number;
  bracket_position: number;
  seed_a: number | null;
  seed_b: number | null;
  match_id: string | null;
  match_status: 'awaiting_confirmation' | 'confirmed' | 'disputed' | 'voided' | null;
  winner_team: 'a' | 'b' | 'void' | null;
  score_team_a: number | null;
  score_team_b: number | null;
  player_a_name: string | null;
  player_b_name: string | null;
}

export interface TournamentBracket {
  id: string;
  season_id: string;
  category: string;
  bracket_size: number;
  status: 'seeded' | 'in_progress' | 'completed';
  slots: BracketSlot[];
  seedToPlayer: Record<number, { user_id: string; name: string }>;
}

interface RawBracketSlot {
  id: string;
  round: number;
  bracket_position: number;
  seed_a: number | null;
  seed_b: number | null;
  match_id: string | null;
  match: {
    status: BracketSlot['match_status'];
    winner_team: BracketSlot['winner_team'];
    score_team_a: number | null;
    score_team_b: number | null;
  } | null;
}

interface StandingRow {
  rank: number;
  profile_id: string;
  profile: { first_name: string; last_name: string } | null;
}

export function useTournamentBracket(tournamentId: string | undefined) {
  return useQuery<TournamentBracket | null>({
    queryKey: tournamentId
      ? queryKeys.tournaments.bracket(tournamentId)
      : queryKeys.tournaments.all,
    queryFn: async () => {
      if (!tournamentId) return null;
      const { data: tournament, error: tErr } = await supabase
        .from('tournaments')
        .select('id, season_id, category, bracket_size, status')
        .eq('id', tournamentId)
        .single();
      if (tErr) throw tErr;
      if (!tournament) return null;

      const { data: rawSlots, error: sErr } = await supabase
        .from('tournament_matches')
        .select(`
          id, round, bracket_position, seed_a, seed_b, match_id,
          match:matches(status, winner_team, score_team_a, score_team_b)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('bracket_position', { ascending: true });
      if (sErr) throw sErr;

      const { data: standings, error: stErr } = await supabase
        .from('season_standings')
        .select(`
          rank, profile_id,
          profile:profiles!season_standings_profile_id_fkey(first_name, last_name)
        `)
        .eq('season_id', tournament.season_id)
        .eq('category', tournament.category)
        .lte('rank', tournament.bracket_size);
      if (stErr) throw stErr;

      const seedToPlayer: Record<number, { user_id: string; name: string }> = {};
      for (const s of ((standings ?? []) as unknown as StandingRow[])) {
        const name = s.profile ? `${s.profile.first_name} ${s.profile.last_name}` : '—';
        seedToPlayer[s.rank] = { user_id: s.profile_id, name };
      }

      const slots: BracketSlot[] = ((rawSlots ?? []) as unknown as RawBracketSlot[]).map((r) => ({
        id: r.id,
        round: r.round,
        bracket_position: r.bracket_position,
        seed_a: r.seed_a,
        seed_b: r.seed_b,
        match_id: r.match_id,
        match_status: r.match?.status ?? null,
        winner_team: r.match?.winner_team ?? null,
        score_team_a: r.match?.score_team_a ?? null,
        score_team_b: r.match?.score_team_b ?? null,
        player_a_name: r.seed_a !== null ? seedToPlayer[r.seed_a]?.name ?? null : null,
        player_b_name: r.seed_b !== null ? seedToPlayer[r.seed_b]?.name ?? null : null,
      }));

      return {
        id: tournament.id,
        season_id: tournament.season_id,
        category: tournament.category,
        bracket_size: tournament.bracket_size,
        status: tournament.status,
        slots,
        seedToPlayer,
      };
    },
    enabled: !!tournamentId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-tournament-bracket.ts
git commit -m "feat(mobile): add useTournamentBracket hook (slots + seed→player map)"
```

---

### Task 11: BracketView component + tournament viewer screen

**Files:**
- Create: `apps/mobile/components/seasons/BracketView.tsx`
- Create: `apps/mobile/app/tournament/_layout.tsx`
- Create: `apps/mobile/app/tournament/[id].tsx`

- [ ] **Step 1: Create `BracketView.tsx`**

The component takes pre-fetched `slots` and renders them in 3 columns (QF → SF → F) for 8-slot brackets or 2 columns (SF → F) for 4-slot brackets. Each slot shows `seedToPlayer` names + score (when match exists) + winner highlight.

```typescript
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { BracketSlot } from '../../hooks/use-tournament-bracket';

interface Props {
  bracketSize: number;
  slots: BracketSlot[];
}

const ROUND_LABELS: Record<number, string> = {
  1: 'Çeyrek Final',
  2: 'Yarı Final',
  3: 'Final',
};

const ROUND_LABELS_SMALL: Record<number, string> = {
  1: 'Yarı Final',
  2: 'Final',
};

export function BracketView({ bracketSize, slots }: Props) {
  const rounds = bracketSize === 8 ? [1, 2, 3] : [1, 2];
  const labels = bracketSize === 8 ? ROUND_LABELS : ROUND_LABELS_SMALL;
  const byRound = new Map<number, BracketSlot[]>();
  for (const s of slots) {
    const list = byRound.get(s.round) ?? [];
    list.push(s);
    byRound.set(s.round, list);
  }

  return (
    <View className="flex-row">
      {rounds.map((r) => (
        <View key={r} className="mr-3 flex-1">
          <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">
            {labels[r]}
          </Text>
          <View className="gap-3">
            {(byRound.get(r) ?? []).map((s) => (
              <SlotCard key={s.id} slot={s} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function SlotCard({ slot }: { slot: BracketSlot }) {
  const aWon = slot.winner_team === 'a';
  const bWon = slot.winner_team === 'b';
  const onPress = slot.match_id ? () => router.push(`/match/${slot.match_id}`) : undefined;
  const cardBody = (
    <View className="rounded-lg border border-gray-200 bg-white p-2">
      <Row
        seed={slot.seed_a}
        name={slot.player_a_name}
        score={slot.score_team_a}
        highlight={aWon}
      />
      <View className="my-1 h-px bg-gray-100" />
      <Row
        seed={slot.seed_b}
        name={slot.player_b_name}
        score={slot.score_team_b}
        highlight={bWon}
      />
    </View>
  );
  if (!onPress) return cardBody;
  return <Pressable onPress={onPress}>{cardBody}</Pressable>;
}

function Row({
  seed,
  name,
  score,
  highlight,
}: {
  seed: number | null;
  name: string | null;
  score: number | null;
  highlight: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center">
        <Text className="mr-2 text-[10px] text-gray-400">{seed !== null ? `#${seed}` : '—'}</Text>
        <Text
          className={`flex-1 text-xs ${highlight ? 'font-bold text-green-700' : 'text-gray-900'}`}
          numberOfLines={1}
        >
          {name ?? 'Bekleniyor'}
        </Text>
      </View>
      <Text className={`text-xs ${highlight ? 'font-bold text-green-700' : 'text-gray-700'}`}>
        {score ?? '—'}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Create `tournament/_layout.tsx`**

```typescript
import { Stack } from 'expo-router';

export default function TournamentStack() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ title: 'Sezon Finali' }} />
    </Stack>
  );
}
```

- [ ] **Step 3: Create `tournament/[id].tsx`**

```typescript
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { BracketView } from '../../components/seasons/BracketView';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useTournamentBracket } from '../../hooks/use-tournament-bracket';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useTournamentBracket(id);

  if (isLoading) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }
  if (!data) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Turnuva bulunamadı.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <Text className="text-lg font-bold text-gray-900">
        {CATEGORY_LABELS[data.category] ?? data.category}
      </Text>
      <Text className="mb-3 text-xs text-gray-500">
        {data.bracket_size} oyuncu · {statusLabel(data.status)}
      </Text>
      {data.bracket_size !== 4 && data.bracket_size !== 8 ? (
        <View className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <Text className="text-xs text-amber-900">
            Beklenmedik bracket boyutu ({data.bracket_size}); ham slot listesini gösteriyoruz.
          </Text>
        </View>
      ) : null}
      <BracketView bracketSize={data.bracket_size} slots={data.slots} />
    </ScreenContainer>
  );
}

function statusLabel(s: string): string {
  if (s === 'seeded') return 'Eşleşmeler hazır';
  if (s === 'in_progress') return 'Devam ediyor';
  return 'Tamamlandı';
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/components/seasons/BracketView.tsx apps/mobile/app/tournament
git commit -m "feat(mobile): add /tournament/[id] bracket viewer screen"
```

---

### Task 12: Verify SeasonBanner CTA reaches the bracket

This task is verification only — the `SeasonBanner` already pushes `/tournament/${firstTournamentId}` when `finale_in_progress` (Task 7). Since `tournament/[id].tsx` now exists (Task 11), the wire is complete; here we just smoke-test the route.

- [ ] **Step 1: Start the local Supabase stack and seed a finale-in-progress state**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
insert into public.seasons (id, name, year, starts_at, ends_at, finale_starts_at, finale_ends_at, status)
values (gen_random_uuid(), 'bahar', 2026, '2026-01-26', '2026-06-30', '2026-06-21', '2026-06-30', 'finale')
returning id;
SQL
```

- [ ] **Step 2: Insert a tournament + a couple of bracket_positions**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
with s as (select id from public.seasons where name='bahar' and year=2026 limit 1)
insert into public.tournaments (season_id, category, bracket_size, status)
select id, 'erkek_tek', 8, 'in_progress' from s
returning id;
SQL
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
with t as (select id from public.tournaments where category='erkek_tek' limit 1)
insert into public.tournament_matches (tournament_id, round, bracket_position, seed_a, seed_b)
select t.id, 1, p, p, 9 - p from t, generate_series(1, 4) as p;
SQL
```

- [ ] **Step 3: Launch the app + open the route**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase functions serve --no-verify-jwt &
sleep 5
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bunx expo start --host lan &
sleep 25
IP=$(ifconfig en0 | grep "inet " | awk '{print $2}' | head -1)
open -a /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app
xcrun simctl openurl booted "exp://$IP:8081"
```

In Simulator: sign in as any test player, see SeasonBanner = "Bahar 2026 Finali devam ediyor", tap → lands on `/tournament/[id]` showing 4 QF slots with seed numbers.

- [ ] **Step 4: Tear down + commit verification marker**

```bash
pkill -f "expo start" || true
pkill -f "supabase functions serve" || true
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase stop
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git commit --allow-empty -m "test(mobile): verified SeasonBanner CTA → tournament bracket route"
```

---

## Phase F — Yearly championship + past-champion highlight

### Task 13: `useYearlyStandings` hook + yearly screen

**Files:**
- Create: `apps/mobile/hooks/use-yearly-standings.ts`
- Create: `apps/mobile/app/yearly-championship/_layout.tsx`
- Create: `apps/mobile/app/yearly-championship/[year].tsx`

- [ ] **Step 1: Create `use-yearly-standings.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface YearlyStanding {
  category: string;
  rank: number;
  profile_id: string;
  total_finale_points: number;
  first_name: string;
  last_name: string;
}

interface RawRow {
  category: string;
  rank: number;
  profile_id: string;
  total_finale_points: number;
  profile: { first_name: string; last_name: string } | null;
}

export function useYearlyStandings(year: number) {
  return useQuery<Record<string, YearlyStanding[]>>({
    queryKey: queryKeys.yearly.standings(year),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('yearly_championship')
        .select(`
          category, rank, profile_id, total_finale_points,
          profile:profiles!yearly_championship_profile_id_fkey(first_name, last_name)
        `)
        .eq('year', year)
        .order('category', { ascending: true })
        .order('rank', { ascending: true });
      if (error) throw error;
      const grouped: Record<string, YearlyStanding[]> = {};
      for (const r of ((data ?? []) as unknown as RawRow[])) {
        const list = grouped[r.category] ?? [];
        list.push({
          category: r.category,
          rank: r.rank,
          profile_id: r.profile_id,
          total_finale_points: r.total_finale_points,
          first_name: r.profile?.first_name ?? 'Bilinmeyen',
          last_name: r.profile?.last_name ?? '',
        });
        grouped[r.category] = list;
      }
      return grouped;
    },
    staleTime: 1000 * 60 * 60,
  });
}
```

- [ ] **Step 2: Create the stack layout**

```typescript
import { Stack } from 'expo-router';

export default function YearlyStack() {
  return (
    <Stack>
      <Stack.Screen name="[year]" options={{ title: 'Yıllık Şampiyonluk' }} />
    </Stack>
  );
}
```

Save as `apps/mobile/app/yearly-championship/_layout.tsx`.

- [ ] **Step 3: Create the screen**

```typescript
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useYearlyStandings } from '../../hooks/use-yearly-standings';

const CATEGORY_LABELS: Record<string, string> = {
  erkek_tek: 'Erkek Tek',
  kadin_tek: 'Kadın Tek',
  open_tek: 'Open Tek',
  erkek_cift: 'Erkek Çift',
  kadin_cift: 'Kadın Çift',
  karma_cift: 'Karma Çift',
  open_cift: 'Open Çift',
};

export default function YearlyChampionshipScreen() {
  const { year } = useLocalSearchParams<{ year: string }>();
  const yearNum = Number(year);
  const { data, isLoading } = useYearlyStandings(yearNum);

  if (isLoading) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }

  const categories = Object.keys(data ?? {});
  if (categories.length === 0) {
    return (
      <ScreenContainer>
        <Text className="text-sm text-gray-500">{yearNum} için henüz veri yok.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <Text className="mb-3 text-2xl font-bold text-gray-900">🏆 {yearNum}</Text>
      {categories.map((cat) => {
        const standings = data?.[cat] ?? [];
        return (
          <View key={cat} className="mb-5">
            <Text className="mb-2 text-base font-semibold text-gray-900">
              {CATEGORY_LABELS[cat] ?? cat}
            </Text>
            {standings.slice(0, 10).map((s) => (
              <Pressable
                key={`${cat}-${s.profile_id}`}
                onPress={() => router.push(`/user/${s.profile_id}`)}
                className="mb-1 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
              >
                <View className="flex-row items-center">
                  <Text className="w-8 text-sm font-semibold text-gray-500">#{s.rank}</Text>
                  <Text className="text-sm text-gray-900">
                    {s.first_name} {s.last_name}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-gray-700">
                  {s.total_finale_points} puan
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
    </ScreenContainer>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-yearly-standings.ts apps/mobile/app/yearly-championship
git commit -m "feat(mobile): add /yearly-championship/[year] standings screen"
```

---

### Task 14: `usePastChampion` + `PastChampionPill` component

**Files:**
- Create: `apps/mobile/hooks/use-past-champion.ts`
- Create: `apps/mobile/components/seasons/PastChampionPill.tsx`

- [ ] **Step 1: Create `use-past-champion.ts`**

The hook looks at `user_badges` joined to `badges` for `code in ('season_champion', 'yearly_champion')` and returns the **most recent** one for "geçen sezon şampiyonu vurgusu" (spec 5.5). Season titles are tied to the `season_id` on the `user_badges` row; we surface season name/year for the tooltip text.

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface PastChampion {
  label: string;
  kind: 'season' | 'yearly';
}

interface RawRow {
  earned_at: string;
  season_id: string | null;
  badge: { code: string } | null;
  season: { name: string; year: number } | null;
}

const SEASON_LABEL: Record<string, string> = {
  guz: 'Güz',
  bahar: 'Bahar',
  yaz: 'Yaz',
};

export function usePastChampion(userId: string | undefined) {
  return useQuery<PastChampion | null>({
    queryKey: userId ? queryKeys.yearly.pastChampion(userId) : queryKeys.yearly.all,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          earned_at, season_id,
          badge:badges(code),
          season:seasons(name, year)
        `)
        .eq('profile_id', userId)
        .in('badge.code' as never, ['season_champion', 'yearly_champion'])
        .order('earned_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      const rows = ((data ?? []) as unknown as RawRow[]).filter(
        (r) => r.badge?.code === 'season_champion' || r.badge?.code === 'yearly_champion',
      );
      if (rows.length === 0) return null;
      const top = rows[0];
      if (top.badge?.code === 'yearly_champion') {
        const yr = top.season?.year ?? new Date(top.earned_at).getUTCFullYear();
        return { label: `${yr} Yıllık Şampiyon`, kind: 'yearly' };
      }
      const name = top.season ? SEASON_LABEL[top.season.name] ?? top.season.name : 'Sezon';
      const year = top.season?.year ?? new Date(top.earned_at).getUTCFullYear();
      return { label: `${name} ${year} Şampiyonu`, kind: 'season' };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60,
  });
}
```

- [ ] **Step 2: Create `PastChampionPill.tsx`**

```typescript
import { Text, View } from 'react-native';
import type { PastChampion } from '../../hooks/use-past-champion';

interface Props {
  champion: PastChampion;
}

export function PastChampionPill({ champion }: Props) {
  return (
    <View className="mt-1 flex-row items-center self-center rounded-full bg-amber-100 px-3 py-1">
      <Text className="text-xs">👑</Text>
      <Text className="ml-1 text-xs font-semibold text-amber-900">{champion.label}</Text>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-past-champion.ts apps/mobile/components/seasons/PastChampionPill.tsx
git commit -m "feat(mobile): add usePastChampion hook + PastChampionPill component"
```

---

### Task 15: Wire PastChampionPill into ProfileHeader

**Files:**
- Modify: `apps/mobile/components/profile/ProfileHeader.tsx`

- [ ] **Step 1: Extend ProfileHeader to render the pill**

Replace the entire file with:

```typescript
import { Image, Pressable, Text, View } from 'react-native';
import type { PinnedBadgeView } from './PinnedBadges';
import { LevelBadge } from './LevelBadge';
import { PinnedBadges } from './PinnedBadges';
import { PastChampionPill } from '../seasons/PastChampionPill';
import type { PastChampion } from '../../hooks/use-past-champion';

interface Props {
  firstName: string;
  lastName: string;
  pronounDisplay?: string | null;
  avatarUrl?: string | null;
  highestElo: number;
  pinned: PinnedBadgeView[];
  editable: boolean;
  onAvatarPress?: () => void;
  onPinnedEditPress?: () => void;
  onEditProfilePress?: () => void;
  belowName?: string | null;
  pastChampion?: PastChampion | null;
}

export function ProfileHeader(props: Props) {
  const initials = `${props.firstName?.[0] ?? ''}${props.lastName?.[0] ?? ''}`;
  return (
    <View className="items-center pt-6">
      <Pressable
        onPress={props.editable ? props.onAvatarPress : undefined}
        className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-200"
      >
        {props.avatarUrl ? (
          <Image source={{ uri: props.avatarUrl }} className="h-24 w-24" />
        ) : (
          <Text className="text-3xl text-gray-500">{initials}</Text>
        )}
      </Pressable>
      <View className="mt-3 flex-row items-center">
        <Text className="text-xl font-bold text-gray-900">
          {props.firstName} {props.lastName}
        </Text>
        {props.pronounDisplay && (
          <Text className="ml-2 text-gray-600">({props.pronounDisplay})</Text>
        )}
      </View>
      {props.belowName && (
        <Text className="mt-1 text-sm text-gray-500">{props.belowName}</Text>
      )}
      {props.pastChampion && <PastChampionPill champion={props.pastChampion} />}
      <View className="mt-2">
        <LevelBadge highestElo={props.highestElo} />
      </View>
      <PinnedBadges
        pinned={props.pinned}
        editable={props.editable}
        onEditPress={props.onPinnedEditPress}
      />
      {props.editable && (
        <Pressable
          onPress={props.onEditProfilePress}
          className="mt-3 rounded-full border border-primary px-4 py-1"
        >
          <Text className="text-sm font-semibold text-primary">Profili Düzenle</Text>
        </Pressable>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Pass `pastChampion` from self-profile and other-player-profile screens**

Edit `apps/mobile/app/(app)/profile.tsx`. Add at the top of the file:

```typescript
import { usePastChampion } from '../../hooks/use-past-champion';
```

Inside `ProfileScreen`, add (right after `const myBadges = useMyBadges();`):

```typescript
  const pastChampion = usePastChampion(userId);
```

In the `<ProfileHeader ... />` JSX, add the prop:

```typescript
        pastChampion={pastChampion.data ?? null}
```

Then edit `apps/mobile/app/user/[userId].tsx`. Add the same import at the top:

```typescript
import { usePastChampion } from '../../hooks/use-past-champion';
```

And add inside the screen component (next to the other hook calls):

```typescript
  const pastChampion = usePastChampion(userId);
```

And on the `<ProfileHeader ... />` JSX inside that screen, add:

```typescript
        pastChampion={pastChampion.data ?? null}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/components/profile/ProfileHeader.tsx apps/mobile/app/\(app\)/profile.tsx apps/mobile/app/user/\[userId\].tsx
git commit -m "feat(mobile): render PastChampionPill on self + other-player ProfileHeader"
```

---

## Phase G — Cron verification

### Task 16: Verify the `season_lifecycle_daily` cron job

This task is verification only. The cron job is already created by Plan 1 migration `20260607000008_cron_season_lifecycle.sql` and schedules `public.season_lifecycle_check()` daily at `0 3 * * *` (UTC = 06:00 TR per spec 7.6). We do not add a duplicate cron — we only confirm it exists, then exercise it manually.

- [ ] **Step 1: Verify the cron schedule is registered**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select jobname, schedule, command from cron.job where jobname = 'season_lifecycle_daily';"
```

Expected: 1 row, `schedule = '0 3 * * *'`, `command` calls `public.season_lifecycle_check();`.

- [ ] **Step 2: Trigger the lifecycle function manually with a season due for transition**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
insert into public.seasons (name, year, starts_at, ends_at, finale_starts_at, finale_ends_at, status)
values ('bahar', 2026, '2026-01-26', '2026-06-30', now() - interval '1 hour', '2026-06-30', 'active');
select public.season_lifecycle_check();
select id, status from public.seasons where name='bahar' and year=2026;
SQL
```

Expected: status flipped from `active` → `finale`.

- [ ] **Step 3: Manually invoke `close-season` via curl to verify the soft-reset path**

```bash
supabase functions serve --no-verify-jwt &
sleep 5
SERVICE_ROLE_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")
SEASON_ID=$(psql -t -A "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select id from public.seasons where name='bahar' and year=2026 limit 1;")
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "update public.profiles set role='admin' where (select count(*) from public.profiles)=0;" 2>/dev/null || true
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "insert into public.elo_ratings (profile_id, category, rating, matches_played) select user_id, 'erkek_tek', 1500, 20 from public.profiles limit 1;" 2>/dev/null || true
curl -s -X POST http://127.0.0.1:54321/functions/v1/close-season \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d "{\"seasonId\":\"$SEASON_ID\"}"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select rating, matches_played from public.elo_ratings where category='erkek_tek' limit 3;"
pkill -f "supabase functions serve" || true
supabase stop
```

Expected: `close-season` returns `200 { status: 'closed', ratingsReset: N }`; ratings updated according to `(rating + 1200) / 2` (1500 → 1350); `matches_played` reset to 0.

- [ ] **Step 4: Commit verification marker**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git commit --allow-empty -m "test(supabase): verified season_lifecycle_daily cron + close-season manual trigger"
```

---

## Phase H — End-to-end backend script

### Task 17: `season-lifecycle.e2e.ts` backend script

**Files:**
- Create: `packages/supabase/tests/e2e/season-lifecycle.e2e.ts`

The script runs against a local Supabase stack (presumed already started). It exercises the full lifecycle: seed → close-season → start-season-finale → assert ELO soft reset + season standings rows + tournament + bracket. It mirrors the pattern of the existing `e2e-happy-path.deno-test.ts` and uses the same `helpers.ts` utilities.

- [ ] **Step 1: Create the script**

```typescript
import { assert, assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from '../functions/helpers.ts';

Deno.test('season-lifecycle E2E: close-season + start-season-finale', async () => {
  await cleanupTestData();
  const admin = await createTestUser({
    email: 'admin@test.local',
    role: 'admin',
    genderCategory: 'erkek',
  });

  const players: Array<{ userId: string; accessToken: string }> = [];
  for (let i = 0; i < 8; i++) {
    const p = await createTestUser({
      email: `player${i}@test.local`,
      genderCategory: 'erkek',
      firstName: `Player${i}`,
      lastName: 'Test',
    });
    players.push(p);
  }
  const supa = adminClient();

  for (let i = 0; i < players.length; i++) {
    const rating = 1400 + (8 - i) * 25;
    await supa.from('elo_ratings').upsert(
      {
        profile_id: players[i].userId,
        category: 'erkek_tek',
        rating,
        matches_played: 15,
      },
      { onConflict: 'profile_id,category' },
    );
  }

  const { data: season } = await supa
    .from('seasons')
    .insert({
      name: 'bahar',
      year: 2026,
      starts_at: '2026-01-26',
      ends_at: '2026-06-30',
      finale_starts_at: '2026-06-21',
      finale_ends_at: '2026-06-30',
      status: 'finale',
    })
    .select('id')
    .single();
  assert(season, 'season insert returned data');

  const finaleStart = await invokeFunction(
    'start-season-finale',
    { seasonId: season!.id },
    admin.accessToken,
  );
  assertEquals(finaleStart.status, 200);

  const { data: tournament } = await supa
    .from('tournaments')
    .select('id, bracket_size, status')
    .eq('season_id', season!.id)
    .eq('category', 'erkek_tek')
    .single();
  assert(tournament, 'erkek_tek tournament created');
  assertEquals(tournament!.bracket_size, 8);
  assertEquals(tournament!.status, 'seeded');

  const { data: bracketMatches } = await supa
    .from('tournament_matches')
    .select('round, bracket_position, seed_a, seed_b')
    .eq('tournament_id', tournament!.id)
    .order('bracket_position', { ascending: true });
  assertEquals((bracketMatches ?? []).length, 4);
  assertEquals(bracketMatches?.[0].seed_a, 1);
  assertEquals(bracketMatches?.[0].seed_b, 8);

  const { data: standings } = await supa
    .from('season_standings')
    .select('rank, profile_id')
    .eq('season_id', season!.id)
    .eq('category', 'erkek_tek')
    .order('rank', { ascending: true });
  assertEquals((standings ?? []).length, 8);
  assertEquals(standings?.[0].profile_id, players[0].userId);

  const closeRes = await invokeFunction(
    'close-season',
    { seasonId: season!.id },
    admin.accessToken,
  );
  assertEquals(closeRes.status, 200);

  const { data: ratingsAfter } = await supa
    .from('elo_ratings')
    .select('profile_id, rating, matches_played')
    .eq('category', 'erkek_tek')
    .in('profile_id', players.map((p) => p.userId));
  for (const row of ratingsAfter ?? []) {
    const i = players.findIndex((p) => p.userId === row.profile_id);
    const original = 1400 + (8 - i) * 25;
    const expected = Math.round((original + 1200) / 2);
    assertEquals(row.rating, expected, `player${i} soft-reset expected ${expected} got ${row.rating}`);
    assertEquals(row.matches_played, 0);
  }

  const { data: closedSeason } = await supa
    .from('seasons')
    .select('status')
    .eq('id', season!.id)
    .single();
  assertEquals(closedSeason!.status, 'closed');
});
```

- [ ] **Step 2: Run the script**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
supabase functions serve --no-verify-jwt &
sleep 5
ANON_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['ANON_KEY'])")
SERVICE_ROLE_KEY=$(supabase status --output json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")
SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
  deno test --allow-env --allow-net tests/e2e/season-lifecycle.e2e.ts
pkill -f "supabase functions serve" || true
supabase stop
```

Expected: the single test passes.

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/tests/e2e/season-lifecycle.e2e.ts
git commit -m "test(supabase): add season-lifecycle backend E2E (close + start-finale + soft reset)"
```

---

## Plan 6 Sonu

Bu plan tamamlandığında:

- **`@tennis/shared/seasons`** — akademik yıl bazlı `getCurrentSeasonWindow` + `getFinalePoints` + `placementFromRank` util'ları, tam test kapsamı
- **`advance-tournament-bracket` Edge Function** — `confirm-match` tarafından otomatik çağrılır, kazananı bir sonraki bracket slot'una yazar, finalde turnuvayı `completed` olarak işaretler
- **`useCurrentSeason` + `useUpcomingFinaleStatus` hook'ları** — sezon durumunu (inactive/announced/qualifying/finale_in_progress/finale_complete) türetir
- **SeasonBanner** — Maçlar tab'ının tepesinde 5 farklı varyantta görünür, `finale_in_progress` durumunda bracket'e CTA
- **ELO Geçmişi chart sezon ayırıcıları** — dikey kesik çizgiler + "Bahar 2026 başladı" etiketi + soft-reset noktasında polyline kırılması (Plan 5 Faz D'den ertelenen iş tamamlandı)
- **`/tournament/[id]` bracket viewer** — QF → SF → F için 3 sütunlu UI, çift için 2 sütun, voided/seeded/in_progress/completed durumlarını gösterir
- **`/yearly-championship/[year]` standings ekranı** — kategori başına ilk 10 kişi, tıklayınca oyuncu profiline gider
- **PastChampionPill** — ProfileHeader'da geçen sezon şampiyonu / yıllık şampiyonu için 👑 etiket
- **Cron doğrulaması** — `season_lifecycle_daily` job'un çalıştığı doğrulandı, manuel olarak `close-season` ile soft reset test edildi
- **Backend E2E script** — 8 oyuncu, finale başlatma, bracket seed kontrolü, close-season, ELO soft-reset doğrulaması tek bir deno test'te

**Bilinen sınırlamalar (sonraki planlara):**
- Admin UI "bracket'tan çekil → 9. seed'i koy" akışı — Plan 7 (admin panel)
- Bracket realtime update'i — şimdilik refetch ile, Plan 7'de subscription
- Sezon şampiyonu açıldığında özel modal/konfeti — Plan 8 (UI polish)
- Kategori değişim penceresi otomatik açılması (sezon `finale` durumuna geçince Profili Düzenle'de gender_category switch'i enable olur) — sezon durumu zaten okunabiliyor; UI gate Plan 5'in edit ekranında ince ayar olarak Plan 8'e kalıyor
- Web admin dashboard'dan sezon yönetimi — Faz 2

**Sonraki plan: Plan 7 — Bildirimler + Admin paneli.** Push setup, in-app notification center, 6 ekran admin paneli.
