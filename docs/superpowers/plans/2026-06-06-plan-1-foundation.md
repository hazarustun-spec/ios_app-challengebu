# Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Boğaziçi Tennis Challenger uygulamasının altyapısını kur — monorepo, paylaşılan TypeScript paketi (types + ELO logic + zod schemas), Supabase migrasyonları ile tüm veri modeli, seed data ve CI pipeline.

**Architecture:** bun workspaces tabanlı monorepo, Turborepo build orchestration, packages/shared'da pure TypeScript ELO/types/schemas (bun:test ile TDD), packages/supabase'da declarative migrations + seed scripts. Hiçbir mobil/web app henüz yok — bu plan saf backend foundation.

**Tech Stack:** bun (paket yöneticisi + test runner), TypeScript 5.5+, Turborepo, Biome (linter/formatter), Supabase CLI 1.x (local Postgres + auth), zod (validation), Vitest yerine bun:test (yerleşik, hızlı), GitHub Actions (CI).

**Spec referansı:** `docs/superpowers/specs/2026-06-06-tennis-challenger-design.md` — bu planın source-of-truth'u.

**Sonraki planlar:** Plan 2 (Edge Functions + cron'lar), Plan 3 (Mobile auth + onboarding), Plan 4-8 ileride.

---

## Dosya Yapısı

Bu planın sonunda repo şu hale gelir:

```
tennis-challenger/
├── .github/workflows/
│   └── ci.yml
├── .gitignore
├── .editorconfig
├── biome.json
├── bun.lock                    # bun lockfile
├── package.json                # root, workspaces tanımı
├── tsconfig.base.json
├── turbo.json
├── docs/                        # mevcut
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types/
│   │   │   │   ├── categories.ts
│   │   │   │   ├── formats.ts
│   │   │   │   ├── profile.ts
│   │   │   │   └── match.ts
│   │   │   ├── elo/
│   │   │   │   ├── index.ts
│   │   │   │   ├── formula.ts
│   │   │   │   ├── k-factor.ts
│   │   │   │   └── margin-multiplier.ts
│   │   │   └── schemas/
│   │   │       ├── index.ts
│   │   │       ├── onboarding.ts
│   │   │       └── match-result.ts
│   │   └── tests/
│   │       ├── elo/
│   │       │   ├── formula.test.ts
│   │       │   ├── k-factor.test.ts
│   │       │   └── margin-multiplier.test.ts
│   │       └── schemas/
│   │           ├── onboarding.test.ts
│   │           └── match-result.test.ts
│   └── supabase/
│       ├── config.toml
│       ├── migrations/
│       │   ├── 20260606000001_profiles.sql
│       │   ├── 20260606000002_elo_ratings.sql
│       │   ├── 20260606000003_courts_departments.sql
│       │   ├── 20260606000004_match_requests.sql
│       │   ├── 20260606000005_matches.sql
│       │   ├── 20260606000006_seasons_tournaments.sql
│       │   ├── 20260606000007_badges.sql
│       │   ├── 20260606000008_notifications.sql
│       │   └── 20260606000009_audit_announcements.sql
│       ├── seed.sql            # courts + departments + badges
│       └── tests/
│           └── schema-verification.sql
```

**Dosya sorumlulukları:**
- `packages/shared`: pure TypeScript, framework-agnostic. Hem mobile (React Native) hem (gelecekte) admin-web (Next.js) hem Edge Functions kullanır.
- `packages/supabase`: SQL migrations + seed + RLS tanımları. Tek doğruluk kaynağı schema için.

---

## Faz A — Monorepo Setup

### Task 1: Initialize bun workspace + root package.json

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.editorconfig`

- [ ] **Step 1: Verify bun is installed**

Run: `bun --version`
Expected: `1.1.x` or higher. Eğer yoksa: `curl -fsSL https://bun.sh/install | bash`

- [ ] **Step 2: Create root package.json**

Create `package.json`:

```json
{
  "name": "tennis-challenger",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "typecheck": "turbo typecheck",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "turbo": "^2.3.0",
    "typescript": "^5.6.3"
  },
  "packageManager": "bun@1.1.38"
}
```

- [ ] **Step 3: Create .gitignore**

Create `.gitignore`:

```
# Dependencies
node_modules/
.pnp.*

# Build outputs
dist/
build/
.next/
.expo/

# Turborepo
.turbo/

# Bun
bun.lockb

# Environment
.env
.env.local
.env.*.local

# Supabase
packages/supabase/.branches/
packages/supabase/.temp/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*
```

- [ ] **Step 4: Create .editorconfig**

Create `.editorconfig`:

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[*.sql]
indent_size = 2
```

- [ ] **Step 5: Install root dependencies**

Run: `bun install`
Expected: Creates `node_modules/`, `bun.lock`. No errors.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore .editorconfig bun.lock
git commit -m "chore: initialize bun workspace monorepo"
```

---

### Task 2: Add TypeScript base config

**Files:**
- Create: `tsconfig.base.json`

- [ ] **Step 1: Create tsconfig.base.json**

Create `tsconfig.base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist", "build", ".turbo"]
}
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.base.json
git commit -m "chore: add TypeScript base config"
```

---

### Task 3: Configure Biome

**Files:**
- Create: `biome.json`

- [ ] **Step 1: Create biome.json**

Create `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true,
    "ignore": ["**/dist/**", "**/.turbo/**", "**/node_modules/**", "**/build/**", "**/.expo/**"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useImportType": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "json": {
    "formatter": {
      "enabled": true
    }
  }
}
```

- [ ] **Step 2: Run biome to verify config**

Run: `bun run lint`
Expected: "Checked X files in Yms. No fixes needed." veya benzer (henüz dosya yok).

- [ ] **Step 3: Commit**

```bash
git add biome.json
git commit -m "chore: configure Biome linter and formatter"
```

---

### Task 4: Configure Turborepo

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Create turbo.json**

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local", "tsconfig.base.json"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 2: Verify turbo recognizes config**

Run: `bunx turbo run typecheck --dry-run`
Expected: "no tasks were executed as part of this run" (henüz package yok).

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "chore: configure Turborepo task pipeline"
```

---

## Faz B — packages/shared

### Task 5: Initialize packages/shared

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create directory and package.json**

Run: `mkdir -p packages/shared/src packages/shared/tests`

Create `packages/shared/package.json`:

```json
{
  "name": "@tennis/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./elo": "./src/elo/index.ts",
    "./types": "./src/types/index.ts",
    "./schemas": "./src/schemas/index.ts"
  },
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "build": "tsc"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bun": "^1.1.13"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["bun"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Create placeholder index.ts**

Create `packages/shared/src/index.ts`:

```typescript
export * from './types/index.js';
export * from './elo/index.js';
export * from './schemas/index.js';
```

Bu şu an fail eder (alt klasörler henüz yok), sonraki task'larda dolacak.

- [ ] **Step 4: Install zod**

Run: `cd packages/shared && bun add zod && cd ../..`
Expected: zod installed, bun.lock güncellenir.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/ bun.lock
git commit -m "feat(shared): initialize @tennis/shared package"
```

---

### Task 6: Category and format types (TDD)

**Files:**
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/types/categories.ts`
- Create: `packages/shared/src/types/formats.ts`
- Create: `packages/shared/tests/types/categories.test.ts`

- [ ] **Step 1: Write failing test for categories**

Create `packages/shared/tests/types/categories.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test';
import {
  ALL_CATEGORIES,
  SINGLES_CATEGORIES,
  DOUBLES_CATEGORIES,
  isSinglesCategory,
  isDoublesCategory,
  type Category,
} from '../../src/types/categories.js';

describe('categories', () => {
  test('ALL_CATEGORIES contains all 7 expected codes', () => {
    expect(ALL_CATEGORIES).toEqual([
      'erkek_tek',
      'kadin_tek',
      'open_tek',
      'erkek_cift',
      'kadin_cift',
      'karma_cift',
      'open_cift',
    ]);
  });

  test('SINGLES_CATEGORIES contains 3 singles', () => {
    expect(SINGLES_CATEGORIES).toEqual(['erkek_tek', 'kadin_tek', 'open_tek']);
  });

  test('DOUBLES_CATEGORIES contains 4 doubles', () => {
    expect(DOUBLES_CATEGORIES).toEqual([
      'erkek_cift',
      'kadin_cift',
      'karma_cift',
      'open_cift',
    ]);
  });

  test('isSinglesCategory true for singles', () => {
    expect(isSinglesCategory('erkek_tek')).toBe(true);
    expect(isSinglesCategory('open_tek')).toBe(true);
  });

  test('isSinglesCategory false for doubles', () => {
    expect(isSinglesCategory('karma_cift')).toBe(false);
  });

  test('isDoublesCategory true for doubles', () => {
    expect(isDoublesCategory('erkek_cift')).toBe(true);
    expect(isDoublesCategory('open_cift')).toBe(true);
  });

  test('isDoublesCategory false for singles', () => {
    expect(isDoublesCategory('kadin_tek')).toBe(false);
  });

  test('Category type narrows correctly', () => {
    const c: Category = 'erkek_tek';
    expect(c).toBe('erkek_tek');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd packages/shared && bun test tests/types/categories.test.ts`
Expected: FAIL — "Cannot find module" çünkü `categories.ts` henüz yok.

- [ ] **Step 3: Implement categories.ts**

Create `packages/shared/src/types/categories.ts`:

```typescript
export const SINGLES_CATEGORIES = ['erkek_tek', 'kadin_tek', 'open_tek'] as const;

export const DOUBLES_CATEGORIES = [
  'erkek_cift',
  'kadin_cift',
  'karma_cift',
  'open_cift',
] as const;

export const ALL_CATEGORIES = [
  ...SINGLES_CATEGORIES,
  ...DOUBLES_CATEGORIES,
] as const;

export type SinglesCategory = (typeof SINGLES_CATEGORIES)[number];
export type DoublesCategory = (typeof DOUBLES_CATEGORIES)[number];
export type Category = (typeof ALL_CATEGORIES)[number];

const SINGLES_SET = new Set<string>(SINGLES_CATEGORIES);
const DOUBLES_SET = new Set<string>(DOUBLES_CATEGORIES);

export function isSinglesCategory(c: Category): c is SinglesCategory {
  return SINGLES_SET.has(c);
}

export function isDoublesCategory(c: Category): c is DoublesCategory {
  return DOUBLES_SET.has(c);
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `cd packages/shared && bun test tests/types/categories.test.ts`
Expected: PASS — 7 test passed.

- [ ] **Step 5: Write failing test for formats**

Create `packages/shared/tests/types/formats.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test';
import {
  ALL_FORMATS,
  FORMAT_RULES,
  type MatchFormat,
} from '../../src/types/formats.js';

describe('formats', () => {
  test('ALL_FORMATS contains 4 expected codes', () => {
    expect(ALL_FORMATS).toEqual([
      'bu_klasik',
      'hizli_tiebreak',
      'pro_set_8',
      '3set_klasik',
    ]);
  });

  test('FORMAT_RULES has rules for every format', () => {
    for (const format of ALL_FORMATS) {
      expect(FORMAT_RULES[format]).toBeDefined();
      expect(FORMAT_RULES[format].displayName).toBeTruthy();
      expect(FORMAT_RULES[format].approximateDuration).toBeGreaterThan(0);
    }
  });

  test('bu_klasik has target of 4 els', () => {
    expect(FORMAT_RULES['bu_klasik'].targetUnits).toBe(4);
    expect(FORMAT_RULES['bu_klasik'].canVoidAtTie).toBe(true);
  });

  test('hizli_tiebreak has target of 10', () => {
    expect(FORMAT_RULES['hizli_tiebreak'].targetUnits).toBe(10);
  });

  test('Format type narrows correctly', () => {
    const f: MatchFormat = 'bu_klasik';
    expect(f).toBe('bu_klasik');
  });
});
```

- [ ] **Step 6: Run test, verify fails**

Run: `bun test tests/types/formats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement formats.ts**

Create `packages/shared/src/types/formats.ts`:

```typescript
export const ALL_FORMATS = [
  'bu_klasik',
  'hizli_tiebreak',
  'pro_set_8',
  '3set_klasik',
] as const;

export type MatchFormat = (typeof ALL_FORMATS)[number];

export interface FormatRule {
  readonly displayName: string;
  readonly approximateDuration: number;
  readonly targetUnits: number;
  readonly unitName: 'el' | 'game' | 'set' | 'point';
  readonly canVoidAtTie: boolean;
  readonly description: string;
}

export const FORMAT_RULES: Record<MatchFormat, FormatRule> = {
  bu_klasik: {
    displayName: 'BÜ Klasik',
    approximateDuration: 60,
    targetUnits: 4,
    unitName: 'el',
    canVoidAtTie: true,
    description:
      '4 el alan kazanır. Sayılar 15/30/40/avantaj. 3-3 olursa Maçı Bitir → maç yapılmamış sayılır.',
  },
  hizli_tiebreak: {
    displayName: 'Hızlı Tiebreak',
    approximateDuration: 20,
    targetUnits: 10,
    unitName: 'point',
    canVoidAtTie: false,
    description: 'Sadece 10 sayılık match tiebreak. 2 sayı farkla bitirilir.',
  },
  pro_set_8: {
    displayName: 'Pro Set 8',
    approximateDuration: 75,
    targetUnits: 8,
    unitName: 'game',
    canVoidAtTie: false,
    description: 'İlk 8 game alan kazanır. 6-6 olursa tiebreak.',
  },
  '3set_klasik': {
    displayName: '3 Set Klasik',
    approximateDuration: 120,
    targetUnits: 2,
    unitName: 'set',
    canVoidAtTie: false,
    description: 'ATP standardı. 2 set alan kazanır. 6-6 olursa tiebreak.',
  },
};
```

- [ ] **Step 8: Run test, verify pass**

Run: `bun test tests/types/formats.test.ts`
Expected: PASS.

- [ ] **Step 9: Create types/index.ts**

Create `packages/shared/src/types/index.ts`:

```typescript
export * from './categories.js';
export * from './formats.js';
```

- [ ] **Step 10: Verify all tests still pass**

Run: `cd packages/shared && bun test`
Expected: 12 tests passed (7 categories + 5 formats).

- [ ] **Step 11: Commit**

```bash
git add packages/shared/src/types/ packages/shared/tests/types/
git commit -m "feat(shared): add Category and MatchFormat types"
```

---

### Task 7: K-factor logic (TDD)

**Files:**
- Create: `packages/shared/src/elo/k-factor.ts`
- Create: `packages/shared/tests/elo/k-factor.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/shared/tests/elo/k-factor.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test';
import { getKFactor, K_NEW_PLAYER, K_ESTABLISHED, NEW_PLAYER_THRESHOLD } from '../../src/elo/k-factor.js';

describe('K-factor', () => {
  test('constants are 40 and 20', () => {
    expect(K_NEW_PLAYER).toBe(40);
    expect(K_ESTABLISHED).toBe(20);
    expect(NEW_PLAYER_THRESHOLD).toBe(10);
  });

  test('returns K=40 for 0 matches', () => {
    expect(getKFactor(0)).toBe(40);
  });

  test('returns K=40 for 9 matches (boundary, still new)', () => {
    expect(getKFactor(9)).toBe(40);
  });

  test('returns K=20 for exactly 10 matches (just established)', () => {
    expect(getKFactor(10)).toBe(20);
  });

  test('returns K=20 for 50 matches', () => {
    expect(getKFactor(50)).toBe(20);
  });

  test('throws on negative matches_played', () => {
    expect(() => getKFactor(-1)).toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `bun test tests/elo/k-factor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement k-factor.ts**

Create `packages/shared/src/elo/k-factor.ts`:

```typescript
export const K_NEW_PLAYER = 40;
export const K_ESTABLISHED = 20;
export const NEW_PLAYER_THRESHOLD = 10;

export function getKFactor(matchesPlayed: number): number {
  if (matchesPlayed < 0) {
    throw new Error(`matchesPlayed must be non-negative, got ${matchesPlayed}`);
  }
  return matchesPlayed < NEW_PLAYER_THRESHOLD ? K_NEW_PLAYER : K_ESTABLISHED;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `bun test tests/elo/k-factor.test.ts`
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/elo/k-factor.ts packages/shared/tests/elo/k-factor.test.ts
git commit -m "feat(shared): add K-factor logic with new player threshold"
```

---

### Task 8: Margin multiplier (TDD)

**Files:**
- Create: `packages/shared/src/elo/margin-multiplier.ts`
- Create: `packages/shared/tests/elo/margin-multiplier.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/shared/tests/elo/margin-multiplier.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test';
import { getMarginMultiplier } from '../../src/elo/margin-multiplier.js';
import type { MatchFormat } from '../../src/types/formats.js';

describe('margin multiplier', () => {
  describe('bu_klasik', () => {
    const fmt: MatchFormat = 'bu_klasik';
    test('4-0 → 1.5', () => {
      expect(getMarginMultiplier(fmt, 4, 0)).toBeCloseTo(1.5);
    });
    test('4-1 → 1.3', () => {
      expect(getMarginMultiplier(fmt, 4, 1)).toBeCloseTo(1.3);
    });
    test('4-2 → 1.1', () => {
      expect(getMarginMultiplier(fmt, 4, 2)).toBeCloseTo(1.1);
    });
    test('4-3 → 1.0', () => {
      expect(getMarginMultiplier(fmt, 4, 3)).toBeCloseTo(1.0);
    });
  });

  describe('hizli_tiebreak', () => {
    const fmt: MatchFormat = 'hizli_tiebreak';
    test('10-0 → 1.5', () => {
      expect(getMarginMultiplier(fmt, 10, 0)).toBeCloseTo(1.5);
    });
    test('10-5 → 1.2', () => {
      expect(getMarginMultiplier(fmt, 10, 5)).toBeCloseTo(1.2);
    });
    test('10-8 → 1.0', () => {
      expect(getMarginMultiplier(fmt, 10, 8)).toBeCloseTo(1.0);
    });
  });

  describe('pro_set_8', () => {
    const fmt: MatchFormat = 'pro_set_8';
    test('8-0 → 1.5', () => {
      expect(getMarginMultiplier(fmt, 8, 0)).toBeCloseTo(1.5);
    });
    test('8-4 → 1.2', () => {
      expect(getMarginMultiplier(fmt, 8, 4)).toBeCloseTo(1.2);
    });
    test('tiebreak 9-8 → 1.0', () => {
      expect(getMarginMultiplier(fmt, 9, 8)).toBeCloseTo(1.0);
    });
  });

  describe('3set_klasik', () => {
    const fmt: MatchFormat = '3set_klasik';
    test('2-0 sets → 1.3', () => {
      expect(getMarginMultiplier(fmt, 2, 0)).toBeCloseTo(1.3);
    });
    test('2-1 sets → 1.0', () => {
      expect(getMarginMultiplier(fmt, 2, 1)).toBeCloseTo(1.0);
    });
  });

  test('throws if loser score >= winner score', () => {
    expect(() => getMarginMultiplier('bu_klasik', 3, 4)).toThrow();
    expect(() => getMarginMultiplier('bu_klasik', 4, 4)).toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `bun test tests/elo/margin-multiplier.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement margin-multiplier.ts**

Create `packages/shared/src/elo/margin-multiplier.ts`:

```typescript
import type { MatchFormat } from '../types/formats.js';

export function getMarginMultiplier(
  format: MatchFormat,
  winnerScore: number,
  loserScore: number,
): number {
  if (loserScore >= winnerScore) {
    throw new Error(
      `loserScore (${loserScore}) must be less than winnerScore (${winnerScore})`,
    );
  }

  const diff = winnerScore - loserScore;

  switch (format) {
    case 'bu_klasik':
      // 4-0=1.5, 4-1=1.3, 4-2=1.1, 4-3=1.0
      if (diff >= 4) return 1.5;
      if (diff === 3) return 1.3;
      if (diff === 2) return 1.1;
      return 1.0;

    case 'hizli_tiebreak':
      // 10-0=1.5, 10-5=1.2 (diff 5), 10-8=1.0 (diff 2)
      if (diff >= 10) return 1.5;
      if (diff >= 5) return 1.2;
      return 1.0;

    case 'pro_set_8':
      // 8-0=1.5 (diff 8), 8-4=1.2 (diff 4), 9-8=1.0 (diff 1)
      if (diff >= 8) return 1.5;
      if (diff >= 4) return 1.2;
      return 1.0;

    case '3set_klasik':
      // 2-0=1.3, 2-1=1.0
      if (diff >= 2) return 1.3;
      return 1.0;
  }
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `bun test tests/elo/margin-multiplier.test.ts`
Expected: PASS — 13 tests passed.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/elo/margin-multiplier.ts packages/shared/tests/elo/margin-multiplier.test.ts
git commit -m "feat(shared): add margin multiplier per format"
```

---

### Task 9: ELO formula (TDD)

**Files:**
- Create: `packages/shared/src/elo/formula.ts`
- Create: `packages/shared/tests/elo/formula.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/shared/tests/elo/formula.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test';
import {
  expectedScore,
  calculateEloChange,
  DEFAULT_STARTING_ELO,
} from '../../src/elo/formula.js';

describe('expectedScore', () => {
  test('equal ratings → 0.5 expected', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });

  test('400 higher → ~0.91 expected', () => {
    expect(expectedScore(1600, 1200)).toBeCloseTo(0.909, 2);
  });

  test('400 lower → ~0.09 expected', () => {
    expect(expectedScore(1200, 1600)).toBeCloseTo(0.091, 2);
  });

  test('expected scores sum to 1', () => {
    const a = expectedScore(1300, 1400);
    const b = expectedScore(1400, 1300);
    expect(a + b).toBeCloseTo(1.0);
  });
});

describe('calculateEloChange', () => {
  test('DEFAULT_STARTING_ELO is 1200', () => {
    expect(DEFAULT_STARTING_ELO).toBe(1200);
  });

  test('underdog wins → big rating gain', () => {
    const result = calculateEloChange({
      winnerRating: 1000,
      loserRating: 1400,
      winnerMatchesPlayed: 20,
      loserMatchesPlayed: 20,
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 2,
    });

    // K=20, expected_winner ≈ 0.091, margin=1.1
    // change = 20 * (1 - 0.091) * 1.1 ≈ 20.0
    expect(result.winnerChange).toBeGreaterThan(15);
    expect(result.loserChange).toBe(-result.winnerChange);
  });

  test('favorite wins → small rating gain', () => {
    const result = calculateEloChange({
      winnerRating: 1500,
      loserRating: 1200,
      winnerMatchesPlayed: 20,
      loserMatchesPlayed: 20,
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 3,
    });

    // expected_winner ≈ 0.85, margin=1.0
    // change = 20 * (1 - 0.85) * 1.0 = 3
    expect(result.winnerChange).toBeLessThanOrEqual(5);
    expect(result.winnerChange).toBeGreaterThan(0);
  });

  test('uses K=40 for new player', () => {
    const newPlayer = calculateEloChange({
      winnerRating: 1200,
      loserRating: 1200,
      winnerMatchesPlayed: 5, // new
      loserMatchesPlayed: 20,
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 2,
    });

    const established = calculateEloChange({
      winnerRating: 1200,
      loserRating: 1200,
      winnerMatchesPlayed: 20,
      loserMatchesPlayed: 20,
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 2,
    });

    expect(newPlayer.winnerChange).toBeGreaterThan(established.winnerChange);
  });

  test('applies margin multiplier (4-0 vs 4-3)', () => {
    const bagel = calculateEloChange({
      winnerRating: 1200,
      loserRating: 1200,
      winnerMatchesPlayed: 20,
      loserMatchesPlayed: 20,
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 0,
    });

    const close = calculateEloChange({
      winnerRating: 1200,
      loserRating: 1200,
      winnerMatchesPlayed: 20,
      loserMatchesPlayed: 20,
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 3,
    });

    expect(bagel.winnerChange).toBeGreaterThan(close.winnerChange);
  });

  test('changes are integers (rounded)', () => {
    const result = calculateEloChange({
      winnerRating: 1234,
      loserRating: 1337,
      winnerMatchesPlayed: 20,
      loserMatchesPlayed: 20,
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 2,
    });

    expect(Number.isInteger(result.winnerChange)).toBe(true);
    expect(Number.isInteger(result.loserChange)).toBe(true);
  });

  test('zero-sum: winnerChange + loserChange = 0', () => {
    const result = calculateEloChange({
      winnerRating: 1500,
      loserRating: 1100,
      winnerMatchesPlayed: 30,
      loserMatchesPlayed: 5,
      format: 'pro_set_8',
      winnerScore: 8,
      loserScore: 4,
    });

    expect(result.winnerChange + result.loserChange).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `bun test tests/elo/formula.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement formula.ts**

Create `packages/shared/src/elo/formula.ts`:

```typescript
import type { MatchFormat } from '../types/formats.js';
import { getKFactor } from './k-factor.js';
import { getMarginMultiplier } from './margin-multiplier.js';

export const DEFAULT_STARTING_ELO = 1200;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export interface EloChangeInput {
  winnerRating: number;
  loserRating: number;
  winnerMatchesPlayed: number;
  loserMatchesPlayed: number;
  format: MatchFormat;
  winnerScore: number;
  loserScore: number;
}

export interface EloChangeOutput {
  winnerChange: number;
  loserChange: number;
  winnerNewRating: number;
  loserNewRating: number;
}

export function calculateEloChange(input: EloChangeInput): EloChangeOutput {
  const expectedWinner = expectedScore(input.winnerRating, input.loserRating);
  const kWinner = getKFactor(input.winnerMatchesPlayed);
  const kLoser = getKFactor(input.loserMatchesPlayed);
  const k = Math.min(kWinner, kLoser);

  const margin = getMarginMultiplier(input.format, input.winnerScore, input.loserScore);

  const rawChange = k * (1 - expectedWinner) * margin;
  const winnerChange = Math.round(rawChange);
  const loserChange = -winnerChange;

  return {
    winnerChange,
    loserChange,
    winnerNewRating: input.winnerRating + winnerChange,
    loserNewRating: input.loserRating + loserChange,
  };
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `bun test tests/elo/formula.test.ts`
Expected: PASS — 11 tests passed.

- [ ] **Step 5: Create elo/index.ts**

Create `packages/shared/src/elo/index.ts`:

```typescript
export * from './formula.js';
export * from './k-factor.js';
export * from './margin-multiplier.js';
```

- [ ] **Step 6: Run all tests**

Run: `cd packages/shared && bun test`
Expected: All tests pass (categories + formats + k-factor + margin + formula = 36 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/elo/ packages/shared/tests/elo/
git commit -m "feat(shared): add ELO calculation with K-factor and margin multiplier"
```

---

### Task 10: Doubles ELO calculation (TDD)

**Files:**
- Modify: `packages/shared/src/elo/formula.ts`
- Modify: `packages/shared/tests/elo/formula.test.ts`

- [ ] **Step 1: Add failing test for doubles**

Append to `packages/shared/tests/elo/formula.test.ts`:

```typescript
import { calculateDoublesEloChange } from '../../src/elo/formula.js';

describe('calculateDoublesEloChange', () => {
  test('uses team average for expected calculation', () => {
    // Team A avg: (1300 + 1100) / 2 = 1200
    // Team B avg: (1200 + 1200) / 2 = 1200
    // Equal teams, A wins → ~equal gain
    const result = calculateDoublesEloChange({
      winnerTeamRatings: [1300, 1100],
      loserTeamRatings: [1200, 1200],
      winnerTeamMatchesPlayed: [20, 20],
      loserTeamMatchesPlayed: [20, 20],
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 2,
    });

    expect(result.winnerChanges).toHaveLength(2);
    expect(result.loserChanges).toHaveLength(2);
    expect(result.winnerChanges[0]).toBe(result.winnerChanges[1]);
    expect(result.loserChanges[0]).toBe(result.loserChanges[1]);
  });

  test('zero-sum across all 4 players', () => {
    const result = calculateDoublesEloChange({
      winnerTeamRatings: [1500, 1400],
      loserTeamRatings: [1200, 1100],
      winnerTeamMatchesPlayed: [30, 25],
      loserTeamMatchesPlayed: [10, 15],
      format: '3set_klasik',
      winnerScore: 2,
      loserScore: 0,
    });

    const totalWinnerGain = result.winnerChanges[0] + result.winnerChanges[1];
    const totalLoserLoss = result.loserChanges[0] + result.loserChanges[1];
    expect(totalWinnerGain + totalLoserLoss).toBe(0);
  });

  test('underdog doubles team gets more points', () => {
    const underdog = calculateDoublesEloChange({
      winnerTeamRatings: [1000, 1000],
      loserTeamRatings: [1500, 1500],
      winnerTeamMatchesPlayed: [20, 20],
      loserTeamMatchesPlayed: [20, 20],
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 2,
    });

    const favorite = calculateDoublesEloChange({
      winnerTeamRatings: [1500, 1500],
      loserTeamRatings: [1000, 1000],
      winnerTeamMatchesPlayed: [20, 20],
      loserTeamMatchesPlayed: [20, 20],
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 2,
    });

    expect(underdog.winnerChanges[0]).toBeGreaterThan(favorite.winnerChanges[0]);
  });

  test('throws if team arrays length mismatch', () => {
    expect(() =>
      calculateDoublesEloChange({
        winnerTeamRatings: [1200],
        loserTeamRatings: [1200, 1200],
        winnerTeamMatchesPlayed: [20, 20],
        loserTeamMatchesPlayed: [20, 20],
        format: 'bu_klasik',
        winnerScore: 4,
        loserScore: 2,
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `bun test tests/elo/formula.test.ts`
Expected: FAIL — `calculateDoublesEloChange` not exported.

- [ ] **Step 3: Implement calculateDoublesEloChange**

Append to `packages/shared/src/elo/formula.ts`:

```typescript
export interface DoublesEloChangeInput {
  winnerTeamRatings: [number, number];
  loserTeamRatings: [number, number];
  winnerTeamMatchesPlayed: [number, number];
  loserTeamMatchesPlayed: [number, number];
  format: MatchFormat;
  winnerScore: number;
  loserScore: number;
}

export interface DoublesEloChangeOutput {
  winnerChanges: [number, number];
  loserChanges: [number, number];
  winnerNewRatings: [number, number];
  loserNewRatings: [number, number];
}

export function calculateDoublesEloChange(
  input: DoublesEloChangeInput,
): DoublesEloChangeOutput {
  if (
    input.winnerTeamRatings.length !== 2 ||
    input.loserTeamRatings.length !== 2 ||
    input.winnerTeamMatchesPlayed.length !== 2 ||
    input.loserTeamMatchesPlayed.length !== 2
  ) {
    throw new Error('Doubles teams must have exactly 2 players each');
  }

  const winnerAvg = (input.winnerTeamRatings[0] + input.winnerTeamRatings[1]) / 2;
  const loserAvg = (input.loserTeamRatings[0] + input.loserTeamRatings[1]) / 2;
  const expectedWinner = expectedScore(winnerAvg, loserAvg);

  const allMatchesPlayed = [
    ...input.winnerTeamMatchesPlayed,
    ...input.loserTeamMatchesPlayed,
  ];
  const minMatchesPlayed = Math.min(...allMatchesPlayed);
  const k = getKFactor(minMatchesPlayed);

  const margin = getMarginMultiplier(input.format, input.winnerScore, input.loserScore);

  const rawChange = k * (1 - expectedWinner) * margin;
  const totalChange = Math.round(rawChange);

  // Distribute equally; if odd, give the +1 to the first winner / -1 to the first loser
  const perWinner = Math.floor(totalChange / 2);
  const perLoserGain = Math.ceil(totalChange / 2);
  const winnerChanges: [number, number] = [
    perLoserGain, // first gets the "ceiling" share
    perWinner,
  ];
  const loserChanges: [number, number] = [-perLoserGain, -perWinner];

  return {
    winnerChanges,
    loserChanges,
    winnerNewRatings: [
      input.winnerTeamRatings[0] + winnerChanges[0],
      input.winnerTeamRatings[1] + winnerChanges[1],
    ],
    loserNewRatings: [
      input.loserTeamRatings[0] + loserChanges[0],
      input.loserTeamRatings[1] + loserChanges[1],
    ],
  };
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `bun test tests/elo/formula.test.ts`
Expected: PASS — all formula tests pass (15 total in formula.test.ts).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/elo/formula.ts packages/shared/tests/elo/formula.test.ts
git commit -m "feat(shared): add doubles ELO calculation with team-average expected score"
```

---

### Task 11: Onboarding zod schema (TDD)

**Files:**
- Create: `packages/shared/src/schemas/onboarding.ts`
- Create: `packages/shared/tests/schemas/onboarding.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/shared/tests/schemas/onboarding.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test';
import {
  onboardingSchema,
  validateBouniMail,
  ALLOWED_BOUN_DOMAINS,
} from '../../src/schemas/onboarding.js';

describe('BÜ email validation', () => {
  test('accepts @boun.edu.tr', () => {
    expect(validateBouniMail('ahmet.veli@boun.edu.tr')).toBe(true);
  });

  test('accepts @std.bogazici.edu.tr', () => {
    expect(validateBouniMail('ayse.fatma@std.bogazici.edu.tr')).toBe(true);
  });

  test('rejects gmail.com', () => {
    expect(validateBouniMail('user@gmail.com')).toBe(false);
  });

  test('rejects subdomain spoof', () => {
    expect(validateBouniMail('user@boun.edu.tr.fake.com')).toBe(false);
  });

  test('case insensitive', () => {
    expect(validateBouniMail('Foo@BOUN.EDU.TR')).toBe(true);
  });

  test('ALLOWED_BOUN_DOMAINS has 2 entries', () => {
    expect(ALLOWED_BOUN_DOMAINS).toEqual(['boun.edu.tr', 'std.bogazici.edu.tr']);
  });
});

describe('onboardingSchema', () => {
  const validInput = {
    firstName: 'Ali',
    lastName: 'Yılmaz',
    phone: '+905551234567',
    pronoun: 'he/him',
    genderCategory: 'erkek',
    departmentId: '00000000-0000-0000-0000-000000000001',
    classYear: '3',
    skillSelfAssessment: 'orta',
    dominantHand: 'sag',
    availabilityWindows: ['weekday_evening', 'weekend_morning'],
    showDepartment: true,
    showClassYear: true,
  };

  test('accepts valid input', () => {
    const result = onboardingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test('phone is optional', () => {
    const { phone: _phone, ...rest } = validInput;
    const result = onboardingSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  test('rejects empty firstName', () => {
    const result = onboardingSchema.safeParse({ ...validInput, firstName: '' });
    expect(result.success).toBe(false);
  });

  test('rejects invalid pronoun', () => {
    const result = onboardingSchema.safeParse({ ...validInput, pronoun: 'xxx' });
    expect(result.success).toBe(false);
  });

  test('rejects invalid classYear', () => {
    const result = onboardingSchema.safeParse({ ...validInput, classYear: '99' });
    expect(result.success).toBe(false);
  });

  test('rejects empty availabilityWindows', () => {
    const result = onboardingSchema.safeParse({ ...validInput, availabilityWindows: [] });
    expect(result.success).toBe(false);
  });

  test('rejects invalid phone format', () => {
    const result = onboardingSchema.safeParse({ ...validInput, phone: '5551234567' });
    expect(result.success).toBe(false);
  });

  test('accepts pronoun=other with custom text', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      pronoun: 'other',
      pronounCustom: 'ze/zir',
    });
    expect(result.success).toBe(true);
  });

  test('rejects pronoun=other without custom text', () => {
    const result = onboardingSchema.safeParse({
      ...validInput,
      pronoun: 'other',
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `bun test tests/schemas/onboarding.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement onboarding.ts**

Create `packages/shared/src/schemas/onboarding.ts`:

```typescript
import { z } from 'zod';

export const ALLOWED_BOUN_DOMAINS = ['boun.edu.tr', 'std.bogazici.edu.tr'] as const;

export function validateBouniMail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  return ALLOWED_BOUN_DOMAINS.some((domain) => lower.endsWith(`@${domain}`));
}

export const PRONOUN_VALUES = ['he/him', 'she/her', 'they/them', 'other'] as const;
export const GENDER_CATEGORY_VALUES = ['erkek', 'kadin', 'open_only'] as const;
export const CLASS_YEAR_VALUES = ['hazirlik', '1', '2', '3', '4', 'yl', 'doktora'] as const;
export const SKILL_VALUES = ['baslangic', 'orta', 'ileri'] as const;
export const HAND_VALUES = ['sag', 'sol'] as const;
export const AVAILABILITY_VALUES = [
  'weekday_morning',
  'weekday_noon',
  'weekday_evening',
  'weekend_morning',
  'weekend_noon',
  'weekend_evening',
] as const;

const phoneSchema = z
  .string()
  .regex(/^\+\d{10,15}$/, 'Phone must be E.164 format (e.g. +905551234567)')
  .optional();

export const onboardingSchema = z
  .object({
    firstName: z.string().min(1).max(50).trim(),
    lastName: z.string().min(1).max(50).trim(),
    phone: phoneSchema,
    pronoun: z.enum(PRONOUN_VALUES),
    pronounCustom: z.string().max(30).optional(),
    genderCategory: z.enum(GENDER_CATEGORY_VALUES),
    departmentId: z.string().uuid(),
    classYear: z.enum(CLASS_YEAR_VALUES),
    skillSelfAssessment: z.enum(SKILL_VALUES),
    dominantHand: z.enum(HAND_VALUES),
    availabilityWindows: z.array(z.enum(AVAILABILITY_VALUES)).min(1),
    showDepartment: z.boolean(),
    showClassYear: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.pronoun === 'other') {
        return data.pronounCustom !== undefined && data.pronounCustom.length > 0;
      }
      return true;
    },
    { message: 'pronounCustom is required when pronoun is "other"', path: ['pronounCustom'] },
  );

export type OnboardingInput = z.infer<typeof onboardingSchema>;
```

- [ ] **Step 4: Run test, verify pass**

Run: `bun test tests/schemas/onboarding.test.ts`
Expected: PASS — 16 tests passed.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/onboarding.ts packages/shared/tests/schemas/onboarding.test.ts
git commit -m "feat(shared): add onboarding zod schema with BÜ email validation"
```

---

### Task 12: Match result zod schema (TDD)

**Files:**
- Create: `packages/shared/src/schemas/match-result.ts`
- Create: `packages/shared/tests/schemas/match-result.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/shared/tests/schemas/match-result.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test';
import {
  matchResultSchema,
  buKlasikScoreDetail,
  threeSetScoreDetail,
} from '../../src/schemas/match-result.js';

describe('buKlasikScoreDetail', () => {
  test('accepts valid el sequence', () => {
    const result = buKlasikScoreDetail.safeParse({
      els: [
        { el: 1, winner: 'a' },
        { el: 2, winner: 'a' },
        { el: 3, winner: 'b' },
        { el: 4, winner: 'a' },
        { el: 5, winner: 'a' },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('rejects empty els', () => {
    const result = buKlasikScoreDetail.safeParse({ els: [] });
    expect(result.success).toBe(false);
  });

  test('rejects non-sequential el numbers', () => {
    const result = buKlasikScoreDetail.safeParse({
      els: [
        { el: 1, winner: 'a' },
        { el: 3, winner: 'b' },
      ],
    });
    expect(result.success).toBe(false);
  });

  test('rejects more than 7 els', () => {
    const result = buKlasikScoreDetail.safeParse({
      els: Array.from({ length: 8 }, (_, i) => ({ el: i + 1, winner: 'a' as const })),
    });
    expect(result.success).toBe(false);
  });
});

describe('threeSetScoreDetail', () => {
  test('accepts valid 2-set match', () => {
    const result = threeSetScoreDetail.safeParse({
      sets: [
        { set: 1, a: 6, b: 4 },
        { set: 2, a: 6, b: 3 },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('accepts valid 3-set match', () => {
    const result = threeSetScoreDetail.safeParse({
      sets: [
        { set: 1, a: 6, b: 4 },
        { set: 2, a: 3, b: 6 },
        { set: 3, a: 7, b: 5 },
      ],
    });
    expect(result.success).toBe(true);
  });

  test('rejects 4-set match', () => {
    const result = threeSetScoreDetail.safeParse({
      sets: [
        { set: 1, a: 6, b: 4 },
        { set: 2, a: 6, b: 4 },
        { set: 3, a: 6, b: 4 },
        { set: 4, a: 6, b: 4 },
      ],
    });
    expect(result.success).toBe(false);
  });

  test('rejects negative game count', () => {
    const result = threeSetScoreDetail.safeParse({
      sets: [{ set: 1, a: 6, b: -1 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('matchResultSchema', () => {
  test('accepts bu_klasik result', () => {
    const result = matchResultSchema.safeParse({
      matchId: '00000000-0000-0000-0000-000000000001',
      format: 'bu_klasik',
      scoreTeamA: 4,
      scoreTeamB: 2,
      winnerTeam: 'a',
      scoreDetails: {
        els: [
          { el: 1, winner: 'a' },
          { el: 2, winner: 'a' },
          { el: 3, winner: 'b' },
          { el: 4, winner: 'b' },
          { el: 5, winner: 'a' },
          { el: 6, winner: 'a' },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  test('rejects winner team mismatch with scores', () => {
    const result = matchResultSchema.safeParse({
      matchId: '00000000-0000-0000-0000-000000000001',
      format: 'bu_klasik',
      scoreTeamA: 2,
      scoreTeamB: 4,
      winnerTeam: 'a', // wrong: A has fewer
      scoreDetails: {
        els: [
          { el: 1, winner: 'b' },
          { el: 2, winner: 'b' },
          { el: 3, winner: 'a' },
          { el: 4, winner: 'b' },
          { el: 5, winner: 'a' },
          { el: 6, winner: 'b' },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  test('accepts voided result (3-3 in bu_klasik)', () => {
    const result = matchResultSchema.safeParse({
      matchId: '00000000-0000-0000-0000-000000000001',
      format: 'bu_klasik',
      scoreTeamA: 3,
      scoreTeamB: 3,
      winnerTeam: 'void',
      scoreDetails: {
        els: [
          { el: 1, winner: 'a' },
          { el: 2, winner: 'b' },
          { el: 3, winner: 'a' },
          { el: 4, winner: 'b' },
          { el: 5, winner: 'a' },
          { el: 6, winner: 'b' },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `bun test tests/schemas/match-result.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement match-result.ts**

Create `packages/shared/src/schemas/match-result.ts`:

```typescript
import { z } from 'zod';
import { ALL_FORMATS } from '../types/formats.js';

const teamLetterSchema = z.enum(['a', 'b']);
const winnerTeamSchema = z.enum(['a', 'b', 'void']);

export const buKlasikScoreDetail = z
  .object({
    els: z
      .array(
        z.object({
          el: z.number().int().min(1),
          winner: teamLetterSchema,
        }),
      )
      .min(1)
      .max(7),
  })
  .refine(
    (data) => data.els.every((el, idx) => el.el === idx + 1),
    { message: 'els must be sequential starting from 1' },
  );

export const threeSetScoreDetail = z
  .object({
    sets: z
      .array(
        z.object({
          set: z.number().int().min(1).max(3),
          a: z.number().int().min(0).max(7),
          b: z.number().int().min(0).max(7),
        }),
      )
      .min(2)
      .max(3),
  })
  .refine(
    (data) => data.sets.every((s, idx) => s.set === idx + 1),
    { message: 'sets must be sequential starting from 1' },
  );

export const proSet8ScoreDetail = z.object({
  games: z.object({
    a: z.number().int().min(0),
    b: z.number().int().min(0),
  }),
  tiebreakScore: z
    .object({
      a: z.number().int().min(0),
      b: z.number().int().min(0),
    })
    .optional(),
});

export const tiebreakScoreDetail = z.object({
  points: z.object({
    a: z.number().int().min(0),
    b: z.number().int().min(0),
  }),
});

export const scoreDetailsSchema = z.union([
  buKlasikScoreDetail,
  threeSetScoreDetail,
  proSet8ScoreDetail,
  tiebreakScoreDetail,
]);

export const matchResultSchema = z
  .object({
    matchId: z.string().uuid(),
    format: z.enum(ALL_FORMATS),
    scoreTeamA: z.number().int().min(0),
    scoreTeamB: z.number().int().min(0),
    winnerTeam: winnerTeamSchema,
    scoreDetails: scoreDetailsSchema,
  })
  .refine(
    (data) => {
      if (data.winnerTeam === 'void') {
        return data.scoreTeamA === data.scoreTeamB;
      }
      if (data.winnerTeam === 'a') {
        return data.scoreTeamA > data.scoreTeamB;
      }
      return data.scoreTeamB > data.scoreTeamA;
    },
    { message: 'winnerTeam must match scores', path: ['winnerTeam'] },
  );

export type MatchResultInput = z.infer<typeof matchResultSchema>;
```

- [ ] **Step 4: Run test, verify pass**

Run: `bun test tests/schemas/match-result.test.ts`
Expected: PASS — 11 tests passed.

- [ ] **Step 5: Create schemas/index.ts**

Create `packages/shared/src/schemas/index.ts`:

```typescript
export * from './onboarding.js';
export * from './match-result.js';
```

- [ ] **Step 6: Verify package builds and all tests pass**

Run: `cd packages/shared && bun test && bun run typecheck`
Expected: All tests pass (~60 tests), typecheck passes.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/schemas/ packages/shared/tests/schemas/
git commit -m "feat(shared): add match result zod schemas with score detail validation"
```

---

## Faz C — packages/supabase

### Task 13: Initialize Supabase package

**Files:**
- Create: `packages/supabase/config.toml`
- Create: `packages/supabase/.gitignore`

- [ ] **Step 1: Verify Supabase CLI is installed**

Run: `supabase --version`
Expected: `1.x.x` or `2.x.x`. Eğer yoksa: `brew install supabase/tap/supabase`

- [ ] **Step 2: Initialize Supabase project**

Run: `mkdir -p packages/supabase && cd packages/supabase && supabase init && cd ../..`
Expected: `config.toml`, `seed.sql`, `.gitignore`, `.vscode/` oluşturulur.

- [ ] **Step 3: Update config.toml**

Edit `packages/supabase/config.toml` — replace contents with:

```toml
project_id = "tennis-challenger"

[api]
enabled = true
port = 54321
schemas = ["public", "storage"]
extra_search_path = ["public"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323

[inbucket]
enabled = true
port = 54324

[storage]
enabled = true
file_size_limit = "5MiB"

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["exp://", "tennischallenger://"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true

[auth.sms]
enable_signup = false

[functions]
verify_jwt = true

[edge_runtime]
enabled = true
inspector_port = 8083
```

- [ ] **Step 4: Update .gitignore for supabase**

Edit `packages/supabase/.gitignore` — replace contents with:

```
# Supabase
.branches/
.temp/
.vscode/

# Generated
**/db/*.sql.lock
```

- [ ] **Step 5: Test local Supabase starts**

Run: `cd packages/supabase && supabase start`
Expected: Output shows API URL, anon key, etc. Docker must be running. Takes ~30s first time.

Eğer hata verirse: Docker Desktop'ın açık olduğundan emin ol.

- [ ] **Step 6: Stop Supabase**

Run: `cd packages/supabase && supabase stop`

- [ ] **Step 7: Commit**

```bash
git add packages/supabase/config.toml packages/supabase/.gitignore packages/supabase/seed.sql
git commit -m "chore(supabase): initialize Supabase local config"
```

---

### Task 14: Migration — profiles + auth setup

**Files:**
- Create: `packages/supabase/migrations/20260606000001_profiles.sql`

- [ ] **Step 1: Create profiles migration**

Create `packages/supabase/migrations/20260606000001_profiles.sql`:

```sql
-- Enums
create type user_role as enum ('player', 'admin');
create type user_status as enum ('active', 'frozen_30', 'hibernating_60', 'inactive_90', 'anonymized');
create type pronoun_type as enum ('he/him', 'she/her', 'they/them', 'other');
create type gender_category as enum ('erkek', 'kadin', 'open_only');
create type class_year as enum ('hazirlik', '1', '2', '3', '4', 'yl', 'doktora');
create type skill_level as enum ('baslangic', 'orta', 'ileri');
create type dominant_hand as enum ('sag', 'sol');

-- Profiles table
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'player',
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  pronoun pronoun_type not null,
  pronoun_custom text,
  gender_category gender_category not null,
  department_id uuid,
  class_year class_year not null,
  show_department boolean not null default true,
  show_class_year boolean not null default true,
  skill_self_assessment skill_level not null,
  dominant_hand dominant_hand not null,
  availability_windows text[] not null default '{}'::text[],
  avatar_url text,
  status user_status not null default 'active',
  last_match_at timestamptz,
  pinned_badge_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pronoun_custom_when_other check (
    (pronoun = 'other' and pronoun_custom is not null) or pronoun <> 'other'
  ),
  constraint pinned_badges_max_three check (cardinality(pinned_badge_ids) <= 3)
);

create index profiles_status_idx on public.profiles (status);
create index profiles_last_match_at_idx on public.profiles (last_match_at);
create index profiles_role_idx on public.profiles (role);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

-- Helper function: is current user admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Policies
create policy "Profiles are viewable by all authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins can delete profiles"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());
```

- [ ] **Step 2: Run migrations locally**

Run: `cd packages/supabase && supabase start && supabase db reset`
Expected: Reset successful, migration applied without error.

- [ ] **Step 3: Verify schema via SQL query**

Run:
```bash
supabase db dump --local --schema public --data-only=false | head -100
```
Expected: `profiles` table tanımı gözükür, enum'lar gözükür.

Veya psql ile:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d public.profiles"
```
Expected: Tablo şeması tüm kolonlarla listelenir.

- [ ] **Step 4: Verify RLS enabled**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select relrowsecurity from pg_class where relname='profiles';"`
Expected: `t` (true).

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/migrations/20260606000001_profiles.sql
git commit -m "feat(supabase): add profiles table with RLS"
```

---

### Task 15: Migration — elo_ratings

**Files:**
- Create: `packages/supabase/migrations/20260606000002_elo_ratings.sql`

- [ ] **Step 1: Create elo_ratings migration**

Create `packages/supabase/migrations/20260606000002_elo_ratings.sql`:

```sql
create type match_category as enum (
  'erkek_tek',
  'kadin_tek',
  'open_tek',
  'erkek_cift',
  'kadin_cift',
  'karma_cift',
  'open_cift'
);

create table public.elo_ratings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  category match_category not null,
  rating integer not null default 1200,
  matches_played integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, category),
  constraint rating_in_range check (rating >= 0 and rating <= 4000),
  constraint matches_played_non_negative check (matches_played >= 0)
);

create index elo_ratings_category_rating_idx on public.elo_ratings (category, rating desc);
create index elo_ratings_profile_idx on public.elo_ratings (profile_id);

create trigger elo_ratings_set_updated_at
  before update on public.elo_ratings
  for each row
  execute function public.set_updated_at();

alter table public.elo_ratings enable row level security;

create policy "ELO ratings viewable by authenticated"
  on public.elo_ratings for select
  to authenticated
  using (true);

create policy "Only admins can directly insert/update/delete elo_ratings"
  on public.elo_ratings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Note: Edge Functions kullanır service_role key, bu policy'leri bypass eder
-- Normal kullanıcılar maç onayı üzerinden Edge Function tetikler, kendi ELO'sunu doğrudan değiştiremez
```

- [ ] **Step 2: Apply migration**

Run: `cd packages/supabase && supabase db reset`
Expected: Both migrations apply cleanly.

- [ ] **Step 3: Verify**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d public.elo_ratings"`
Expected: Tablo şeması doğru.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/migrations/20260606000002_elo_ratings.sql
git commit -m "feat(supabase): add elo_ratings table with admin-only writes"
```

---

### Task 16: Migration — courts + departments + seeds

**Files:**
- Create: `packages/supabase/migrations/20260606000003_courts_departments.sql`
- Create: `packages/supabase/seed.sql` (overwrite default)

- [ ] **Step 1: Create migration**

Create `packages/supabase/migrations/20260606000003_courts_departments.sql`:

```sql
create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index courts_display_order_idx on public.courts (display_order);

alter table public.courts enable row level security;

create policy "Courts viewable by all authenticated"
  on public.courts for select
  to authenticated
  using (true);

create policy "Only admins manage courts"
  on public.courts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  faculty text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index departments_name_idx on public.departments (name);
create index departments_faculty_idx on public.departments (faculty);

alter table public.departments enable row level security;

create policy "Departments viewable by all authenticated"
  on public.departments for select
  to authenticated
  using (true);

create policy "Only admins manage departments"
  on public.departments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Now add the FK from profiles → departments
alter table public.profiles
  add constraint profiles_department_fk
  foreign key (department_id) references public.departments(id);
```

- [ ] **Step 2: Create seed.sql with courts and departments**

Overwrite `packages/supabase/seed.sql`:

```sql
-- Courts
insert into public.courts (name, display_order) values
  ('Kort 1', 1),
  ('Kort 2', 2),
  ('Bebek Kort', 3);

-- Departments — Boğaziçi Üniversitesi bölüm listesi
-- Fen-Edebiyat Fakültesi
insert into public.departments (name, faculty, display_order) values
  ('Batı Dilleri ve Edebiyatları', 'Fen-Edebiyat Fakültesi', 1),
  ('Biyoloji', 'Fen-Edebiyat Fakültesi', 2),
  ('Çeviribilim', 'Fen-Edebiyat Fakültesi', 3),
  ('Felsefe', 'Fen-Edebiyat Fakültesi', 4),
  ('Fizik', 'Fen-Edebiyat Fakültesi', 5),
  ('Kimya', 'Fen-Edebiyat Fakültesi', 6),
  ('Matematik', 'Fen-Edebiyat Fakültesi', 7),
  ('Moleküler Biyoloji ve Genetik', 'Fen-Edebiyat Fakültesi', 8),
  ('Psikoloji', 'Fen-Edebiyat Fakültesi', 9),
  ('Sosyoloji', 'Fen-Edebiyat Fakültesi', 10),
  ('Tarih', 'Fen-Edebiyat Fakültesi', 11),
  ('Türk Dili ve Edebiyatı', 'Fen-Edebiyat Fakültesi', 12);

-- İktisadi ve İdari Bilimler Fakültesi
insert into public.departments (name, faculty, display_order) values
  ('Ekonomi', 'İktisadi ve İdari Bilimler Fakültesi', 20),
  ('İşletme', 'İktisadi ve İdari Bilimler Fakültesi', 21),
  ('Siyaset Bilimi ve Uluslararası İlişkiler', 'İktisadi ve İdari Bilimler Fakültesi', 22),
  ('Uluslararası Ticaret', 'İktisadi ve İdari Bilimler Fakültesi', 23);

-- Mühendislik Fakültesi
insert into public.departments (name, faculty, display_order) values
  ('Bilgisayar Mühendisliği', 'Mühendislik Fakültesi', 30),
  ('Biyomedikal Mühendisliği', 'Mühendislik Fakültesi', 31),
  ('Elektrik-Elektronik Mühendisliği', 'Mühendislik Fakültesi', 32),
  ('Endüstri Mühendisliği', 'Mühendislik Fakültesi', 33),
  ('İnşaat Mühendisliği', 'Mühendislik Fakültesi', 34),
  ('Kimya Mühendisliği', 'Mühendislik Fakültesi', 35),
  ('Makine Mühendisliği', 'Mühendislik Fakültesi', 36);

-- Eğitim Fakültesi
insert into public.departments (name, faculty, display_order) values
  ('Bilgisayar ve Öğretim Teknolojileri Eğitimi', 'Eğitim Fakültesi', 40),
  ('Eğitim Bilimleri', 'Eğitim Fakültesi', 41),
  ('İlköğretim', 'Eğitim Fakültesi', 42),
  ('Matematik ve Fen Bilimleri Eğitimi', 'Eğitim Fakültesi', 43),
  ('Ortaöğretim Sosyal Alanlar Eğitimi', 'Eğitim Fakültesi', 44),
  ('Türkçe ve Sosyal Bilimler Eğitimi', 'Eğitim Fakültesi', 45),
  ('Yabancı Diller Eğitimi', 'Eğitim Fakültesi', 46);

-- Uygulamalı Bilimler Yüksekokulu
insert into public.departments (name, faculty, display_order) values
  ('Turizm İşletmeciliği', 'Uygulamalı Bilimler Yüksekokulu', 50),
  ('Yönetim Bilişim Sistemleri', 'Uygulamalı Bilimler Yüksekokulu', 51),
  ('Uluslararası Ticaret (UBYO)', 'Uygulamalı Bilimler Yüksekokulu', 52);

-- Diğer / Hazırlık / YL programları
insert into public.departments (name, faculty, display_order) values
  ('BUSEL (Hazırlık)', 'Yabancı Diller Yüksekokulu', 90),
  ('Yüksek Lisans (Belirtilmemiş)', 'Lisansüstü', 91),
  ('Doktora (Belirtilmemiş)', 'Lisansüstü', 92),
  ('Diğer', 'Diğer', 99);
```

- [ ] **Step 2: Apply migration with seed**

Run: `cd packages/supabase && supabase db reset`
Expected: Migration uygulanır, seed data yüklenir.

- [ ] **Step 3: Verify seed data**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from public.courts;"
```
Expected: `3`

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from public.departments;"
```
Expected: 33+ satır.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/migrations/20260606000003_courts_departments.sql packages/supabase/seed.sql
git commit -m "feat(supabase): add courts and departments with BÜ seed data"
```

---

### Task 17: Migration — match_requests + open_call_applications

**Files:**
- Create: `packages/supabase/migrations/20260606000004_match_requests.sql`

- [ ] **Step 1: Create migration**

Create `packages/supabase/migrations/20260606000004_match_requests.sql`:

```sql
create type match_request_type as enum ('direct_challenge', 'open_call');
create type match_format as enum ('bu_klasik', 'hizli_tiebreak', 'pro_set_8', '3set_klasik');
create type match_request_status as enum ('pending', 'accepted', 'rejected', 'expired', 'completed');
create type application_status as enum ('pending', 'selected', 'declined');

create table public.match_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(user_id) on delete cascade,
  type match_request_type not null,
  target_id uuid references public.profiles(user_id) on delete cascade,
  category match_category not null,
  format match_format not null,
  is_rated boolean not null default true,
  proposed_date date not null,
  proposed_time time not null,
  court_id uuid not null references public.courts(id),
  creator_partner_id uuid references public.profiles(user_id),
  target_partner_id uuid references public.profiles(user_id),
  status match_request_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_challenge_has_target check (
    (type = 'direct_challenge' and target_id is not null) or
    (type = 'open_call' and target_id is null)
  )
);

create index match_requests_creator_status_idx on public.match_requests (creator_id, status);
create index match_requests_target_status_idx on public.match_requests (target_id, status);
create index match_requests_type_status_idx on public.match_requests (type, status);
create index match_requests_expires_at_idx on public.match_requests (expires_at) where status = 'pending';
create index match_requests_category_idx on public.match_requests (category);

create trigger match_requests_set_updated_at
  before update on public.match_requests
  for each row
  execute function public.set_updated_at();

alter table public.match_requests enable row level security;

create policy "All authenticated can view match requests"
  on public.match_requests for select
  to authenticated
  using (true);

create policy "Users can create their own match requests"
  on public.match_requests for insert
  to authenticated
  with check (auth.uid() = creator_id);

create policy "Creator can update their own pending requests"
  on public.match_requests for update
  to authenticated
  using (auth.uid() = creator_id and status = 'pending')
  with check (auth.uid() = creator_id);

create policy "Target can accept/reject directed requests"
  on public.match_requests for update
  to authenticated
  using (auth.uid() = target_id and status = 'pending')
  with check (
    auth.uid() = target_id and
    status in ('accepted', 'rejected')
  );

create policy "Admins can do anything"
  on public.match_requests for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.open_call_applications (
  id uuid primary key default gen_random_uuid(),
  match_request_id uuid not null references public.match_requests(id) on delete cascade,
  applicant_id uuid not null references public.profiles(user_id) on delete cascade,
  applicant_partner_id uuid references public.profiles(user_id),
  status application_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (match_request_id, applicant_id)
);

create index open_call_apps_match_idx on public.open_call_applications (match_request_id);
create index open_call_apps_applicant_idx on public.open_call_applications (applicant_id);

alter table public.open_call_applications enable row level security;

create policy "Authenticated can view applications"
  on public.open_call_applications for select
  to authenticated
  using (true);

create policy "Users can create their own applications"
  on public.open_call_applications for insert
  to authenticated
  with check (auth.uid() = applicant_id);

create policy "Users can withdraw their own applications"
  on public.open_call_applications for delete
  to authenticated
  using (auth.uid() = applicant_id and status = 'pending');

create policy "Request creator can update application status"
  on public.open_call_applications for update
  to authenticated
  using (
    exists (
      select 1 from public.match_requests
      where id = match_request_id and creator_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply migration**

Run: `cd packages/supabase && supabase db reset`
Expected: Migration uygulanır.

- [ ] **Step 3: Verify**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d public.match_requests"`
Expected: Tablo + 5 index gözükür.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/migrations/20260606000004_match_requests.sql
git commit -m "feat(supabase): add match_requests and open_call_applications"
```

---

### Task 18: Migration — matches + match_score_submissions + disputes

**Files:**
- Create: `packages/supabase/migrations/20260606000005_matches.sql`

- [ ] **Step 1: Create migration**

Create `packages/supabase/migrations/20260606000005_matches.sql`:

```sql
create type match_status as enum ('awaiting_confirmation', 'confirmed', 'disputed', 'voided');
create type winner_team as enum ('a', 'b', 'void');
create type dispute_status as enum ('open', 'resolved');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_request_id uuid references public.match_requests(id),
  category match_category not null,
  format match_format not null,
  court_id uuid not null references public.courts(id),
  played_at timestamptz not null,
  is_rated boolean not null default true,
  team_a_player_ids uuid[] not null,
  team_b_player_ids uuid[] not null,
  score_team_a integer not null default 0,
  score_team_b integer not null default 0,
  score_details jsonb,
  winner_team winner_team,
  status match_status not null default 'awaiting_confirmation',
  confirmed_by uuid[] not null default '{}'::uuid[],
  confirmed_at timestamptz,
  voided_reason text,
  rating_before_team_a integer,
  rating_after_team_a integer,
  rating_before_team_b integer,
  rating_after_team_b integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_a_non_empty check (cardinality(team_a_player_ids) > 0),
  constraint team_b_non_empty check (cardinality(team_b_player_ids) > 0),
  constraint teams_disjoint check (
    not (team_a_player_ids && team_b_player_ids)
  )
);

create index matches_team_a_idx on public.matches using gin (team_a_player_ids);
create index matches_team_b_idx on public.matches using gin (team_b_player_ids);
create index matches_played_at_idx on public.matches (played_at desc);
create index matches_status_idx on public.matches (status);
create index matches_category_idx on public.matches (category);
create index matches_request_idx on public.matches (match_request_id);

create trigger matches_set_updated_at
  before update on public.matches
  for each row
  execute function public.set_updated_at();

alter table public.matches enable row level security;

create policy "All authenticated can view matches"
  on public.matches for select
  to authenticated
  using (true);

create policy "Players can confirm their own matches"
  on public.matches for update
  to authenticated
  using (
    auth.uid() = any(team_a_player_ids) or auth.uid() = any(team_b_player_ids)
  )
  with check (
    auth.uid() = any(team_a_player_ids) or auth.uid() = any(team_b_player_ids)
  );

create policy "Admins can do anything"
  on public.matches for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Note: Inserts to matches come from Edge Functions (service_role)

create table public.match_score_submissions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  submitted_by uuid not null references public.profiles(user_id),
  score_details jsonb not null,
  submitted_at timestamptz not null default now()
);

create index mss_match_submitted_idx on public.match_score_submissions (match_id, submitted_at desc);

alter table public.match_score_submissions enable row level security;

create policy "Players can view submissions for their matches"
  on public.match_score_submissions for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        auth.uid() = any(m.team_a_player_ids) or auth.uid() = any(m.team_b_player_ids)
      )
    )
  );

create policy "Players can submit scores for their matches"
  on public.match_score_submissions for insert
  to authenticated
  with check (
    auth.uid() = submitted_by and
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        auth.uid() = any(m.team_a_player_ids) or auth.uid() = any(m.team_b_player_ids)
      )
    )
  );

create policy "Admins can view all submissions"
  on public.match_score_submissions for select
  to authenticated
  using (public.is_admin());

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  raised_by uuid not null references public.profiles(user_id),
  reason text not null,
  status dispute_status not null default 'open',
  resolution_notes text,
  resolved_by uuid references public.profiles(user_id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index disputes_match_idx on public.disputes (match_id);
create index disputes_status_idx on public.disputes (status) where status = 'open';

alter table public.disputes enable row level security;

create policy "Match participants can view their disputes"
  on public.disputes for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        auth.uid() = any(m.team_a_player_ids) or auth.uid() = any(m.team_b_player_ids)
      )
    )
  );

create policy "Match participants can raise disputes"
  on public.disputes for insert
  to authenticated
  with check (
    auth.uid() = raised_by and
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        auth.uid() = any(m.team_a_player_ids) or auth.uid() = any(m.team_b_player_ids)
      )
    )
  );

create policy "Admins manage disputes"
  on public.disputes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
```

- [ ] **Step 2: Apply migration**

Run: `cd packages/supabase && supabase db reset`
Expected: Tüm migrations uygulanır.

- [ ] **Step 3: Verify**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d public.matches"
```
Expected: Tablo + tüm constraint'ler + 6 index gözükür.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/migrations/20260606000005_matches.sql
git commit -m "feat(supabase): add matches, score submissions, and disputes"
```

---

### Task 19: Migration — seasons + tournaments

**Files:**
- Create: `packages/supabase/migrations/20260606000006_seasons_tournaments.sql`

- [ ] **Step 1: Create migration**

Create `packages/supabase/migrations/20260606000006_seasons_tournaments.sql`:

```sql
create type season_name as enum ('guz', 'bahar', 'yaz');
create type season_status as enum ('upcoming', 'active', 'finale', 'closed');
create type tournament_status as enum ('seeded', 'in_progress', 'completed');

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name season_name not null,
  year integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  finale_starts_at timestamptz not null,
  finale_ends_at timestamptz not null,
  status season_status not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, year),
  constraint finale_within_season check (
    finale_starts_at >= starts_at and finale_ends_at <= ends_at
  )
);

create index seasons_status_idx on public.seasons (status);
create index seasons_dates_idx on public.seasons (starts_at, ends_at);

create trigger seasons_set_updated_at
  before update on public.seasons
  for each row
  execute function public.set_updated_at();

alter table public.seasons enable row level security;

create policy "All authenticated can view seasons"
  on public.seasons for select
  to authenticated
  using (true);

create policy "Only admins manage seasons"
  on public.seasons for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.season_standings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  category match_category not null,
  final_rating integer not null,
  rank integer not null,
  matches_played integer not null,
  created_at timestamptz not null default now(),
  unique (season_id, profile_id, category)
);

create index season_standings_season_cat_rank_idx
  on public.season_standings (season_id, category, rank);

alter table public.season_standings enable row level security;

create policy "All authenticated can view standings"
  on public.season_standings for select
  to authenticated
  using (true);

create policy "Only admins manage standings"
  on public.season_standings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  category match_category not null,
  bracket_size integer not null,
  status tournament_status not null default 'seeded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, category),
  constraint bracket_size_valid check (bracket_size in (4, 8))
);

create index tournaments_season_idx on public.tournaments (season_id);
create index tournaments_status_idx on public.tournaments (status);

create trigger tournaments_set_updated_at
  before update on public.tournaments
  for each row
  execute function public.set_updated_at();

alter table public.tournaments enable row level security;

create policy "All authenticated can view tournaments"
  on public.tournaments for select
  to authenticated
  using (true);

create policy "Only admins manage tournaments"
  on public.tournaments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round integer not null,
  match_id uuid references public.matches(id),
  bracket_position integer not null,
  seed_a integer,
  seed_b integer,
  created_at timestamptz not null default now(),
  unique (tournament_id, bracket_position, round),
  constraint round_in_range check (round between 1 and 3)
);

create index tournament_matches_tournament_round_idx
  on public.tournament_matches (tournament_id, round);

alter table public.tournament_matches enable row level security;

create policy "All authenticated can view tournament matches"
  on public.tournament_matches for select
  to authenticated
  using (true);

create policy "Only admins manage tournament matches"
  on public.tournament_matches for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.yearly_championship (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  category match_category not null,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  total_finale_points integer not null,
  rank integer not null,
  created_at timestamptz not null default now(),
  unique (year, category, profile_id)
);

create index yearly_championship_year_cat_rank_idx
  on public.yearly_championship (year, category, rank);

alter table public.yearly_championship enable row level security;

create policy "All authenticated can view yearly championship"
  on public.yearly_championship for select
  to authenticated
  using (true);

create policy "Only admins manage yearly championship"
  on public.yearly_championship for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
```

- [ ] **Step 2: Apply migration**

Run: `cd packages/supabase && supabase db reset`
Expected: Uygulanır.

- [ ] **Step 3: Verify all 5 tables exist**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select tablename from pg_tables where schemaname='public' order by tablename;"
```
Expected: courts, departments, disputes, elo_ratings, match_requests, match_score_submissions, matches, open_call_applications, profiles, season_standings, seasons, tournament_matches, tournaments, yearly_championship.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/migrations/20260606000006_seasons_tournaments.sql
git commit -m "feat(supabase): add seasons, tournaments, and yearly championship"
```

---

### Task 20: Migration — badges + user_badges + seed badges

**Files:**
- Create: `packages/supabase/migrations/20260606000007_badges.sql`
- Modify: `packages/supabase/seed.sql`

- [ ] **Step 1: Create migration**

Create `packages/supabase/migrations/20260606000007_badges.sql`:

```sql
create type badge_category as enum (
  'milestone',
  'win',
  'social',
  'season',
  'fun',
  'loyalty',
  'yearly'
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_tr text not null,
  description_tr text not null,
  icon text not null,
  category badge_category not null,
  is_seasonal boolean not null default false,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index badges_category_idx on public.badges (category);
create index badges_code_idx on public.badges (code);

alter table public.badges enable row level security;

create policy "All authenticated can view badges"
  on public.badges for select
  to authenticated
  using (true);

create policy "Only admins manage badges"
  on public.badges for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  badge_id uuid not null references public.badges(id),
  earned_at timestamptz not null default now(),
  season_id uuid references public.seasons(id),
  unique (profile_id, badge_id, season_id)
);

create index user_badges_profile_idx on public.user_badges (profile_id);
create index user_badges_badge_idx on public.user_badges (badge_id);
create index user_badges_earned_idx on public.user_badges (earned_at desc);

alter table public.user_badges enable row level security;

create policy "All authenticated can view user badges"
  on public.user_badges for select
  to authenticated
  using (true);

create policy "Only admins/system can grant badges"
  on public.user_badges for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can revoke badges"
  on public.user_badges for delete
  to authenticated
  using (public.is_admin());
```

- [ ] **Step 2: Append badges to seed.sql**

Append to `packages/supabase/seed.sql`:

```sql
-- Badges catalog
insert into public.badges (code, name_tr, description_tr, icon, category, is_seasonal, display_order) values
  -- Milestones
  ('milestone_1', 'İlk Maç', 'İlk maçını oynadın!', '🎾', 'milestone', false, 100),
  ('milestone_3', '3 Maç', '3 maç oynadın.', '🎾', 'milestone', false, 101),
  ('milestone_5', '5 Maç', '5 maç oynadın.', '🎾', 'milestone', false, 102),
  ('milestone_10', '10 Maç', '10 maç oynadın.', '🏆', 'milestone', false, 103),
  ('milestone_25', '25 Maç', '25 maç oynadın.', '🏆', 'milestone', false, 104),
  ('milestone_50', '50 Maç', '50 maç oynadın.', '🥇', 'milestone', false, 105),
  ('milestone_100', '100 Maç', '100 maç oynadın!', '🥇', 'milestone', false, 106),
  ('milestone_250', '250 Maç', '250 maç oynadın!', '💎', 'milestone', false, 107),
  ('milestone_500', '500 Maç', 'Efsane: 500 maç!', '💎', 'milestone', false, 108),

  -- Wins
  ('win_1', 'İlk Zafer', 'İlk maçını kazandın!', '🏅', 'win', false, 200),
  ('win_3', '3 Zafer', '3 sıralama maçı kazandın.', '🏅', 'win', false, 201),
  ('win_5', '5 Zafer', '5 sıralama maçı kazandın.', '🏅', 'win', false, 202),
  ('win_10', '10 Zafer', '10 sıralama maçı kazandın.', '🥇', 'win', false, 203),
  ('win_25', '25 Zafer', '25 sıralama maçı kazandın.', '🥇', 'win', false, 204),
  ('win_50', '50 Zafer', '50 sıralama maçı kazandın!', '👑', 'win', false, 205),
  ('win_100', '100 Zafer', '100 sıralama maçı kazandın!', '👑', 'win', false, 206),
  ('win_bagel', 'Bagel', '4-0 (BÜ Klasik) veya 6-0 set kazandın.', '🥯', 'win', false, 210),
  ('win_comeback', 'Comeback', '0-2 setten 3-2''ye veya 1-3''ten 4-3''e döndün.', '🔥', 'win', false, 211),

  -- Social
  ('social_first_doubles', 'İlk Çift Maçı', 'İlk çift maçını oynadın.', '🤝', 'social', false, 300),
  ('social_5_partners', 'Çevremi Genişletiyorum', '5 farklı oyuncuyla çift oynadın.', '🤝', 'social', false, 301),
  ('social_10_opponents', 'Yeni Yüzler', '10 farklı rakiple maç yaptın.', '🌐', 'social', false, 302),

  -- Season (sıfırlanır)
  ('season_top_10', 'Sezon Ladder Top 10', 'Sezon ladder''da Top 10''a girdin.', '⭐', 'season', true, 400),
  ('season_top_3', 'Sezon Ladder Top 3', 'Sezon ladder''da Top 3''e girdin.', '⭐', 'season', true, 401),
  ('season_champion', 'Sezon Şampiyonu', 'Sezon finalini kazandın.', '👑', 'season', true, 402),
  ('season_finalist', 'Sezon Finalisti', 'Sezon finaline kaldın.', '🥈', 'season', true, 403),
  ('season_semifinalist', 'Sezon Yarı Finalisti', 'Sezon yarı finaline kaldın.', '🥉', 'season', true, 404),

  -- Yearly
  ('yearly_champion', 'Yıllık Şampiyon', 'Yılın şampiyonu oldun!', '🏆', 'yearly', false, 500),

  -- Fun
  ('fun_night_owl', 'Gece Kuşu', '22:00 sonrası 5 maç oynadın.', '🦉', 'fun', false, 600),
  ('fun_early_bird', 'Erken Kuş', '09:00 öncesi 5 maç oynadın.', '🐦', 'fun', false, 601),
  ('fun_bebek_lover', 'Bebek Kort Sevdalısı', 'Bebek Kort''ta 10 maç oynadın.', '💙', 'fun', false, 602),
  ('fun_court_hopper', 'Saha Gezgini', '3 farklı kortta da maç oynadın.', '🚶', 'fun', false, 603),
  ('fun_marathon', 'Maraton', '3 Set Klasik formatında 5 maç oynadın.', '🏃', 'fun', false, 604),

  -- Loyalty
  ('loyalty_first_season', '1. Sezon', 'İlk sezonunu tamamladın.', '🎖️', 'loyalty', false, 700),
  ('loyalty_one_year', '1 Yıl', '3 sezon (1 yıl) tamamladın.', '🎖️', 'loyalty', false, 701),
  ('loyalty_founder', 'Kurucu', 'İlk 50 üye arasındasın!', '🏛️', 'loyalty', false, 702);
```

- [ ] **Step 3: Apply migrations + seed**

Run: `cd packages/supabase && supabase db reset`
Expected: Uygulanır, badge seed yüklenir.

- [ ] **Step 4: Verify badge count**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*), category from public.badges group by category order by category;"
```
Expected: ~36 toplam badge, kategorilere dağılmış.

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/migrations/20260606000007_badges.sql packages/supabase/seed.sql
git commit -m "feat(supabase): add badges system with full catalog seed"
```

---

### Task 21: Migration — notifications + push_tokens + preferences

**Files:**
- Create: `packages/supabase/migrations/20260606000008_notifications.sql`

- [ ] **Step 1: Create migration**

Create `packages/supabase/migrations/20260606000008_notifications.sql`:

```sql
create type notification_category as enum (
  'match_proposals',
  'match_reminders',
  'score_confirmations',
  'elo_and_ranking',
  'badges',
  'season_and_tournament',
  'community_announcements',
  'inactivity_warning'
);

create type push_platform as enum ('ios', 'android');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(user_id) on delete cascade,
  category notification_category not null,
  title text not null,
  body text not null,
  data jsonb,
  read_at timestamptz,
  push_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;
create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_created_idx on public.notifications (created_at);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = recipient_id);

create policy "Users can mark their own notifications as read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create policy "Admins can view all notifications"
  on public.notifications for select
  to authenticated
  using (public.is_admin());

-- Inserts come from Edge Functions

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  token text not null,
  platform push_platform not null,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (token)
);

create index push_tokens_profile_idx on public.push_tokens (profile_id);
create index push_tokens_last_active_idx on public.push_tokens (last_active_at);

alter table public.push_tokens enable row level security;

create policy "Users can manage their own push tokens"
  on public.push_tokens for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Admins can view all push tokens"
  on public.push_tokens for select
  to authenticated
  using (public.is_admin());

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  category notification_category not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (profile_id, category)
);

create index notification_prefs_profile_idx on public.notification_preferences (profile_id);

create trigger notification_prefs_set_updated_at
  before update on public.notification_preferences
  for each row
  execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "Users can manage their own preferences"
  on public.notification_preferences for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Defaults: when a profile is created, insert default preferences.
-- 'elo_and_ranking' default OFF, others ON.
create or replace function public.create_default_notification_preferences()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notification_preferences (profile_id, category, enabled)
  values
    (new.user_id, 'match_proposals', true),
    (new.user_id, 'match_reminders', true),
    (new.user_id, 'score_confirmations', true),
    (new.user_id, 'elo_and_ranking', false),
    (new.user_id, 'badges', true),
    (new.user_id, 'season_and_tournament', true),
    (new.user_id, 'community_announcements', true),
    (new.user_id, 'inactivity_warning', true);
  return new;
end;
$$;

create trigger profiles_create_default_prefs
  after insert on public.profiles
  for each row
  execute function public.create_default_notification_preferences();
```

- [ ] **Step 2: Apply migration**

Run: `cd packages/supabase && supabase db reset`
Expected: Uygulanır.

- [ ] **Step 3: Verify trigger exists**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select tgname from pg_trigger where tgname='profiles_create_default_prefs';"
```
Expected: `profiles_create_default_prefs` listelenir.

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/migrations/20260606000008_notifications.sql
git commit -m "feat(supabase): add notifications, push tokens, and preferences"
```

---

### Task 22: Migration — audit_log + announcements

**Files:**
- Create: `packages/supabase/migrations/20260606000009_audit_announcements.sql`

- [ ] **Step 1: Create migration**

Create `packages/supabase/migrations/20260606000009_audit_announcements.sql`:

```sql
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(user_id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_action_idx on public.audit_log (action);
create index audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

create policy "Only admins view audit log"
  on public.audit_log for select
  to authenticated
  using (public.is_admin());

-- Inserts from Edge Functions

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(user_id),
  title text not null,
  body text not null,
  target_filter jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  expires_at timestamptz,
  dismissed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_published_idx on public.announcements (published_at desc)
  where published_at is not null;

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row
  execute function public.set_updated_at();

alter table public.announcements enable row level security;

create policy "Authenticated can view published announcements"
  on public.announcements for select
  to authenticated
  using (published_at is not null);

create policy "Admins manage announcements"
  on public.announcements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
```

- [ ] **Step 2: Apply migration**

Run: `cd packages/supabase && supabase db reset`
Expected: Tüm 9 migration uygulanır, seed çalışır.

- [ ] **Step 3: Verify final schema**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from pg_tables where schemaname='public';"
```
Expected: `21`.

- [ ] **Step 4: Verify all RLS enabled**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select tablename from pg_tables where schemaname='public' and not exists (select 1 from pg_class c where c.relname=tablename and c.relrowsecurity);"
```
Expected: Empty result (zero rows). Eğer satır dönerse → o tablo RLS açık değil, düzeltilmeli.

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/migrations/20260606000009_audit_announcements.sql
git commit -m "feat(supabase): add audit log and announcements"
```

---

### Task 23: Add schema verification script

**Files:**
- Create: `packages/supabase/tests/schema-verification.sql`
- Modify: `packages/supabase/package.json` (yoksa create)

- [ ] **Step 1: Create packages/supabase/package.json**

Create `packages/supabase/package.json`:

```json
{
  "name": "@tennis/supabase",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:status": "supabase status",
    "test": "psql \"postgresql://postgres:postgres@127.0.0.1:54322/postgres\" -v ON_ERROR_STOP=1 -f tests/schema-verification.sql"
  }
}
```

- [ ] **Step 2: Create schema verification script**

Create `packages/supabase/tests/schema-verification.sql`:

```sql
-- Schema Verification Script
-- Tüm assert'ler başarılı olursa script "OK" döner, hata varsa RAISE EXCEPTION ile durur.

do $$
declare
  expected_table_count constant int := 21;
  expected_court_count constant int := 3;
  expected_dept_min_count constant int := 30;
  expected_badge_min_count constant int := 30;
  actual int;
  tbl_without_rls text;
begin
  -- Table count
  select count(*) into actual from pg_tables where schemaname = 'public';
  if actual <> expected_table_count then
    raise exception 'Expected % public tables, got %', expected_table_count, actual;
  end if;
  raise notice 'PASS: % public tables', actual;

  -- All public tables have RLS
  select string_agg(t.tablename, ', ')
    into tbl_without_rls
  from pg_tables t
  join pg_class c on c.relname = t.tablename and c.relnamespace = (
    select oid from pg_namespace where nspname = 'public'
  )
  where t.schemaname = 'public' and c.relrowsecurity = false;

  if tbl_without_rls is not null then
    raise exception 'Tables without RLS: %', tbl_without_rls;
  end if;
  raise notice 'PASS: all public tables have RLS';

  -- Courts seed
  select count(*) into actual from public.courts;
  if actual <> expected_court_count then
    raise exception 'Expected % courts, got %', expected_court_count, actual;
  end if;
  raise notice 'PASS: % courts seeded', actual;

  -- Departments seed
  select count(*) into actual from public.departments;
  if actual < expected_dept_min_count then
    raise exception 'Expected at least % departments, got %', expected_dept_min_count, actual;
  end if;
  raise notice 'PASS: % departments seeded', actual;

  -- Badges seed
  select count(*) into actual from public.badges;
  if actual < expected_badge_min_count then
    raise exception 'Expected at least % badges, got %', expected_badge_min_count, actual;
  end if;
  raise notice 'PASS: % badges seeded', actual;

  -- is_admin function exists
  if not exists (
    select 1 from pg_proc where proname = 'is_admin' and pronamespace = (
      select oid from pg_namespace where nspname = 'public'
    )
  ) then
    raise exception 'is_admin function not found';
  end if;
  raise notice 'PASS: is_admin function exists';

  -- All expected categories enum values
  if not (select array_agg(enumlabel order by enumsortorder) = array[
    'erkek_tek', 'kadin_tek', 'open_tek',
    'erkek_cift', 'kadin_cift', 'karma_cift', 'open_cift'
  ]::text[]
  from pg_enum where enumtypid = (select oid from pg_type where typname = 'match_category')) then
    raise exception 'match_category enum values mismatch';
  end if;
  raise notice 'PASS: match_category enum has 7 values';

  raise notice 'ALL VERIFICATIONS PASSED';
end;
$$ language plpgsql;
```

- [ ] **Step 3: Run verification**

Run: `cd packages/supabase && bun run test`
Expected: `ALL VERIFICATIONS PASSED` çıktısı (NOTICE'lar görünür).

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/package.json packages/supabase/tests/schema-verification.sql
git commit -m "test(supabase): add schema verification script"
```

---

## Faz D — CI

### Task 24: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  shared-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint
        run: bun run lint

      - name: Typecheck (shared)
        working-directory: packages/shared
        run: bun run typecheck

      - name: Test (shared)
        working-directory: packages/shared
        run: bun test

  supabase-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase
        working-directory: packages/supabase
        run: supabase start

      - name: Apply migrations
        working-directory: packages/supabase
        run: supabase db reset --no-seed=false

      - name: Verify schema
        run: |
          psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f packages/supabase/tests/schema-verification.sql

      - name: Stop Supabase
        if: always()
        working-directory: packages/supabase
        run: supabase stop
```

- [ ] **Step 2: Verify YAML is valid**

Run: `cat .github/workflows/ci.yml | head -5`
Expected: Dosya görünür.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions for shared tests and supabase migrations"
```

---

### Task 25: Final integration check

- [ ] **Step 1: Run all tests at root**

Run: `bun install && bun run lint && bunx turbo run test typecheck`
Expected: Hepsi PASS.

- [ ] **Step 2: Run Supabase verification**

Run: `cd packages/supabase && supabase start && supabase db reset && bun run test`
Expected: `ALL VERIFICATIONS PASSED`.

- [ ] **Step 3: Stop Supabase**

Run: `cd packages/supabase && supabase stop`

- [ ] **Step 4: Verify git log**

Run: `git log --oneline`
Expected: ~25+ commit listelenir.

- [ ] **Step 5: Final commit (root-level README opsiyonel)**

Eğer README istersen: Şu an MVP foundation için README opsiyonel — yeterli kod yok henüz. Plan 3'te (mobile auth) README anlamlı olacak. Atlıyoruz.

```bash
git status
```
Expected: clean working tree.

---

## Plan Sonu

Bu plan tamamlandığında elde:

- **bun workspaces monorepo** + Turborepo + Biome + TypeScript
- **`@tennis/shared`** paketi:
  - Category & Format types (7 + 4)
  - ELO formula (K-factor, margin multiplier, doubles desteği)
  - zod schemas (onboarding + match result)
  - ~60+ unit test, hepsi yeşil
- **`@tennis/supabase`** paketi:
  - 21 tablo, hepsi RLS
  - 9 migration
  - Seed data: 3 kort, 33+ bölüm, 36 rozet
  - Schema verification script
- **GitHub Actions CI** — shared tests + supabase migration validation

**Sonraki adım: Plan 2 — Edge Functions ve Cron Jobs.** Plan 2 ile Edge Functions yazılacak: ELO apply, account anonymize, push send, ve 6 cron job (user status update, request expiry, auto-confirm, notification cleanup, season lifecycle, push token cleanup).
