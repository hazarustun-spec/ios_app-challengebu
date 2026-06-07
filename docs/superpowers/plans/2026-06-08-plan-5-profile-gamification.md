# Plan 5: Profile + Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the player profile + gamification surface — restructured Profile screen with 5 tabs (Sıralamalar, İstatistikler, Rozetler, ELO Geçmişi, Maçlar), badge catalog + award engine, level system based on highest ELO, ELO history line chart per category, profile editing + avatar upload, public Other-Player profile route with head-to-head, and post-match Badge Unlock + Level Up celebrations. End-to-end verifiable in iOS Simulator against the local Plan 2 backend.

**Architecture:** Profile becomes a header (avatar + name + LevelBadge + PinnedBadges) plus a horizontal segment control routing to five tab components. Badges flow through a new Edge Function `award-badges` that `confirm-match` invokes server-side; the response surfaces awarded badges + level-change to the mobile client which queues celebration modals into a Zustand store. Level mapping (`getLevel`) and shared types live in `@tennis/shared/badges` so they can be reused server-side. ELO history is derived client-side from `matches.rating_before_team_*` / `rating_after_team_*` (no new table). The chart is a pure `react-native-svg` polyline component — no chart library. Other-Player profile is a public route that reuses the same Header + Tabs but with privacy guards (no phone/email, head-to-head card, "Meydan Oku" CTA).

**Tech Stack:** Expo Router 4, TanStack Query v5, Zustand 5, NativeWind 4, `react-native-svg` (added in Task 11), `expo-image-picker` (already installed), `@tennis/shared` for level utility, `bun:test` for shared unit tests.

**Spec reference:** `docs/superpowers/specs/2026-06-06-tennis-challenger-design.md`
- Section 2 — data model (`badges`, `user_badges`, `elo_ratings`, `matches.rating_*`, `profiles.pinned_badge_ids`)
- Section 5.7 — ELO Geçmişi sayfası (per-category line chart)
- Section 6.1 — Rozet kataloğu (milestone / win / social / season / yearly / fun / loyalty)
- Section 6.2 — Seviye sistemi (ELO eşik tablosu)
- Section 6.3 — Vitrin (max 3 pinned badges)
- Section 6.4 — Profil ekranı (5 tab yapısı)
- Section 6.5 — Başka oyuncu profili

**Plan dependencies:** Plan 4b (match confirmation flow lands `rating_before_team_*` and `rating_after_team_*` on the `matches` row; `useConfirmMatch` hook ready to be extended with `awardedBadges` and `levelChange`).

**Plan 5 NOT in scope:**
- Realtime push for badge unlocks across devices — Plan 7
- Final UI polish (animations, haptics, share-screen) — Plan 8
- Doubles avatar UI / doubles partner selector for "common partners" stat — Plan 8
- Admin badge management UI — Plan 8 (admin panel)

**Known limitations (documented in code, fixed later):**
- Comeback badge detection requires detailed `score_details` parsing; MVP best-effort — if score_details shape doesn't expose deficit tracking we log a TODO and skip
- Avatar upload uses Storage public bucket with `<userId>.jpg` overwrite (no history)
- Rankings rank query is computed via Postgres `RANK() OVER` RPC; if rank calculation is too slow on large datasets, fall back to client-side per-category fetch (300 players → not an issue for MVP)
- ELO history chart shows max 100 last rated points per category (cuts tail to keep chart legible)

---

## Dosya Yapısı

```
packages/
├── shared/
│   ├── src/
│   │   └── badges/
│   │       ├── index.ts                     # NEW: barrel
│   │       └── level.ts                     # NEW: getLevel + levelChanged
│   ├── src/index.ts                         # MODIFY: re-export ./badges/index
│   └── tests/
│       └── badges/
│           └── level.test.ts                # NEW
└── supabase/
    ├── migrations/
    │   ├── 20260608000001_seed_badges.sql   # NEW: badge catalog rows
    │   ├── 20260608000002_user_badges_pin.sql # NEW: pinned_at column
    │   ├── 20260608000003_rankings_rpc.sql  # NEW: my_rankings RPC
    │   └── 20260608000004_avatars_bucket.sql # NEW: Storage bucket + policies
    └── functions/
        ├── award-badges/
        │   └── index.ts                     # NEW: badge evaluation Edge Function
        └── confirm-match/
            └── index.ts                     # MODIFY: call award-badges + return result

apps/mobile/
├── app/
│   ├── (app)/
│   │   ├── _layout.tsx                      # MODIFY: mount global celebration modal
│   │   └── profile.tsx                      # MODIFY: restructure into Header + Tabs
│   ├── profile/
│   │   ├── _layout.tsx                      # NEW: stack
│   │   └── edit.tsx                         # NEW: edit profile screen
│   └── user/
│       └── [userId].tsx                     # NEW: other player profile
├── components/
│   └── profile/
│       ├── AvatarPicker.tsx                 # NEW
│       ├── BadgeCard.tsx                    # NEW
│       ├── BadgesTab.tsx                    # NEW
│       ├── BadgeUnlockModal.tsx             # NEW
│       ├── CelebrationMount.tsx             # NEW: dequeues celebration store
│       ├── EloHistoryChart.tsx              # NEW: SVG polyline
│       ├── EloHistoryTab.tsx                # NEW
│       ├── HeadToHeadSummary.tsx            # NEW
│       ├── LevelBadge.tsx                   # NEW
│       ├── LevelUpModal.tsx                 # NEW
│       ├── MatchesTab.tsx                   # NEW (moved from profile.tsx MatchHistorySection)
│       ├── PinBadgeModal.tsx                # NEW
│       ├── PinnedBadges.tsx                 # NEW
│       ├── ProfileHeader.tsx                # NEW
│       ├── ProfileTabs.tsx                  # NEW
│       ├── RankingsTab.tsx                  # NEW
│       └── StatsTab.tsx                     # NEW
├── hooks/
│   ├── use-all-badges.ts                    # NEW
│   ├── use-confirm-match.ts                 # MODIFY: parse awardedBadges + levelChange
│   ├── use-elo-history.ts                   # NEW
│   ├── use-head-to-head.ts                  # NEW
│   ├── use-my-badges.ts                     # NEW
│   ├── use-my-rankings.ts                   # NEW
│   ├── use-my-stats.ts                      # NEW
│   ├── use-other-player-profile.ts          # NEW
│   ├── use-pin-badges.ts                    # NEW
│   ├── use-profile.ts                       # MODIFY: include pinned_badge_ids + department_id
│   ├── use-update-profile.ts                # NEW
│   └── use-upload-avatar.ts                 # NEW
├── lib/
│   └── query-keys.ts                        # MODIFY: add badges/rankings/stats/eloHistory keys
└── stores/
    └── post-match-celebration-store.ts      # NEW
```

**Phase outline:**
- **Phase A — Backend gamification foundation (Tasks 1-3):** badge catalog seed, `getLevel` shared util, `award-badges` Edge Function + `confirm-match` integration
- **Phase B — Profile header + Rankings + Stats (Tasks 4-6):** restructure into 5-tab layout, Rankings tab + RPC, Stats tab
- **Phase C — Badges UI (Tasks 7-9):** badge queries, BadgesTab grid, PinBadgeModal + mutation
- **Phase D — ELO History chart (Tasks 10-12):** history query, SVG line chart, ELO history tab
- **Phase E — Profile edit + Avatar (Tasks 13-14):** edit screen + avatar picker/upload
- **Phase F — Other player profile (Tasks 15-17):** profile fetch, screen + tabs, head-to-head
- **Phase G — Badge unlock + Level-up modals (Tasks 18-19):** modals + celebration queue + post-confirm wiring
- **Phase H — E2E verification (Task 20):** Simulator manual run-through

---

## Phase A — Backend gamification foundation

### Task 1: Badge catalog seed migration

**Files:**
- Create: `packages/supabase/migrations/20260608000001_seed_badges.sql`

- [ ] **Step 1: Write the seed migration**

```sql
-- Seed the MVP badge catalog. All badges keyed by `code` (snake_case) so the
-- award-badges Edge Function can reference them without UUID hard-coding.
-- display_order groups badges within each category in the spec's order.

insert into public.badges (code, name_tr, description_tr, icon, category, is_seasonal, display_order) values
  -- Milestones (cumulative match count, dostluk dahil)
  ('milestone_1_match',     'İlk Adım',           '1 maç oyna', '🌱', 'milestone', false, 10),
  ('milestone_3_matches',   'Üçleme',             '3 maç oyna', '🎾', 'milestone', false, 20),
  ('milestone_5_matches',   'Beşli',              '5 maç oyna', '🖐️', 'milestone', false, 30),
  ('milestone_10_matches',  'Onluk',              '10 maç oyna', '🔟', 'milestone', false, 40),
  ('milestone_25_matches',  'Çeyrek Yüz',         '25 maç oyna', '🥉', 'milestone', false, 50),
  ('milestone_50_matches',  'Yarım Yüz',          '50 maç oyna', '🥈', 'milestone', false, 60),
  ('milestone_100_matches', 'Yüzlük',             '100 maç oyna', '🥇', 'milestone', false, 70),
  ('milestone_250_matches', 'Çeyrek Bin',         '250 maç oyna', '🏅', 'milestone', false, 80),
  ('milestone_500_matches', 'Yarım Bin',          '500 maç oyna', '🏆', 'milestone', false, 90),

  -- Wins (sıralama maçları)
  ('wins_1',   'İlk Galibiyet',      '1 sıralama maçı kazan',   '🎯', 'win', false, 10),
  ('wins_3',   'Üç Galibiyet',       '3 sıralama maçı kazan',   '🎯', 'win', false, 20),
  ('wins_5',   'Beş Galibiyet',      '5 sıralama maçı kazan',   '🎯', 'win', false, 30),
  ('wins_10',  'On Galibiyet',       '10 sıralama maçı kazan',  '🎖️', 'win', false, 40),
  ('wins_25',  'Yirmi Beş Galibiyet','25 sıralama maçı kazan',  '🎖️', 'win', false, 50),
  ('wins_50',  'Elli Galibiyet',     '50 sıralama maçı kazan',  '🏅', 'win', false, 60),
  ('wins_100', 'Yüz Galibiyet',      '100 sıralama maçı kazan', '👑', 'win', false, 70),

  -- Special wins
  ('bagel',    'Bagel',     '4-0 BÜ Klasik veya 6-0 set ile kazan',         '🥯', 'win', false, 80),
  ('comeback', 'Geri Dönüş','0-2''den 3-2 veya 1-3''ten 4-3 ile kazan',     '🔥', 'win', false, 90),

  -- Social
  ('social_first_doubles',     'İlk Çift Maçı',          'Çift kategorisinde ilk maç', '🤝', 'social', false, 10),
  ('social_5_diff_partners',   'Çevremi Genişletiyorum', '5 farklı partner ile maç oyna', '👥', 'social', false, 20),
  ('social_10_diff_opponents', 'Yeni Yüzler',            '10 farklı rakiple maç oyna',    '🆕', 'social', false, 30),

  -- Seasonal (her sezon sonu sıfırlanır; user_badges season_id ile kaydedilir)
  ('season_ladder_top10', 'Sezon Top 10',         'Sezon sonunda ladder Top 10',         '🔟', 'season', true, 10),
  ('season_ladder_top3',  'Sezon Top 3',          'Sezon sonunda ladder Top 3',          '🥉', 'season', true, 20),
  ('season_champion',     'Sezon Şampiyonu',      'Sezon finalini kazan',                '👑', 'season', true, 30),
  ('season_finalist',     'Sezon Finalisti',      'Sezon finalinde finale çık',          '🥈', 'season', true, 40),
  ('season_semifinalist', 'Sezon Yarı Finalisti', 'Sezon finalinde yarı finale çık',     '🥉', 'season', true, 50),

  -- Yearly (kategori başına, kalıcı)
  ('yearly_champion', 'Yıllık Şampiyon', 'Yıllık şampiyonluğu kazan (kategori başına)', '🏆', 'yearly', false, 10),

  -- Fun
  ('fun_night_owl',     'Gece Kuşu',           '22:00 sonrası 5 maç oyna',          '🦉', 'fun', false, 10),
  ('fun_early_bird',    'Erken Kuş',           '09:00 öncesi 5 maç oyna',           '🐦', 'fun', false, 20),
  ('fun_bebek_lover',   'Bebek Kort Sevdalısı','Bebek Kort''ta 10 maç oyna',         '🏖️', 'fun', false, 30),
  ('fun_court_explorer','Saha Gezgini',        'Üç farklı kortta da maç oyna',      '🗺️', 'fun', false, 40),
  ('fun_marathon',      'Maraton',             '3 Set Klasik formatında 5 maç oyna','🏃‍♂️', 'fun', false, 50),

  -- Loyalty
  ('loyalty_first_season', '1. Sezon', 'İlk sezonunu tamamla',          '⭐', 'loyalty', false, 10),
  ('loyalty_one_year',     '1 Yıl',    '3 sezon (1 akademik yıl) tamamla', '🌟', 'loyalty', false, 20),
  ('loyalty_founder',      'Kurucu',   'İlk 50 üyeden biri ol',           '🏛️', 'loyalty', false, 30)
on conflict (code) do nothing;
```

- [ ] **Step 2: Verify the migration applies cleanly**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select category, count(*) from public.badges group by category order by category;"
```

Expected: milestone=9, win=9, social=3, season=5, yearly=1, fun=5, loyalty=3 → total 35 rows.

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/migrations/20260608000001_seed_badges.sql
git commit -m "feat(supabase): seed MVP badge catalog (35 badges across 7 categories)"
```

---

### Task 2: Shared `getLevel` utility in `@tennis/shared`

**Files:**
- Create: `packages/shared/src/badges/level.ts`
- Create: `packages/shared/src/badges/index.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/tests/badges/level.test.ts`

- [ ] **Step 1: Create `level.ts`**

```typescript
export const LEVEL_CODES = [
  'yeni_cekirge',
  'caylak',
  'amator',
  'rekabetci',
  'usta',
  'elit',
  'sampiyon',
] as const;

export type LevelCode = (typeof LEVEL_CODES)[number];

export interface Level {
  code: LevelCode;
  name_tr: string;
  icon: string;
  threshold: number;
}

export const LEVELS: readonly Level[] = [
  { code: 'yeni_cekirge', name_tr: 'Yeni Çekirge', icon: '🌱', threshold: 0 },
  { code: 'caylak',       name_tr: 'Çaylak',       icon: '🎾', threshold: 1000 },
  { code: 'amator',       name_tr: 'Amatör',       icon: '🏃', threshold: 1200 },
  { code: 'rekabetci',    name_tr: 'Rekabetçi',    icon: '⚡', threshold: 1400 },
  { code: 'usta',         name_tr: 'Usta',         icon: '🔥', threshold: 1600 },
  { code: 'elit',         name_tr: 'Elit',         icon: '💎', threshold: 1800 },
  { code: 'sampiyon',     name_tr: 'Şampiyon',     icon: '👑', threshold: 2000 },
];

export function getLevel(elo: number): Level {
  if (!Number.isFinite(elo)) {
    throw new Error(`elo must be a finite number, got ${elo}`);
  }
  let current: Level = LEVELS[0];
  for (const lvl of LEVELS) {
    if (elo >= lvl.threshold) current = lvl;
  }
  return current;
}

export interface LevelChange {
  up: boolean;
  down: boolean;
  before: Level;
  after: Level;
}

export function levelChanged(beforeElo: number, afterElo: number): LevelChange {
  const before = getLevel(beforeElo);
  const after = getLevel(afterElo);
  const beforeIdx = LEVELS.findIndex((l) => l.code === before.code);
  const afterIdx = LEVELS.findIndex((l) => l.code === after.code);
  return {
    up: afterIdx > beforeIdx,
    down: afterIdx < beforeIdx,
    before,
    after,
  };
}
```

- [ ] **Step 2: Create `badges/index.ts` barrel**

```typescript
export * from './level';
```

- [ ] **Step 3: Re-export from package root**

Edit `packages/shared/src/index.ts`. Replace its full contents with:

```typescript
export * from './types/index';
export * from './elo/index';
export * from './schemas/index';
export * from './badges/index';
```

- [ ] **Step 4: Create `tests/badges/level.test.ts`**

```typescript
import { describe, expect, test } from 'bun:test';
import { LEVELS, getLevel, levelChanged } from '../../src/badges/level.js';

describe('getLevel', () => {
  test('returns Yeni Çekirge for ELO 0', () => {
    expect(getLevel(0).code).toBe('yeni_cekirge');
  });

  test('returns Yeni Çekirge for ELO 999 (just below Çaylak)', () => {
    expect(getLevel(999).code).toBe('yeni_cekirge');
  });

  test('returns Çaylak at exactly 1000', () => {
    expect(getLevel(1000).code).toBe('caylak');
  });

  test('returns Amatör for default starting ELO 1200', () => {
    expect(getLevel(1200).code).toBe('amator');
  });

  test('returns Rekabetçi at 1400', () => {
    expect(getLevel(1400).code).toBe('rekabetci');
  });

  test('returns Usta at 1600', () => {
    expect(getLevel(1600).code).toBe('usta');
  });

  test('returns Elit at 1800', () => {
    expect(getLevel(1800).code).toBe('elit');
  });

  test('returns Şampiyon at 2000', () => {
    expect(getLevel(2000).code).toBe('sampiyon');
  });

  test('returns Şampiyon for very high ELO', () => {
    expect(getLevel(3500).code).toBe('sampiyon');
  });

  test('throws on NaN', () => {
    expect(() => getLevel(Number.NaN)).toThrow();
  });

  test('LEVELS table has 7 entries', () => {
    expect(LEVELS.length).toBe(7);
  });
});

describe('levelChanged', () => {
  test('detects level-up Amatör → Rekabetçi', () => {
    const r = levelChanged(1399, 1400);
    expect(r.up).toBe(true);
    expect(r.down).toBe(false);
    expect(r.before.code).toBe('amator');
    expect(r.after.code).toBe('rekabetci');
  });

  test('detects level-down Rekabetçi → Amatör', () => {
    const r = levelChanged(1400, 1399);
    expect(r.up).toBe(false);
    expect(r.down).toBe(true);
  });

  test('returns up=false down=false when no change', () => {
    const r = levelChanged(1200, 1250);
    expect(r.up).toBe(false);
    expect(r.down).toBe(false);
    expect(r.before.code).toBe('amator');
    expect(r.after.code).toBe('amator');
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/shared
bun test tests/badges/level.test.ts
```

Expected: all 14 tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/shared/src/badges packages/shared/src/index.ts packages/shared/tests/badges
git commit -m "feat(shared): add getLevel + levelChanged utility with ELO threshold table"
```

---

### Task 3: `award-badges` Edge Function + `confirm-match` integration

**Files:**
- Create: `packages/supabase/functions/award-badges/index.ts`
- Modify: `packages/supabase/functions/confirm-match/index.ts`

- [ ] **Step 1: Create `award-badges/index.ts`**

This function is invoked from `confirm-match` after a match transitions to `confirmed`. It evaluates milestone, win, bagel, and (best-effort) comeback badges for each participant and inserts new rows into `user_badges`. Returns the awarded badges grouped by user.

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const inputSchema = z.object({ matchId: z.string().uuid() });

interface BadgeRow {
  id: string;
  code: string;
  name_tr: string;
  description_tr: string;
  icon: string;
  category: string;
}

interface AwardedPerUser {
  userId: string;
  badges: BadgeRow[];
}

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
      .select('*')
      .eq('id', parsed.data.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);
    if (match.status !== 'confirmed') {
      return jsonResponse({ awarded: [] as AwardedPerUser[] });
    }

    const { data: catalog } = await supa
      .from('badges')
      .select('id, code, name_tr, description_tr, icon, category, is_seasonal');
    const byCode = new Map<string, BadgeRow>();
    for (const b of catalog ?? []) byCode.set(b.code, b as BadgeRow);

    const allPlayers: string[] = [
      ...(match.team_a_player_ids ?? []),
      ...(match.team_b_player_ids ?? []),
    ];

    const result: AwardedPerUser[] = [];
    for (const userId of allPlayers) {
      const newBadges = await evaluateForUser(supa, byCode, match, userId);
      if (newBadges.length > 0) result.push({ userId, badges: newBadges });
    }

    return jsonResponse({ awarded: result });
  } catch (err) {
    return internalError(err);
  }
});

async function evaluateForUser(
  supa: ReturnType<typeof getServiceClient>,
  byCode: Map<string, BadgeRow>,
  match: Record<string, unknown>,
  userId: string,
): Promise<BadgeRow[]> {
  const onTeamA = (match.team_a_player_ids as string[]).includes(userId);
  const userTeam = onTeamA ? 'a' : 'b';
  const won = match.winner_team === userTeam;
  const isRated = match.is_rated as boolean;

  const { data: existing } = await supa
    .from('user_badges')
    .select('badge_id')
    .eq('profile_id', userId);
  const owned = new Set<string>((existing ?? []).map((r) => r.badge_id as string));

  const toAward: BadgeRow[] = [];

  const { count: totalMatches } = await supa
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .in('status', ['confirmed', 'voided'])
    .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`);
  const totalCount = totalMatches ?? 0;

  const milestoneThresholds: { code: string; n: number }[] = [
    { code: 'milestone_1_match', n: 1 },
    { code: 'milestone_3_matches', n: 3 },
    { code: 'milestone_5_matches', n: 5 },
    { code: 'milestone_10_matches', n: 10 },
    { code: 'milestone_25_matches', n: 25 },
    { code: 'milestone_50_matches', n: 50 },
    { code: 'milestone_100_matches', n: 100 },
    { code: 'milestone_250_matches', n: 250 },
    { code: 'milestone_500_matches', n: 500 },
  ];
  for (const m of milestoneThresholds) {
    if (totalCount >= m.n) {
      const badge = byCode.get(m.code);
      if (badge && !owned.has(badge.id)) toAward.push(badge);
    }
  }

  if (isRated && won) {
    const { count: wins } = await supa
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .eq('is_rated', true)
      .or(
        `and(winner_team.eq.a,team_a_player_ids.cs.{${userId}}),` +
          `and(winner_team.eq.b,team_b_player_ids.cs.{${userId}})`,
      );
    const winCount = wins ?? 0;

    const winThresholds: { code: string; n: number }[] = [
      { code: 'wins_1', n: 1 },
      { code: 'wins_3', n: 3 },
      { code: 'wins_5', n: 5 },
      { code: 'wins_10', n: 10 },
      { code: 'wins_25', n: 25 },
      { code: 'wins_50', n: 50 },
      { code: 'wins_100', n: 100 },
    ];
    for (const w of winThresholds) {
      if (winCount >= w.n) {
        const badge = byCode.get(w.code);
        if (badge && !owned.has(badge.id)) toAward.push(badge);
      }
    }

    const myScore = onTeamA ? match.score_team_a : match.score_team_b;
    const oppScore = onTeamA ? match.score_team_b : match.score_team_a;
    const isBagel =
      (match.format === 'bu_klasik' && myScore === 4 && oppScore === 0) ||
      hasShutoutSet(match.score_details, userTeam);
    if (isBagel) {
      const badge = byCode.get('bagel');
      if (badge && !owned.has(badge.id)) toAward.push(badge);
    }

    if (detectComeback(match, userTeam)) {
      const badge = byCode.get('comeback');
      if (badge && !owned.has(badge.id)) toAward.push(badge);
    }
  }

  if (toAward.length === 0) return [];

  const inserts = toAward.map((b) => ({ profile_id: userId, badge_id: b.id }));
  const { error: insertErr } = await supa.from('user_badges').insert(inserts);
  if (insertErr) {
    console.error('Failed to insert user_badges', insertErr);
    return [];
  }
  return toAward;
}

function hasShutoutSet(scoreDetails: unknown, team: 'a' | 'b'): boolean {
  if (!Array.isArray(scoreDetails)) return false;
  for (const item of scoreDetails) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    if ('a' in obj && 'b' in obj) {
      const a = obj.a as number;
      const b = obj.b as number;
      if (team === 'a' && a === 6 && b === 0) return true;
      if (team === 'b' && b === 6 && a === 0) return true;
    }
  }
  return false;
}

function detectComeback(match: Record<string, unknown>, team: 'a' | 'b'): boolean {
  const details = match.score_details;
  if (!Array.isArray(details)) return false;

  if (match.format === '3set_klasik') {
    const sets = details as { set: number; a: number; b: number }[];
    if (sets.length !== 3) return false;
    const set1 = sets[0];
    const set2 = sets[1];
    if (!set1 || !set2) return false;
    const lostFirstTwo = team === 'a'
      ? set1.a < set1.b && set2.a < set2.b
      : set1.b < set1.a && set2.b < set2.a;
    const wonOverall = match.winner_team === team;
    return lostFirstTwo && wonOverall;
  }

  if (match.format === 'bu_klasik') {
    const els = details as { el: number; winner: 'a' | 'b' }[];
    if (els.length < 7) return false;
    const oppTeam = team === 'a' ? 'b' : 'a';
    const firstFour = els.slice(0, 4);
    const oppWinsFirstFour = firstFour.filter((e) => e.winner === oppTeam).length;
    if (oppWinsFirstFour !== 3) return false;
    return match.winner_team === team;
  }

  return false;
}
```

- [ ] **Step 2: Modify `confirm-match/index.ts` to call `award-badges`**

Replace the full file contents with:

```typescript
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { conflict, errorResponse, forbidden, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';
import { applyEloForMatch } from '../_shared/apply-elo.ts';
import type { MatchFormat } from '../_shared/elo.ts';

const inputSchema = z.object({ matchId: z.string().uuid() });

interface BadgeRow {
  id: string;
  code: string;
  name_tr: string;
  description_tr: string;
  icon: string;
  category: string;
}

interface AwardedPerUser {
  userId: string;
  badges: BadgeRow[];
}

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

    const newStatus = match.winner_team === 'void' ? 'voided' : 'confirmed';
    await supa.from('matches').update({
      confirmed_by: newConfirmed,
      confirmed_at: new Date().toISOString(),
      status: newStatus,
    }).eq('id', match.id);

    let awarded: AwardedPerUser[] = [];
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

      awarded = await invokeAwardBadges(match.id);
    }

    return jsonResponse({ confirmed: true, status: newStatus, awarded });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});

async function invokeAwardBadges(matchId: string): Promise<AwardedPerUser[]> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return [];
  try {
    const res = await fetch(`${url}/functions/v1/award-badges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ matchId }),
    });
    if (!res.ok) {
      console.error('award-badges call failed', res.status, await res.text());
      return [];
    }
    const json = (await res.json()) as { awarded?: AwardedPerUser[] };
    return json.awarded ?? [];
  } catch (err) {
    console.error('award-badges fetch threw', err);
    return [];
  }
}
```

- [ ] **Step 3: Verify Edge Functions still type-check**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase functions serve --no-verify-jwt &
sleep 5
curl -s -X POST http://127.0.0.1:54321/functions/v1/award-badges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(supabase status --output json | python3 -c 'import json,sys; print(json.load(sys.stdin)[\"SERVICE_ROLE_KEY\"])')" \
  -d '{"matchId":"00000000-0000-0000-0000-000000000000"}'
pkill -f "supabase functions serve" || true
```

Expected: returns a JSON 404 ("Match not found") — confirms the function loads, parses input, and routes correctly.

- [ ] **Step 4: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/functions/award-badges packages/supabase/functions/confirm-match
git commit -m "feat(supabase): add award-badges Edge Function + confirm-match integration"
```

---

## Phase B — Profile header + Rankings + Stats

### Task 4: Restructure Profile screen into 5-tab layout

**Files:**
- Modify: `apps/mobile/lib/query-keys.ts`
- Create: `apps/mobile/components/profile/ProfileHeader.tsx`
- Create: `apps/mobile/components/profile/LevelBadge.tsx`
- Create: `apps/mobile/components/profile/PinnedBadges.tsx`
- Create: `apps/mobile/components/profile/ProfileTabs.tsx`
- Create: `apps/mobile/components/profile/MatchesTab.tsx`
- Modify: `apps/mobile/hooks/use-profile.ts`
- Modify: `apps/mobile/app/(app)/profile.tsx`

- [ ] **Step 1: Extend query keys**

Replace `apps/mobile/lib/query-keys.ts` with:

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
  courts: ['courts'] as const,
  departments: ['departments'] as const,
  profile: (userId: string) => ['profile', userId] as const,
} as const;
```

- [ ] **Step 2: Extend `useMyProfile` to include `pinned_badge_ids` and `department_id`**

Replace `apps/mobile/hooks/use-profile.ts` with:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export function useMyProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('no user');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id, first_name, last_name, email, phone, pronoun, pronoun_custom,
          gender_category, department_id, class_year, show_class_year, skill_self_assessment,
          dominant_hand, availability_windows, avatar_url, role, status,
          show_department, pinned_badge_ids,
          departments:departments(name)
        `)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 3: Create `LevelBadge.tsx`**

```typescript
import { Text, View } from 'react-native';
import { getLevel } from '@tennis/shared';

interface Props {
  highestElo: number;
}

export function LevelBadge({ highestElo }: Props) {
  const lvl = getLevel(highestElo);
  return (
    <View className="flex-row items-center rounded-full bg-blue-50 px-3 py-1">
      <Text className="text-base">{lvl.icon}</Text>
      <Text className="ml-1 text-sm font-semibold text-primary">{lvl.name_tr}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Create `PinnedBadges.tsx`**

```typescript
import { Pressable, Text, View } from 'react-native';

export interface PinnedBadgeView {
  id: string;
  icon: string;
  name_tr: string;
}

interface Props {
  pinned: PinnedBadgeView[];
  editable?: boolean;
  onEditPress?: () => void;
}

export function PinnedBadges({ pinned, editable = false, onEditPress }: Props) {
  const slots: (PinnedBadgeView | null)[] = [
    pinned[0] ?? null,
    pinned[1] ?? null,
    pinned[2] ?? null,
  ];
  return (
    <Pressable
      onPress={editable ? onEditPress : undefined}
      className="mt-2 flex-row items-center justify-center gap-2"
    >
      {slots.map((b, i) => (
        <View
          key={i}
          className="h-12 w-12 items-center justify-center rounded-lg border border-gray-300 bg-white"
        >
          <Text className="text-2xl">{b?.icon ?? '➕'}</Text>
        </View>
      ))}
      {editable && (
        <Text className="ml-2 text-xs text-gray-500">Düzenle</Text>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 5: Create `ProfileTabs.tsx`**

```typescript
import { Pressable, ScrollView, Text } from 'react-native';

export type ProfileTabKey = 'rankings' | 'stats' | 'badges' | 'elo' | 'matches';

export const PROFILE_TAB_LABELS: Record<ProfileTabKey, string> = {
  rankings: 'Sıralamalar',
  stats: 'İstatistikler',
  badges: 'Rozetler',
  elo: 'ELO Geçmişi',
  matches: 'Maçlar',
};

interface Props {
  active: ProfileTabKey;
  onChange: (key: ProfileTabKey) => void;
  available?: ProfileTabKey[];
}

const ORDER: ProfileTabKey[] = ['rankings', 'stats', 'badges', 'elo', 'matches'];

export function ProfileTabs({ active, onChange, available }: Props) {
  const tabs = available ?? ORDER;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
      {tabs.map((k) => {
        const isActive = active === k;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            className={`mr-2 rounded-full px-4 py-2 ${
              isActive ? 'bg-primary' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                isActive ? 'text-white' : 'text-gray-700'
              }`}
            >
              {PROFILE_TAB_LABELS[k]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **Step 6: Create `ProfileHeader.tsx`**

```typescript
import { Image, Pressable, Text, View } from 'react-native';
import type { PinnedBadgeView } from './PinnedBadges';
import { LevelBadge } from './LevelBadge';
import { PinnedBadges } from './PinnedBadges';

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

- [ ] **Step 7: Create `MatchesTab.tsx`** (moved from old `MatchHistorySection`)

```typescript
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { ActiveMatchRow } from '../../hooks/use-active-matches';
import { useMyMatchHistory } from '../../hooks/use-match-history';

interface Props {
  myUserId: string;
}

export function MatchesTab({ myUserId }: Props) {
  const { data, isLoading } = useMyMatchHistory();
  const list = data ?? [];
  if (isLoading) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }
  if (list.length === 0) {
    return <Text className="mt-4 text-sm text-gray-500">Henüz oynanmış maç yok.</Text>;
  }
  return (
    <View className="mt-4">
      {list.map((m) => (
        <HistoryRow key={m.id} match={m} myUserId={myUserId} />
      ))}
    </View>
  );
}

function HistoryRow({ match, myUserId }: { match: ActiveMatchRow; myUserId: string }) {
  const onTeamA = match.team_a_player_ids.includes(myUserId);
  const my = onTeamA ? match.score_team_a : match.score_team_b;
  const opp = onTeamA ? match.score_team_b : match.score_team_a;
  const iWon = (onTeamA && match.winner_team === 'a') || (!onTeamA && match.winner_team === 'b');
  const voided = match.winner_team === 'void';
  const ratingBefore = onTeamA ? match.rating_before_team_a : match.rating_before_team_b;
  const ratingAfter = onTeamA ? match.rating_after_team_a : match.rating_after_team_b;
  const delta = ratingBefore !== null && ratingAfter !== null ? ratingAfter - ratingBefore : null;
  const playedAt = new Date(match.played_at).toLocaleDateString('tr-TR');

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      className="mb-2 rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-600">{playedAt}</Text>
        <Text className={`text-sm font-semibold ${voided ? 'text-gray-700' : iWon ? 'text-green-700' : 'text-red-700'}`}>
          {voided ? 'Voided' : iWon ? 'Kazandın' : 'Kaybettin'}
        </Text>
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-base text-gray-900">
          {voided ? '— — —' : `${my} - ${opp}`}
        </Text>
        {delta !== null && match.is_rated && (
          <Text className={delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-gray-700'}>
            {delta > 0 ? '+' : ''}{delta} ELO
          </Text>
        )}
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 8: Replace `profile.tsx` with the tabbed layout**

Replace `apps/mobile/app/(app)/profile.tsx` with:

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { MatchesTab } from '../../components/profile/MatchesTab';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileTabs, type ProfileTabKey } from '../../components/profile/ProfileTabs';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useMyProfile } from '../../hooks/use-profile';
import { useMyRankings } from '../../hooks/use-my-rankings';
import { useMyBadges } from '../../hooks/use-my-badges';
import { useAuthStore } from '../../stores/auth-store';

export default function ProfileScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<ProfileTabKey>('rankings');
  const { data: p, isLoading } = useMyProfile();
  const rankings = useMyRankings();
  const myBadges = useMyBadges();

  if (isLoading || !p || !userId) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Yükleniyor...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const pronounDisplay = p.pronoun === 'other' ? p.pronoun_custom : p.pronoun;
  const dept = p.departments as { name: string }[] | { name: string } | null;
  const departmentName = Array.isArray(dept) ? dept[0]?.name : dept?.name;
  const belowName = [
    p.show_department && departmentName ? `@${departmentName}` : null,
    p.show_class_year && p.class_year ? classYearLabel(p.class_year) : null,
  ]
    .filter(Boolean)
    .join(' · ') || null;

  const highestElo = (rankings.data ?? []).reduce((m, r) => Math.max(m, r.rating), 0) || 1200;
  const pinnedIds = (p.pinned_badge_ids ?? []) as string[];
  const pinned = (myBadges.data ?? [])
    .filter((b) => pinnedIds.includes(b.badge_id))
    .map((b) => ({ id: b.badge_id, icon: b.icon, name_tr: b.name_tr }));

  return (
    <ScreenContainer scrollable>
      <ProfileHeader
        firstName={p.first_name}
        lastName={p.last_name}
        pronounDisplay={pronounDisplay}
        avatarUrl={p.avatar_url}
        highestElo={highestElo}
        pinned={pinned}
        editable
        onAvatarPress={() => router.push('/profile/edit')}
        onPinnedEditPress={() => router.push('/profile/edit?openPin=1')}
        onEditProfilePress={() => router.push('/profile/edit')}
        belowName={belowName}
      />
      <ProfileTabs active={tab} onChange={setTab} />
      <TabContent tabKey={tab} myUserId={userId} />
    </ScreenContainer>
  );
}

function TabContent({ tabKey, myUserId }: { tabKey: ProfileTabKey; myUserId: string }) {
  if (tabKey === 'rankings') {
    const RankingsTab = require('../../components/profile/RankingsTab').RankingsTab;
    return <RankingsTab userId={myUserId} />;
  }
  if (tabKey === 'stats') {
    const StatsTab = require('../../components/profile/StatsTab').StatsTab;
    return <StatsTab userId={myUserId} isSelf />;
  }
  if (tabKey === 'badges') {
    const BadgesTab = require('../../components/profile/BadgesTab').BadgesTab;
    return <BadgesTab userId={myUserId} />;
  }
  if (tabKey === 'elo') {
    const EloHistoryTab = require('../../components/profile/EloHistoryTab').EloHistoryTab;
    return <EloHistoryTab userId={myUserId} />;
  }
  return <MatchesTab myUserId={myUserId} />;
}

function classYearLabel(v: string): string {
  const map: Record<string, string> = {
    hazirlik: 'Hazırlık', '1': '1. sınıf', '2': '2. sınıf', '3': '3. sınıf',
    '4': '4. sınıf', yl: 'Yüksek Lisans', doktora: 'Doktora',
  };
  return map[v] ?? v;
}
```

The lazy `require` calls let us stage the new tab components incrementally; later tasks add each component and the tabs light up immediately.

- [ ] **Step 9: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/lib/query-keys.ts apps/mobile/hooks/use-profile.ts \
  apps/mobile/components/profile apps/mobile/app/\(app\)/profile.tsx
git commit -m "feat(mobile): restructure profile into header + 5-tab layout"
```

---

### Task 5: Rankings tab + hook + RPC

**Files:**
- Create: `packages/supabase/migrations/20260608000003_rankings_rpc.sql`
- Create: `apps/mobile/hooks/use-my-rankings.ts`
- Create: `apps/mobile/components/profile/RankingsTab.tsx`

- [ ] **Step 1: Add the rankings RPC migration**

```sql
-- Returns per-category ELO + rank for the given profile.
-- Rank is computed using window function across all elo_ratings rows in that category.
create or replace function public.get_user_rankings(target_user_id uuid)
returns table (
  category text,
  rating integer,
  matches_played integer,
  rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      profile_id,
      category::text as category,
      rating,
      matches_played,
      rank() over (partition by category order by rating desc) as rank
    from public.elo_ratings
  )
  select category, rating, matches_played, rank
  from ranked
  where profile_id = target_user_id
  order by rating desc;
$$;

grant execute on function public.get_user_rankings(uuid) to authenticated;
```

- [ ] **Step 2: Apply + verify**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select * from public.get_user_rankings('00000000-0000-0000-0000-000000000000');"
```

Expected: returns 0 rows without error (function exists).

- [ ] **Step 3: Create `use-my-rankings.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface RankingRow {
  category: string;
  rating: number;
  matches_played: number;
  rank: number;
}

export function useMyRankings() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<RankingRow[]>({
    queryKey: queryKeys.rankings.mine(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_user_rankings', { target_user_id: userId });
      if (error) throw error;
      return (data ?? []) as RankingRow[];
    },
    enabled: !!userId,
  });
}

export function useUserRankings(targetUserId: string | undefined) {
  return useQuery<RankingRow[]>({
    queryKey: queryKeys.rankings.forUser(targetUserId ?? ''),
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase.rpc('get_user_rankings', { target_user_id: targetUserId });
      if (error) throw error;
      return (data ?? []) as RankingRow[];
    },
    enabled: !!targetUserId,
  });
}
```

- [ ] **Step 4: Create `RankingsTab.tsx`**

```typescript
import { Text, View } from 'react-native';
import { useUserRankings } from '../../hooks/use-my-rankings';

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

export function RankingsTab({ userId }: Props) {
  const { data, isLoading } = useUserRankings(userId);
  if (isLoading) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }
  const list = data ?? [];
  if (list.length === 0) {
    return (
      <Text className="mt-4 text-sm text-gray-500">
        Henüz hiçbir kategoride sıralaman yok.
      </Text>
    );
  }
  return (
    <View className="mt-4 gap-2">
      {list.map((r) => (
        <View
          key={r.category}
          className="flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
        >
          <Text className="text-base text-gray-900">
            {CATEGORY_LABELS[r.category] ?? r.category}
          </Text>
          <View className="flex-row items-baseline">
            <Text className="text-base font-semibold text-gray-900">{r.rating}</Text>
            <Text className="ml-2 text-sm text-gray-500">#{r.rank}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/migrations/20260608000003_rankings_rpc.sql \
  apps/mobile/hooks/use-my-rankings.ts \
  apps/mobile/components/profile/RankingsTab.tsx
git commit -m "feat(mobile): add Rankings tab + get_user_rankings RPC"
```

---

### Task 6: Stats tab + hook

**Files:**
- Create: `apps/mobile/hooks/use-my-stats.ts`
- Create: `apps/mobile/components/profile/StatsTab.tsx`

- [ ] **Step 1: Create `use-my-stats.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface PlayerStats {
  totalMatches: number;
  ratedWins: number;
  ratedLosses: number;
  winPct: number;
  currentStreak: number;
  mostPlayedFormat: string | null;
  mostPlayedCourt: string | null;
  mostFacedOpponent: { name: string; matches: number } | null;
}

interface MatchSlim {
  id: string;
  format: string;
  is_rated: boolean;
  status: string;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  winner_team: 'a' | 'b' | 'void' | null;
  played_at: string;
  court: { name: string } | null;
}

export function useUserStats(userId: string | undefined, includePrivate: boolean) {
  return useQuery<PlayerStats>({
    queryKey: includePrivate
      ? queryKeys.stats.mine()
      : queryKeys.stats.forUser(userId ?? ''),
    queryFn: async () => {
      if (!userId) return EMPTY_STATS;
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, format, is_rated, status,
          team_a_player_ids, team_b_player_ids,
          winner_team, played_at,
          court:courts(name)
        `)
        .in('status', ['confirmed', 'voided'])
        .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`)
        .order('played_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const matches = ((data ?? []) as unknown) as MatchSlim[];

      let opponentName: { name: string; matches: number } | null = null;
      if (includePrivate) {
        const opponentIds = new Map<string, number>();
        for (const m of matches) {
          const onA = m.team_a_player_ids.includes(userId);
          const opps = onA ? m.team_b_player_ids : m.team_a_player_ids;
          for (const o of opps) opponentIds.set(o, (opponentIds.get(o) ?? 0) + 1);
        }
        if (opponentIds.size > 0) {
          const [topId, topCount] = [...opponentIds.entries()].sort((a, b) => b[1] - a[1])[0];
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', topId)
            .maybeSingle();
          opponentName = profile
            ? { name: `${profile.first_name} ${profile.last_name}`, matches: topCount }
            : null;
        }
      }

      return computeStats(matches, userId, opponentName);
    },
    enabled: !!userId,
  });
}

const EMPTY_STATS: PlayerStats = {
  totalMatches: 0,
  ratedWins: 0,
  ratedLosses: 0,
  winPct: 0,
  currentStreak: 0,
  mostPlayedFormat: null,
  mostPlayedCourt: null,
  mostFacedOpponent: null,
};

const FORMAT_LABELS: Record<string, string> = {
  bu_klasik: 'BÜ Klasik',
  hizli_tiebreak: 'Hızlı Tiebreak',
  pro_set_8: 'Pro Set 8',
  '3set_klasik': '3 Set Klasik',
};

function computeStats(
  matches: MatchSlim[],
  userId: string,
  opponent: { name: string; matches: number } | null,
): PlayerStats {
  let ratedWins = 0;
  let ratedLosses = 0;
  const formats = new Map<string, number>();
  const courts = new Map<string, number>();

  for (const m of matches) {
    const onA = m.team_a_player_ids.includes(userId);
    formats.set(m.format, (formats.get(m.format) ?? 0) + 1);
    const courtName = m.court?.name;
    if (courtName) courts.set(courtName, (courts.get(courtName) ?? 0) + 1);
    if (m.is_rated && m.winner_team !== 'void') {
      const won = (onA && m.winner_team === 'a') || (!onA && m.winner_team === 'b');
      if (won) ratedWins += 1;
      else ratedLosses += 1;
    }
  }

  const ratedTotal = ratedWins + ratedLosses;
  const winPct = ratedTotal === 0 ? 0 : Math.round((ratedWins / ratedTotal) * 100);

  let currentStreak = 0;
  for (const m of matches) {
    if (!m.is_rated || m.winner_team === 'void') continue;
    const onA = m.team_a_player_ids.includes(userId);
    const won = (onA && m.winner_team === 'a') || (!onA && m.winner_team === 'b');
    if (won) currentStreak += 1;
    else break;
  }

  return {
    totalMatches: matches.length,
    ratedWins,
    ratedLosses,
    winPct,
    currentStreak,
    mostPlayedFormat: topKey(formats, (k) => FORMAT_LABELS[k] ?? k),
    mostPlayedCourt: topKey(courts),
    mostFacedOpponent: opponent,
  };
}

function topKey(map: Map<string, number>, transform?: (k: string) => string): string | null {
  if (map.size === 0) return null;
  const [key] = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  return transform ? transform(key) : key;
}
```

- [ ] **Step 2: Create `StatsTab.tsx`**

```typescript
import { Text, View } from 'react-native';
import { useUserStats } from '../../hooks/use-my-stats';

interface Props {
  userId: string;
  isSelf?: boolean;
}

export function StatsTab({ userId, isSelf = false }: Props) {
  const { data, isLoading } = useUserStats(userId, isSelf);
  if (isLoading || !data) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }

  return (
    <View className="mt-4 gap-2">
      <Row label="Toplam maç" value={String(data.totalMatches)} />
      <Row label="Sıralama maçı W-L" value={`${data.ratedWins} - ${data.ratedLosses}`} />
      <Row label="Galibiyet oranı" value={`%${data.winPct}`} />
      <Row label="Mevcut galibiyet serisi" value={String(data.currentStreak)} />
      <Row label="En sık format" value={data.mostPlayedFormat ?? '—'} />
      <Row label="En sık kort" value={data.mostPlayedCourt ?? '—'} />
      {isSelf && (
        <Row
          label="En sık rakip"
          value={
            data.mostFacedOpponent
              ? `${data.mostFacedOpponent.name} (${data.mostFacedOpponent.matches} maç)`
              : '—'
          }
        />
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
      <Text className="text-sm text-gray-600">{label}</Text>
      <Text className="text-base font-semibold text-gray-900">{value}</Text>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-my-stats.ts apps/mobile/components/profile/StatsTab.tsx
git commit -m "feat(mobile): add Stats tab with rated W/L, streak, top format/court/opponent"
```

---

## Phase C — Badges UI

### Task 7: Badge queries

**Files:**
- Create: `apps/mobile/hooks/use-all-badges.ts`
- Create: `apps/mobile/hooks/use-my-badges.ts`

- [ ] **Step 1: Create `use-all-badges.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface BadgeCatalogRow {
  id: string;
  code: string;
  name_tr: string;
  description_tr: string;
  icon: string;
  category: 'milestone' | 'win' | 'social' | 'season' | 'fun' | 'loyalty' | 'yearly';
  is_seasonal: boolean;
  display_order: number;
}

export function useAllBadges() {
  return useQuery<BadgeCatalogRow[]>({
    queryKey: queryKeys.badges.catalog(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('id, code, name_tr, description_tr, icon, category, is_seasonal, display_order')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BadgeCatalogRow[];
    },
    staleTime: 1000 * 60 * 60,
  });
}
```

- [ ] **Step 2: Create `use-my-badges.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface MyBadgeRow {
  user_badge_id: string;
  badge_id: string;
  code: string;
  name_tr: string;
  description_tr: string;
  icon: string;
  category: string;
  earned_at: string;
  pinned_at: string | null;
  season_id: string | null;
}

export function useMyBadges() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<MyBadgeRow[]>({
    queryKey: queryKeys.badges.mine(),
    queryFn: () => fetchUserBadges(userId),
    enabled: !!userId,
  });
}

export function useUserBadges(targetUserId: string | undefined) {
  return useQuery<MyBadgeRow[]>({
    queryKey: queryKeys.badges.forUser(targetUserId ?? ''),
    queryFn: () => fetchUserBadges(targetUserId),
    enabled: !!targetUserId,
  });
}

async function fetchUserBadges(userId: string | undefined): Promise<MyBadgeRow[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('user_badges')
    .select(`
      id, badge_id, earned_at, pinned_at, season_id,
      badge:badges(code, name_tr, description_tr, icon, category)
    `)
    .eq('profile_id', userId)
    .order('earned_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawRow[]).map((r) => ({
    user_badge_id: r.id,
    badge_id: r.badge_id,
    earned_at: r.earned_at,
    pinned_at: r.pinned_at,
    season_id: r.season_id,
    code: r.badge?.code ?? '',
    name_tr: r.badge?.name_tr ?? '',
    description_tr: r.badge?.description_tr ?? '',
    icon: r.badge?.icon ?? '🏷️',
    category: r.badge?.category ?? 'milestone',
  }));
}

interface RawRow {
  id: string;
  badge_id: string;
  earned_at: string;
  pinned_at: string | null;
  season_id: string | null;
  badge: {
    code: string;
    name_tr: string;
    description_tr: string;
    icon: string;
    category: string;
  } | null;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-all-badges.ts apps/mobile/hooks/use-my-badges.ts
git commit -m "feat(mobile): add useAllBadges + useMyBadges/useUserBadges queries"
```

---

### Task 8: BadgesTab + BadgeCard

**Files:**
- Create: `apps/mobile/components/profile/BadgeCard.tsx`
- Create: `apps/mobile/components/profile/BadgesTab.tsx`

- [ ] **Step 1: Create `BadgeCard.tsx`**

```typescript
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

interface Props {
  icon: string;
  name_tr: string;
  description_tr: string;
  earned: boolean;
}

export function BadgeCard({ icon, name_tr, description_tr, earned }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={`m-1 h-20 w-20 items-center justify-center rounded-lg border ${
          earned ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-gray-50'
        } active:opacity-80`}
      >
        <Text className={`text-3xl ${earned ? '' : 'opacity-30'}`}>{icon}</Text>
        <Text
          className={`mt-1 text-center text-[10px] ${
            earned ? 'text-gray-900' : 'text-gray-400'
          }`}
          numberOfLines={1}
        >
          {name_tr}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} className="flex-1 items-center justify-center bg-black/50">
          <View className="mx-8 items-center rounded-2xl bg-white p-6">
            <Text className="text-5xl">{icon}</Text>
            <Text className="mt-3 text-lg font-bold text-gray-900">{name_tr}</Text>
            <Text className="mt-2 text-center text-sm text-gray-600">{description_tr}</Text>
            <Text className={`mt-3 text-xs ${earned ? 'text-green-700' : 'text-gray-400'}`}>
              {earned ? 'Kazanıldı' : 'Henüz kazanılmadı'}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Create `BadgesTab.tsx`**

```typescript
import { Text, View } from 'react-native';
import { useAllBadges, type BadgeCatalogRow } from '../../hooks/use-all-badges';
import { useUserBadges } from '../../hooks/use-my-badges';
import { BadgeCard } from './BadgeCard';

const CATEGORY_LABELS: Record<string, string> = {
  milestone: 'Kilometre Taşları',
  win: 'Galibiyet',
  social: 'Sosyal',
  season: 'Sezon',
  yearly: 'Yıllık',
  fun: 'Eğlenceli',
  loyalty: 'Sadakat',
};

const CATEGORY_ORDER = ['milestone', 'win', 'social', 'season', 'yearly', 'fun', 'loyalty'] as const;

interface Props {
  userId: string;
}

export function BadgesTab({ userId }: Props) {
  const catalog = useAllBadges();
  const owned = useUserBadges(userId);

  if (catalog.isLoading || owned.isLoading) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }

  const earnedIds = new Set((owned.data ?? []).map((b) => b.badge_id));
  const byCategory = new Map<string, BadgeCatalogRow[]>();
  for (const b of catalog.data ?? []) {
    const list = byCategory.get(b.category) ?? [];
    list.push(b);
    byCategory.set(b.category, list);
  }

  return (
    <View className="mt-4">
      {CATEGORY_ORDER.map((cat) => {
        const list = byCategory.get(cat) ?? [];
        if (list.length === 0) return null;
        return (
          <View key={cat} className="mb-4">
            <Text className="mb-2 text-base font-semibold text-gray-900">
              {CATEGORY_LABELS[cat] ?? cat}
            </Text>
            <View className="flex-row flex-wrap">
              {list.map((b) => (
                <BadgeCard
                  key={b.id}
                  icon={b.icon}
                  name_tr={b.name_tr}
                  description_tr={b.description_tr}
                  earned={earnedIds.has(b.id)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/components/profile/BadgeCard.tsx apps/mobile/components/profile/BadgesTab.tsx
git commit -m "feat(mobile): add BadgesTab grid with grouped BadgeCard + how-to modal"
```

---

### Task 9: PinBadgeModal + pin mutation + migration

**Files:**
- Create: `packages/supabase/migrations/20260608000002_user_badges_pin.sql`
- Create: `apps/mobile/hooks/use-pin-badges.ts`
- Create: `apps/mobile/components/profile/PinBadgeModal.tsx`

- [ ] **Step 1: Add `pinned_at` migration**

```sql
alter table public.user_badges
  add column if not exists pinned_at timestamptz;

create index if not exists user_badges_profile_pinned_idx
  on public.user_badges (profile_id, pinned_at)
  where pinned_at is not null;

-- Allow users to update pinned_at on their own user_badges rows.
create policy "Users can pin/unpin own badges"
  on public.user_badges for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
```

- [ ] **Step 2: Apply + verify**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d public.user_badges"
```

Expected: column `pinned_at timestamptz` present.

- [ ] **Step 3: Create `use-pin-badges.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export function usePinBadges() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { selectedBadgeIds: string[] }) => {
      if (!userId) throw new Error('Oturum bulunamadı');
      if (input.selectedBadgeIds.length > 3) {
        throw new Error('En fazla 3 rozet seçebilirsin');
      }
      const now = new Date().toISOString();

      const { error: clearErr } = await supabase
        .from('user_badges')
        .update({ pinned_at: null })
        .eq('profile_id', userId)
        .not('pinned_at', 'is', null);
      if (clearErr) throw clearErr;

      if (input.selectedBadgeIds.length > 0) {
        const { error: setErr } = await supabase
          .from('user_badges')
          .update({ pinned_at: now })
          .eq('profile_id', userId)
          .in('badge_id', input.selectedBadgeIds);
        if (setErr) throw setErr;
      }

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ pinned_badge_ids: input.selectedBadgeIds })
        .eq('user_id', userId);
      if (profileErr) throw profileErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.badges.mine() });
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
```

- [ ] **Step 4: Create `PinBadgeModal.tsx`**

```typescript
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useMyBadges } from '../../hooks/use-my-badges';
import { usePinBadges } from '../../hooks/use-pin-badges';
import { Button } from '../ui/Button';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PinBadgeModal({ visible, onClose }: Props) {
  const { data: badges } = useMyBadges();
  const mutation = usePinBadges();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    const current = (badges ?? []).filter((b) => b.pinned_at).map((b) => b.badge_id);
    setSelected(new Set(current));
  }, [visible, badges]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const save = async () => {
    await mutation.mutateAsync({ selectedBadgeIds: [...selected] });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white p-6">
        <Text className="text-xl font-bold text-gray-900">Vitrin Rozetleri</Text>
        <Text className="mt-1 text-sm text-gray-500">En fazla 3 rozet seçebilirsin.</Text>
        <ScrollView className="mt-4 flex-1">
          {(badges ?? []).length === 0 ? (
            <Text className="mt-4 text-gray-500">Henüz hiç rozet kazanmadın.</Text>
          ) : (
            <View className="flex-row flex-wrap">
              {(badges ?? []).map((b) => {
                const isSelected = selected.has(b.badge_id);
                return (
                  <Pressable
                    key={b.user_badge_id}
                    onPress={() => toggle(b.badge_id)}
                    className={`m-1 h-20 w-20 items-center justify-center rounded-lg border ${
                      isSelected ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text className="text-3xl">{b.icon}</Text>
                    <Text className="mt-1 text-center text-[10px] text-gray-700" numberOfLines={1}>
                      {b.name_tr}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
        <View className="mt-4 gap-2">
          <Button onPress={save} loading={mutation.isPending}>Kaydet</Button>
          <Button onPress={onClose} variant="ghost">İptal</Button>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 5: Wire PinBadgeModal into ProfileHeader's pinned tap**

Edit `apps/mobile/app/(app)/profile.tsx`. Replace its full content with:

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { MatchesTab } from '../../components/profile/MatchesTab';
import { PinBadgeModal } from '../../components/profile/PinBadgeModal';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileTabs, type ProfileTabKey } from '../../components/profile/ProfileTabs';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useMyBadges } from '../../hooks/use-my-badges';
import { useMyRankings } from '../../hooks/use-my-rankings';
import { useMyProfile } from '../../hooks/use-profile';
import { useAuthStore } from '../../stores/auth-store';

export default function ProfileScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<ProfileTabKey>('rankings');
  const [pinOpen, setPinOpen] = useState(false);
  const { data: p, isLoading } = useMyProfile();
  const rankings = useMyRankings();
  const myBadges = useMyBadges();

  if (isLoading || !p || !userId) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Yükleniyor...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const pronounDisplay = p.pronoun === 'other' ? p.pronoun_custom : p.pronoun;
  const dept = p.departments as { name: string }[] | { name: string } | null;
  const departmentName = Array.isArray(dept) ? dept[0]?.name : dept?.name;
  const belowName = [
    p.show_department && departmentName ? `@${departmentName}` : null,
    p.show_class_year && p.class_year ? classYearLabel(p.class_year) : null,
  ]
    .filter(Boolean)
    .join(' · ') || null;

  const highestElo = (rankings.data ?? []).reduce((m, r) => Math.max(m, r.rating), 0) || 1200;
  const pinned = (myBadges.data ?? [])
    .filter((b) => b.pinned_at)
    .map((b) => ({ id: b.badge_id, icon: b.icon, name_tr: b.name_tr }));

  return (
    <ScreenContainer scrollable>
      <ProfileHeader
        firstName={p.first_name}
        lastName={p.last_name}
        pronounDisplay={pronounDisplay}
        avatarUrl={p.avatar_url}
        highestElo={highestElo}
        pinned={pinned}
        editable
        onAvatarPress={() => router.push('/profile/edit')}
        onPinnedEditPress={() => setPinOpen(true)}
        onEditProfilePress={() => router.push('/profile/edit')}
        belowName={belowName}
      />
      <ProfileTabs active={tab} onChange={setTab} />
      <TabContent tabKey={tab} myUserId={userId} />
      <PinBadgeModal visible={pinOpen} onClose={() => setPinOpen(false)} />
    </ScreenContainer>
  );
}

function TabContent({ tabKey, myUserId }: { tabKey: ProfileTabKey; myUserId: string }) {
  if (tabKey === 'rankings') {
    const RankingsTab = require('../../components/profile/RankingsTab').RankingsTab;
    return <RankingsTab userId={myUserId} />;
  }
  if (tabKey === 'stats') {
    const StatsTab = require('../../components/profile/StatsTab').StatsTab;
    return <StatsTab userId={myUserId} isSelf />;
  }
  if (tabKey === 'badges') {
    const BadgesTab = require('../../components/profile/BadgesTab').BadgesTab;
    return <BadgesTab userId={myUserId} />;
  }
  if (tabKey === 'elo') {
    const EloHistoryTab = require('../../components/profile/EloHistoryTab').EloHistoryTab;
    return <EloHistoryTab userId={myUserId} />;
  }
  return <MatchesTab myUserId={myUserId} />;
}

function classYearLabel(v: string): string {
  const map: Record<string, string> = {
    hazirlik: 'Hazırlık', '1': '1. sınıf', '2': '2. sınıf', '3': '3. sınıf',
    '4': '4. sınıf', yl: 'Yüksek Lisans', doktora: 'Doktora',
  };
  return map[v] ?? v;
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/migrations/20260608000002_user_badges_pin.sql \
  apps/mobile/hooks/use-pin-badges.ts \
  apps/mobile/components/profile/PinBadgeModal.tsx \
  apps/mobile/app/\(app\)/profile.tsx
git commit -m "feat(mobile): add PinBadgeModal + pin mutation + user_badges.pinned_at"
```

---

## Phase D — ELO History chart

### Task 10: ELO history query

**Files:**
- Create: `apps/mobile/hooks/use-elo-history.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface EloPoint {
  matchId: string;
  played_at: string;
  elo: number;
}

export type EloHistoryByCategory = Record<string, EloPoint[]>;

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

export function useEloHistory(userId: string | undefined) {
  return useQuery<EloHistoryByCategory>({
    queryKey: userId ? queryKeys.eloHistory.forUser(userId) : queryKeys.eloHistory.all,
    queryFn: async () => {
      if (!userId) return {};
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
        .order('played_at', { ascending: true })
        .limit(100);
      if (error) throw error;

      const result: EloHistoryByCategory = {};
      for (const m of ((data ?? []) as unknown) as MatchRow[]) {
        const onA = m.team_a_player_ids.includes(userId);
        const eloAfter = onA ? m.rating_after_team_a : m.rating_after_team_b;
        if (eloAfter === null) continue;
        const list = result[m.category] ?? [];
        list.push({ matchId: m.id, played_at: m.played_at, elo: eloAfter });
        result[m.category] = list;
      }
      return result;
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-elo-history.ts
git commit -m "feat(mobile): add useEloHistory hook (per-category timeseries)"
```

---

### Task 11: SVG line chart component

**Files:**
- Modify: `apps/mobile/package.json` (via `bunx expo install react-native-svg`)
- Create: `apps/mobile/components/profile/EloHistoryChart.tsx`

- [ ] **Step 1: Install `react-native-svg`**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bunx expo install react-native-svg
```

- [ ] **Step 2: Create `EloHistoryChart.tsx`**

```typescript
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

export interface ChartPoint {
  matchId: string;
  played_at: string;
  elo: number;
}

interface Props {
  points: ChartPoint[];
  width?: number;
  height?: number;
  onPointPress?: (matchId: string) => void;
}

export function EloHistoryChart({ points, width = 320, height = 200, onPointPress }: Props) {
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

  const polylinePoints = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerH} stroke="#d1d5db" />
        <Line x1={padLeft} y1={padTop + innerH} x2={padLeft + innerW} y2={padTop + innerH} stroke="#d1d5db" />
        <SvgText x={4} y={padTop + 8} fontSize="10" fill="#6b7280">{maxElo}</SvgText>
        <SvgText x={4} y={padTop + innerH} fontSize="10" fill="#6b7280">{minElo}</SvgText>
        <Polyline points={polylinePoints} fill="none" stroke="#1e3a8a" strokeWidth={2} />
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

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/package.json apps/mobile/components/profile/EloHistoryChart.tsx
git commit -m "feat(mobile): add EloHistoryChart SVG polyline with tappable markers"
```

---

### Task 12: ELO History tab + summary card

**Files:**
- Create: `apps/mobile/components/profile/EloHistoryTab.tsx`

- [ ] **Step 1: Create the tab**

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
  const categories = Object.keys(data ?? {});
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const selected = activeCat ?? categories[0] ?? null;

  if (isLoading) {
    return <Text className="mt-4 text-sm text-gray-500">Yükleniyor...</Text>;
  }
  if (categories.length === 0 || !selected) {
    return <Text className="mt-4 text-sm text-gray-500">Henüz ELO geçmişi yok.</Text>;
  }

  const points = data?.[selected] ?? [];
  const peak = points.length > 0 ? Math.max(...points.map((p) => p.elo)) : 0;
  const current = points.length > 0 ? points[points.length - 1].elo : 0;
  const first = points.length > 0 ? points[0].elo : 0;
  const trend = current - first;
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

- [ ] **Step 2: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/components/profile/EloHistoryTab.tsx
git commit -m "feat(mobile): add EloHistoryTab with category selector + summary + chart"
```

---

## Phase E — Profile edit + Avatar

### Task 13: Edit profile route + screen + mutation

**Files:**
- Create: `apps/mobile/app/profile/_layout.tsx`
- Create: `apps/mobile/app/profile/edit.tsx`
- Create: `apps/mobile/hooks/use-update-profile.ts`

- [ ] **Step 1: Create `profile/_layout.tsx`**

```typescript
import { Stack } from 'expo-router';

export default function ProfileStack() {
  return (
    <Stack>
      <Stack.Screen name="edit" options={{ title: 'Profili Düzenle' }} />
    </Stack>
  );
}
```

- [ ] **Step 2: Create `use-update-profile.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export interface UpdateProfileInput {
  first_name: string;
  last_name: string;
  pronoun: 'he/him' | 'she/her' | 'they/them' | 'other';
  pronoun_custom?: string | null;
  department_id?: string | null;
  show_department: boolean;
  class_year: 'hazirlik' | '1' | '2' | '3' | '4' | 'yl' | 'doktora';
  show_class_year: boolean;
  skill_self_assessment: 'baslangic' | 'orta' | 'ileri';
  dominant_hand: 'sag' | 'sol';
  availability_windows: string[];
  gender_category?: 'erkek' | 'kadin' | 'open_only';
}

export function useUpdateProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!userId) throw new Error('Oturum bulunamadı');
      const { error } = await supabase.from('profiles').update(input).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
```

- [ ] **Step 3: Create `profile/edit.tsx`**

```typescript
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { useUpdateProfile, type UpdateProfileInput } from '../../hooks/use-update-profile';
import { useMyProfile } from '../../hooks/use-profile';

const PRONOUN_OPTIONS = [
  { value: 'he/him', label: 'he/him' },
  { value: 'she/her', label: 'she/her' },
  { value: 'they/them', label: 'they/them' },
  { value: 'other', label: 'other' },
] as const;

const CLASS_OPTIONS = [
  { value: 'hazirlik', label: 'Hazırlık' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: 'yl', label: 'YL' },
  { value: 'doktora', label: 'Doktora' },
] as const;

const SKILL_OPTIONS = [
  { value: 'baslangic', label: 'Başlangıç' },
  { value: 'orta', label: 'Orta' },
  { value: 'ileri', label: 'İleri' },
] as const;

const HAND_OPTIONS = [
  { value: 'sag', label: 'Sağ' },
  { value: 'sol', label: 'Sol' },
] as const;

const GENDER_OPTIONS = [
  { value: 'erkek', label: 'Erkek' },
  { value: 'kadin', label: 'Kadın' },
  { value: 'open_only', label: 'Sadece Open' },
] as const;

const AVAILABILITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'weekday_morning', label: 'Hafta içi sabah' },
  { value: 'weekday_noon', label: 'Hafta içi öğlen' },
  { value: 'weekday_evening', label: 'Hafta içi akşam' },
  { value: 'weekend_morning', label: 'Hafta sonu sabah' },
  { value: 'weekend_noon', label: 'Hafta sonu öğlen' },
  { value: 'weekend_evening', label: 'Hafta sonu akşam' },
];

export default function EditProfileScreen() {
  const { data: p, isLoading } = useMyProfile();
  const mutation = useUpdateProfile();
  const [form, setForm] = useState<UpdateProfileInput | null>(null);

  useEffect(() => {
    if (!p) return;
    setForm({
      first_name: p.first_name,
      last_name: p.last_name,
      pronoun: p.pronoun,
      pronoun_custom: p.pronoun_custom ?? null,
      department_id: p.department_id ?? null,
      show_department: p.show_department,
      class_year: p.class_year,
      show_class_year: p.show_class_year,
      skill_self_assessment: p.skill_self_assessment,
      dominant_hand: p.dominant_hand,
      availability_windows: p.availability_windows ?? [],
      gender_category: p.gender_category,
    });
  }, [p]);

  if (isLoading || !form) {
    return (
      <ScreenContainer>
        <Text className="text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }

  const update = <K extends keyof UpdateProfileInput>(key: K, value: UpdateProfileInput[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const onChangeGender = (next: UpdateProfileInput['gender_category']) => {
    if (next === form.gender_category) return;
    Alert.alert(
      'Kategori değişikliği',
      'Yarışma kategorisini değiştirmek istediğinden emin misin? Yeni kategorideki ELO''n 1200''den başlar.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Değiştir', style: 'destructive', onPress: () => update('gender_category', next) },
      ],
    );
  };

  const onSave = async () => {
    try {
      await mutation.mutateAsync(form);
      router.back();
    } catch (e) {
      Alert.alert('Hata', (e as Error).message);
    }
  };

  const toggleAvailability = (val: string) => {
    const next = form.availability_windows.includes(val)
      ? form.availability_windows.filter((v) => v !== val)
      : [...form.availability_windows, val];
    update('availability_windows', next);
  };

  return (
    <ScreenContainer scrollable>
      <TextField
        label="Ad"
        value={form.first_name}
        onChangeText={(v) => update('first_name', v)}
      />
      <TextField
        label="Soyad"
        value={form.last_name}
        onChangeText={(v) => update('last_name', v)}
      />

      <Text className="mb-1 text-sm font-medium text-gray-700">Pronoun</Text>
      <RadioGroup
        options={PRONOUN_OPTIONS as unknown as { value: string; label: string }[]}
        value={form.pronoun}
        onChange={(v) => update('pronoun', v as UpdateProfileInput['pronoun'])}
      />
      {form.pronoun === 'other' && (
        <TextField
          label="Özel"
          value={form.pronoun_custom ?? ''}
          onChangeText={(v) => update('pronoun_custom', v)}
        />
      )}

      <ToggleRow
        label="Bölümü profilde göster"
        value={form.show_department}
        onChange={(v) => update('show_department', v)}
      />
      <ToggleRow
        label="Sınıfı profilde göster"
        value={form.show_class_year}
        onChange={(v) => update('show_class_year', v)}
      />

      <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">Sınıf</Text>
      <RadioGroup
        options={CLASS_OPTIONS as unknown as { value: string; label: string }[]}
        value={form.class_year}
        onChange={(v) => update('class_year', v as UpdateProfileInput['class_year'])}
      />

      <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">Seviye</Text>
      <RadioGroup
        options={SKILL_OPTIONS as unknown as { value: string; label: string }[]}
        value={form.skill_self_assessment}
        onChange={(v) =>
          update('skill_self_assessment', v as UpdateProfileInput['skill_self_assessment'])
        }
      />

      <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">Dominant el</Text>
      <RadioGroup
        options={HAND_OPTIONS as unknown as { value: string; label: string }[]}
        value={form.dominant_hand}
        onChange={(v) => update('dominant_hand', v as UpdateProfileInput['dominant_hand'])}
      />

      <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">Yarışma kategorisi</Text>
      <RadioGroup
        options={GENDER_OPTIONS as unknown as { value: string; label: string }[]}
        value={form.gender_category ?? 'erkek'}
        onChange={(v) => onChangeGender(v as UpdateProfileInput['gender_category'])}
      />

      <Text className="mb-1 mt-3 text-sm font-medium text-gray-700">Müsaitlik</Text>
      {AVAILABILITY_OPTIONS.map((a) => (
        <ToggleRow
          key={a.value}
          label={a.label}
          value={form.availability_windows.includes(a.value)}
          onChange={() => toggleAvailability(a.value)}
        />
      ))}

      <View className="mt-6 gap-2">
        <Button onPress={onSave} loading={mutation.isPending}>Kaydet</Button>
        <Button variant="ghost" onPress={() => router.back()}>İptal</Button>
      </View>
    </ScreenContainer>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
      <Text className="text-sm text-gray-900">{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/app/profile apps/mobile/hooks/use-update-profile.ts
git commit -m "feat(mobile): add profile edit screen + update mutation with gender_category guard"
```

---

### Task 14: Avatar picker + upload + bucket migration

**Files:**
- Create: `packages/supabase/migrations/20260608000004_avatars_bucket.sql`
- Create: `apps/mobile/components/profile/AvatarPicker.tsx`
- Create: `apps/mobile/hooks/use-upload-avatar.ts`
- Modify: `apps/mobile/app/(app)/profile.tsx` (wire avatar press to picker)

- [ ] **Step 1: Add the Storage bucket migration**

```sql
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public read avatars"
  on storage.objects for select
  to authenticated, anon
  using (bucket_id = 'avatars');

create policy "Users upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) = auth.uid()::text
  );

create policy "Users update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) = auth.uid()::text
  );

create policy "Users delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) = auth.uid()::text
  );
```

- [ ] **Step 2: Apply + verify**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select id, public from storage.buckets where id = 'avatars';"
```

Expected: 1 row, public = t.

- [ ] **Step 3: Create `use-upload-avatar.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export function useUploadAvatar() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { localUri: string }) => {
      if (!userId) throw new Error('Oturum bulunamadı');
      const fileName = `${userId}.jpg`;
      const base64 = await FileSystem.readAsStringAsync(input.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadErr) throw uploadErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const cacheBustedUrl = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('user_id', userId);
      if (profileErr) throw profileErr;
      return { url: cacheBustedUrl };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
```

- [ ] **Step 4: Create `AvatarPicker.tsx`**

```typescript
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export async function pickAvatar(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('İzin gerekli', 'Avatar seçebilmek için galeri erişimi vermelisin.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: false,
  });
  if (res.canceled || res.assets.length === 0) return null;
  return res.assets[0].uri;
}
```

- [ ] **Step 5: Wire avatar press in `profile.tsx`**

Edit `apps/mobile/app/(app)/profile.tsx`. Find the `onAvatarPress={() => router.push('/profile/edit')}` line and replace it with `onAvatarPress={onAvatarPress}`. Then ADD these imports and helper just above `export default function ProfileScreen`:

```typescript
import { Alert } from 'react-native';
import { pickAvatar } from '../../components/profile/AvatarPicker';
import { useUploadAvatar } from '../../hooks/use-upload-avatar';
```

INSIDE `ProfileScreen()` after the existing `const myBadges = useMyBadges();` line, ADD:

```typescript
  const uploadAvatar = useUploadAvatar();

  const onAvatarPress = async () => {
    const uri = await pickAvatar();
    if (!uri) return;
    try {
      await uploadAvatar.mutateAsync({ localUri: uri });
    } catch (e) {
      Alert.alert('Hata', (e as Error).message);
    }
  };
```

- [ ] **Step 6: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add packages/supabase/migrations/20260608000004_avatars_bucket.sql \
  apps/mobile/components/profile/AvatarPicker.tsx \
  apps/mobile/hooks/use-upload-avatar.ts \
  apps/mobile/app/\(app\)/profile.tsx
git commit -m "feat(mobile): add avatar picker + Storage upload + avatars bucket"
```

---

## Phase F — Other player profile

### Task 15: Other player profile query

**Files:**
- Create: `apps/mobile/hooks/use-other-player-profile.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface OtherPlayerProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  pronoun: 'he/him' | 'she/her' | 'they/them' | 'other';
  pronoun_custom: string | null;
  gender_category: 'erkek' | 'kadin' | 'open_only';
  avatar_url: string | null;
  pinned_badge_ids: string[];
  status: string;
  show_department: boolean;
  show_class_year: boolean;
  class_year: string | null;
  departments: { name: string } | { name: string }[] | null;
}

export function useOtherPlayerProfile(userId: string | undefined) {
  return useQuery<OtherPlayerProfile | null>({
    queryKey: userId ? queryKeys.players.detail(userId) : ['players', 'detail', ''],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id, first_name, last_name, pronoun, pronoun_custom,
          gender_category, avatar_url, pinned_badge_ids, status,
          show_department, show_class_year, class_year,
          departments:departments(name)
        `)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OtherPlayerProfile | null;
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-other-player-profile.ts
git commit -m "feat(mobile): add useOtherPlayerProfile query (no phone/email)"
```

---

### Task 16: Other player profile screen

**Files:**
- Create: `apps/mobile/app/user/[userId].tsx`

- [ ] **Step 1: Create the screen**

```typescript
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { MatchesTab } from '../../components/profile/MatchesTab';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import {
  ProfileTabs,
  type ProfileTabKey,
} from '../../components/profile/ProfileTabs';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useUserBadges } from '../../hooks/use-my-badges';
import { useUserRankings } from '../../hooks/use-my-rankings';
import { useOtherPlayerProfile } from '../../hooks/use-other-player-profile';
import { useMyProfile } from '../../hooks/use-profile';
import { HeadToHeadSummary } from '../../components/profile/HeadToHeadSummary';

export default function OtherPlayerProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [tab, setTab] = useState<ProfileTabKey>('rankings');
  const { data: profile, isLoading } = useOtherPlayerProfile(userId);
  const { data: myProfile } = useMyProfile();
  const rankings = useUserRankings(userId);
  const badges = useUserBadges(userId);

  if (isLoading || !profile || !userId) {
    return (
      <ScreenContainer>
        <Text className="text-gray-500">Yükleniyor...</Text>
      </ScreenContainer>
    );
  }

  const pronounDisplay = profile.pronoun === 'other' ? profile.pronoun_custom : profile.pronoun;
  const dept = profile.departments as { name: string }[] | { name: string } | null;
  const departmentName = Array.isArray(dept) ? dept[0]?.name : dept?.name;
  const belowName = [
    profile.show_department && departmentName ? `@${departmentName}` : null,
    profile.show_class_year && profile.class_year ? classYearLabel(profile.class_year) : null,
  ]
    .filter(Boolean)
    .join(' · ') || null;

  const highestElo = (rankings.data ?? []).reduce((m, r) => Math.max(m, r.rating), 0) || 1200;
  const pinnedIds = profile.pinned_badge_ids ?? [];
  const pinned = (badges.data ?? [])
    .filter((b) => pinnedIds.includes(b.badge_id))
    .map((b) => ({ id: b.badge_id, icon: b.icon, name_tr: b.name_tr }));

  const canChallenge = canChallengeBetween(
    profile.gender_category,
    myProfile?.gender_category,
  );

  return (
    <ScreenContainer scrollable>
      <ProfileHeader
        firstName={profile.first_name}
        lastName={profile.last_name}
        pronounDisplay={pronounDisplay}
        avatarUrl={profile.avatar_url}
        highestElo={highestElo}
        pinned={pinned}
        editable={false}
        belowName={belowName}
      />

      {myProfile && myProfile.user_id !== userId && (
        <HeadToHeadSummary otherUserId={userId} />
      )}

      {canChallenge && myProfile && myProfile.user_id !== userId && (
        <View className="mt-3">
          <Button onPress={() => router.push(`/create-match?opponentId=${userId}`)}>
            Meydan Oku
          </Button>
        </View>
      )}

      <ProfileTabs
        active={tab}
        onChange={setTab}
        available={['rankings', 'stats', 'badges', 'elo', 'matches']}
      />
      <TabContent tabKey={tab} userId={userId} />
    </ScreenContainer>
  );
}

function TabContent({ tabKey, userId }: { tabKey: ProfileTabKey; userId: string }) {
  if (tabKey === 'rankings') {
    const RankingsTab = require('../../components/profile/RankingsTab').RankingsTab;
    return <RankingsTab userId={userId} />;
  }
  if (tabKey === 'stats') {
    const StatsTab = require('../../components/profile/StatsTab').StatsTab;
    return <StatsTab userId={userId} isSelf={false} />;
  }
  if (tabKey === 'badges') {
    const BadgesTab = require('../../components/profile/BadgesTab').BadgesTab;
    return <BadgesTab userId={userId} />;
  }
  if (tabKey === 'elo') {
    const EloHistoryTab = require('../../components/profile/EloHistoryTab').EloHistoryTab;
    return <EloHistoryTab userId={userId} />;
  }
  return <MatchesTab myUserId={userId} />;
}

function canChallengeBetween(
  target: 'erkek' | 'kadin' | 'open_only',
  mine: 'erkek' | 'kadin' | 'open_only' | undefined,
): boolean {
  if (!mine) return false;
  if (mine === 'open_only' || target === 'open_only') return true;
  return mine === target;
}

function classYearLabel(v: string): string {
  const map: Record<string, string> = {
    hazirlik: 'Hazırlık', '1': '1. sınıf', '2': '2. sınıf', '3': '3. sınıf',
    '4': '4. sınıf', yl: 'Yüksek Lisans', doktora: 'Doktora',
  };
  return map[v] ?? v;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/app/user
git commit -m "feat(mobile): add /user/[userId] other player profile screen"
```

---

### Task 17: Head-to-head summary

**Files:**
- Create: `apps/mobile/hooks/use-head-to-head.ts`
- Create: `apps/mobile/components/profile/HeadToHeadSummary.tsx`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface HeadToHead {
  totalMatches: number;
  myWins: number;
  theirWins: number;
}

export function useHeadToHead(otherUserId: string | undefined) {
  const myId = useAuthStore((s) => s.user?.id);
  return useQuery<HeadToHead>({
    queryKey: queryKeys.headToHead.between(otherUserId ?? ''),
    queryFn: async () => {
      if (!myId || !otherUserId) return { totalMatches: 0, myWins: 0, theirWins: 0 };
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, team_a_player_ids, team_b_player_ids, winner_team, status
        `)
        .in('status', ['confirmed', 'voided'])
        .or(
          `and(team_a_player_ids.cs.{${myId}},team_b_player_ids.cs.{${otherUserId}}),` +
            `and(team_a_player_ids.cs.{${otherUserId}},team_b_player_ids.cs.{${myId}})`,
        );
      if (error) throw error;

      let myWins = 0;
      let theirWins = 0;
      for (const m of data ?? []) {
        if (m.winner_team === 'void' || m.winner_team === null) continue;
        const onA = (m.team_a_player_ids as string[]).includes(myId);
        const iWon = (onA && m.winner_team === 'a') || (!onA && m.winner_team === 'b');
        if (iWon) myWins += 1;
        else theirWins += 1;
      }
      return {
        totalMatches: (data ?? []).length,
        myWins,
        theirWins,
      };
    },
    enabled: !!myId && !!otherUserId,
  });
}
```

- [ ] **Step 2: Create `HeadToHeadSummary.tsx`**

```typescript
import { Text, View } from 'react-native';
import { useHeadToHead } from '../../hooks/use-head-to-head';

interface Props {
  otherUserId: string;
}

export function HeadToHeadSummary({ otherUserId }: Props) {
  const { data } = useHeadToHead(otherUserId);
  if (!data || data.totalMatches === 0) return null;
  return (
    <View className="mt-4 rounded-lg border border-gray-200 bg-blue-50 p-3">
      <Text className="text-sm text-gray-700">
        Aranızda {data.totalMatches} maç: Sen {data.myWins} - O {data.theirWins}
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-head-to-head.ts apps/mobile/components/profile/HeadToHeadSummary.tsx
git commit -m "feat(mobile): add head-to-head summary card on other-player profile"
```

---

## Phase G — Badge unlock + Level-up modals

### Task 18: Celebration store + BadgeUnlockModal + LevelUpModal

**Files:**
- Create: `apps/mobile/stores/post-match-celebration-store.ts`
- Create: `apps/mobile/components/profile/BadgeUnlockModal.tsx`
- Create: `apps/mobile/components/profile/LevelUpModal.tsx`
- Create: `apps/mobile/components/profile/CelebrationMount.tsx`
- Modify: `apps/mobile/app/(app)/_layout.tsx`

- [ ] **Step 1: Create the store**

```typescript
import { create } from 'zustand';
import type { Level } from '@tennis/shared';

export interface AwardedBadgeView {
  id: string;
  code: string;
  name_tr: string;
  description_tr: string;
  icon: string;
}

export type CelebrationItem =
  | { kind: 'badge'; badge: AwardedBadgeView }
  | { kind: 'level'; before: Level; after: Level };

interface State {
  queue: CelebrationItem[];
  enqueue: (items: CelebrationItem[]) => void;
  popFront: () => void;
  clear: () => void;
}

export const useCelebrationStore = create<State>((set) => ({
  queue: [],
  enqueue: (items) => set((s) => ({ queue: [...s.queue, ...items] })),
  popFront: () => set((s) => ({ queue: s.queue.slice(1) })),
  clear: () => set({ queue: [] }),
}));
```

- [ ] **Step 2: Create `BadgeUnlockModal.tsx`**

```typescript
import { Modal, Text, View } from 'react-native';
import type { AwardedBadgeView } from '../../stores/post-match-celebration-store';
import { Button } from '../ui/Button';

interface Props {
  visible: boolean;
  badge: AwardedBadgeView;
  onClose: () => void;
}

export function BadgeUnlockModal({ visible, badge, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-8">
        <View className="w-full items-center rounded-2xl bg-white p-6">
          <Text className="text-xs font-semibold uppercase text-amber-600">
            Yeni Rozet
          </Text>
          <Text className="mt-2 text-6xl">{badge.icon}</Text>
          <Text className="mt-3 text-xl font-bold text-gray-900">{badge.name_tr}</Text>
          <Text className="mt-2 text-center text-sm text-gray-600">
            {badge.description_tr}
          </Text>
          <View className="mt-6 w-full">
            <Button onPress={onClose}>Tamam</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: Create `LevelUpModal.tsx`**

```typescript
import { Modal, Text, View } from 'react-native';
import type { Level } from '@tennis/shared';
import { Button } from '../ui/Button';

interface Props {
  visible: boolean;
  before: Level;
  after: Level;
  onClose: () => void;
}

export function LevelUpModal({ visible, before, after, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 p-8">
        <View className="w-full items-center rounded-2xl bg-white p-6">
          <Text className="text-xs font-semibold uppercase text-emerald-600">
            Yeni Seviye
          </Text>
          <Text className="mt-2 text-6xl">{after.icon}</Text>
          <Text className="mt-3 text-xl font-bold text-gray-900">{after.name_tr}</Text>
          <Text className="mt-2 text-center text-sm text-gray-600">
            {before.icon} {before.name_tr} → {after.icon} {after.name_tr}
          </Text>
          <View className="mt-6 w-full">
            <Button onPress={onClose}>Devam</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 4: Create `CelebrationMount.tsx`**

```typescript
import { useCelebrationStore } from '../../stores/post-match-celebration-store';
import { BadgeUnlockModal } from './BadgeUnlockModal';
import { LevelUpModal } from './LevelUpModal';

export function CelebrationMount() {
  const front = useCelebrationStore((s) => s.queue[0]);
  const popFront = useCelebrationStore((s) => s.popFront);

  if (!front) return null;

  if (front.kind === 'badge') {
    return (
      <BadgeUnlockModal
        visible
        badge={front.badge}
        onClose={popFront}
      />
    );
  }
  return (
    <LevelUpModal
      visible
      before={front.before}
      after={front.after}
      onClose={popFront}
    />
  );
}
```

- [ ] **Step 5: Mount it globally**

Edit `apps/mobile/app/(app)/_layout.tsx`. Replace its full contents with:

```typescript
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { CelebrationMount } from '../../components/profile/CelebrationMount';

export default function AppLayout() {
  return (
    <View className="flex-1">
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1e3a8a' }}>
        <Tabs.Screen
          name="matches"
          options={{
            title: 'Maçlar',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎾</Text>,
          }}
        />
        <Tabs.Screen
          name="open-calls"
          options={{
            title: 'İlanlar',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📢</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ayarlar',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>,
          }}
        />
        <Tabs.Screen name="home" options={{ href: null }} />
      </Tabs>
      <CelebrationMount />
    </View>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/stores/post-match-celebration-store.ts \
  apps/mobile/components/profile/BadgeUnlockModal.tsx \
  apps/mobile/components/profile/LevelUpModal.tsx \
  apps/mobile/components/profile/CelebrationMount.tsx \
  apps/mobile/app/\(app\)/_layout.tsx
git commit -m "feat(mobile): add celebration store + Badge/Level modals + global mount"
```

---

### Task 19: Wire post-confirm celebrations into `useConfirmMatch`

**Files:**
- Modify: `apps/mobile/hooks/use-confirm-match.ts`

- [ ] **Step 1: Replace `use-confirm-match.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getLevel, levelChanged } from '@tennis/shared';
import { invokeFunction } from '../lib/invoke-function';
import { queryKeys } from '../lib/query-keys';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';
import {
  useCelebrationStore,
  type AwardedBadgeView,
  type CelebrationItem,
} from '../stores/post-match-celebration-store';

interface AwardedPayload {
  userId: string;
  badges: AwardedBadgeView[];
}

export interface ConfirmMatchResponse {
  confirmed: boolean;
  status?: string;
  alreadyConfirmed?: boolean;
  awarded?: AwardedPayload[];
}

export function useConfirmMatch() {
  const qc = useQueryClient();
  const enqueue = useCelebrationStore((s) => s.enqueue);
  return useMutation({
    mutationFn: async (input: { matchId: string }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<ConfirmMatchResponse>('confirm-match', input, token);
    },
    onSuccess: async (data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.all });
      qc.invalidateQueries({ queryKey: queryKeys.activeMatches.detail(variables.matchId) });
      qc.invalidateQueries({ queryKey: queryKeys.matchHistory.all });
      qc.invalidateQueries({ queryKey: queryKeys.badges.mine() });
      qc.invalidateQueries({ queryKey: queryKeys.rankings.mine() });
      qc.invalidateQueries({ queryKey: queryKeys.eloHistory.all });

      if (!data.confirmed || data.status !== 'confirmed') return;

      const myId = useAuthStore.getState().user?.id;
      if (!myId) return;

      const items: CelebrationItem[] = [];

      const myAward = (data.awarded ?? []).find((a) => a.userId === myId);
      if (myAward) {
        for (const b of myAward.badges) {
          items.push({ kind: 'badge', badge: b });
        }
      }

      const change = await computeLevelChange(variables.matchId, myId);
      if (change) items.push({ kind: 'level', before: change.before, after: change.after });

      if (items.length > 0) enqueue(items);
    },
  });
}

async function computeLevelChange(
  matchId: string,
  userId: string,
): Promise<{ before: ReturnType<typeof getLevel>; after: ReturnType<typeof getLevel> } | null> {
  const { data: match } = await supabase
    .from('matches')
    .select(`
      team_a_player_ids, team_b_player_ids,
      rating_before_team_a, rating_after_team_a,
      rating_before_team_b, rating_after_team_b
    `)
    .eq('id', matchId)
    .maybeSingle();
  if (!match) return null;
  const onA = (match.team_a_player_ids as string[]).includes(userId);
  const before = onA ? match.rating_before_team_a : match.rating_before_team_b;
  const after = onA ? match.rating_after_team_a : match.rating_after_team_b;
  if (before === null || after === null) return null;
  const change = levelChanged(before, after);
  if (!change.up) return null;
  return { before: change.before, after: change.after };
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git add apps/mobile/hooks/use-confirm-match.ts
git commit -m "feat(mobile): queue badge unlock + level-up modals after match confirm"
```

---

## Phase H — End-to-end verification

### Task 20: iOS Simulator E2E

This task is verification only.

- [ ] **Step 1: Start backend stack**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase start
supabase db reset
supabase functions serve --no-verify-jwt &
```

- [ ] **Step 2: Update `.env.local` with current Supabase keys**

```bash
KEYS=$(supabase status --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321'); print(f'EXPO_PUBLIC_SUPABASE_ANON_KEY={d[\"ANON_KEY\"]}')")
echo "$KEYS" > /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile/.env.local
```

- [ ] **Step 3: Start Expo + open in Simulator**

```bash
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/apps/mobile
PATH=/Users/hazarustun/.bun/bin:$PATH /Users/hazarustun/.bun/bin/bunx expo start --host lan &
sleep 25
IP=$(ifconfig en0 | grep "inet " | awk '{print $2}' | head -1)
open -a /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app
xcrun simctl openurl booted "exp://$IP:8081"
```

- [ ] **Step 4: Manual verification**

Assumes Plan 4a + 4b flows can produce a confirmed match. If state is empty, first run Plan 4a's create+accept + Plan 4b's play+confirm flow as Alice and Bob.

As Alice (signed in):

1. Profil tab → header shows avatar/initials, name, LevelBadge (`🏃 Amatör` if ELO=1200), 3 empty pin slots
2. Tap "Profili Düzenle" → edit screen opens, fields pre-filled
3. Change pronoun custom + save → header reflects change
4. Tap avatar → image picker → choose photo → header updates within ~2s
5. Sıralamalar tab → shows at least 1 category with rank #1 (only player so far)
6. İstatistikler tab → totalMatches/winPct etc. populated
7. Rozetler tab → shows full catalog grayscale + "İlk Adım" + "İlk Galibiyet" colored (after winning Plan 4b match)
8. Tap a grayscale badge → modal shows "Henüz kazanılmadı"
9. ELO Geçmişi tab → category selector + summary card + chart with at least 1 point. Tap point → routes to match detail
10. Maçlar tab → previously moved history rows still render and link to /match/[id]
11. Tap pinned slot → PinBadgeModal → select up to 3 → Kaydet → header shows them

Run a second rated match (different format if possible) — at confirm:

12. Badge unlock modal appears (e.g., "Üçleme") with icon and description
13. Tap Tamam → next modal (level-up if applicable) or returns to flow

As Bob (sign out + in with second test account):

14. Tap Alice from match history opponent name (or navigate via /user/${aliceId}) → Other player profile
15. Header shows Alice but no "Profili Düzenle" button, no avatar tap
16. Head-to-head card "Aranızda N maç: Sen X - O Y"
17. "Meydan Oku" button visible when categories overlap
18. Stats tab does NOT show "En sık rakip" row

Verify backend:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select code, count(*) from public.badges group by code order by code limit 5;"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select profile_id, badge_id, earned_at, pinned_at from public.user_badges;"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select user_id, avatar_url, pinned_badge_ids from public.profiles where avatar_url is not null;"
```

Expected:
- `badges` count = 35
- `user_badges` has at least 2 rows (milestone_1_match + wins_1) after one rated win
- Some `user_badges.pinned_at` is non-null after PinBadgeModal save
- `profiles.avatar_url` matches `<...>/storage/v1/object/public/avatars/<userId>.jpg?t=...`

- [ ] **Step 5: Stop services + verification marker commit**

```bash
pkill -f "expo start" || true
pkill -f "supabase functions serve" || true
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger/packages/supabase
supabase stop
cd /Users/hazarustun/Desktop/VIBE\ CODING/tennis-challenger
git commit --allow-empty -m "test(mobile): verified Plan 5 end-to-end in iOS Simulator"
```

---

## Plan 5 Sonu

Bu plan tamamlandığında:

- **5-tab profil ekranı** Sıralamalar / İstatistikler / Rozetler / ELO Geçmişi / Maçlar
- **Header** avatar + ad + pronoun + LevelBadge + 3 pinned rozet + "Profili Düzenle"
- **Rozet kataloğu** seed migration ile 35 rozet (kilometre/galibiyet/sosyal/sezon/yıllık/eğlence/sadakat)
- **`getLevel` shared util** ELO eşiklerinden seviye + ikon türetir (Yeni Çekirge → Şampiyon)
- **`award-badges` Edge Function** `confirm-match` tarafından otomatik çağrılır; milestone/win/bagel/comeback değerlendirir, response'a awardedBadges ekler
- **ELO Geçmişi line chart** pure `react-native-svg`, kategori başına, peak/şu an/trend özet kartı
- **Profili düzenle** ekranı + avatar upload + kategori değişimi onay alertı
- **Başka oyuncu profili** `/user/[userId]` + head-to-head özeti + uygun kategoride "Meydan Oku" CTA
- **Badge unlock + Level-up modal** kuyruğu maç onayı sonrası sıralı oynatır

**Bilinen sınırlamalar (sonraki planlara):**
- Realtime push for badge unlocks across devices — Plan 7
- Comeback badge sadece BÜ Klasik ve 3 Set Klasik için best-effort heuristik kullanır (score_details şekli yetmezse skip)
- Avatar history yok (upsert ile aynı dosya üzerine yazılır)
- Animasyonlar, haptik, paylaşım ekranları — Plan 8

**Sonraki plan: Plan 6 — Sezon + Turnuva + Ladder.** Sezon yaşam döngüsü, finale bracket, season standings snapshot, ladder ekranı.
