// apps/mobile/lib/formats.ts — Plan 8 Phase C9.
//
// Source of truth for the four playable match formats (BÜ Klasik, Hızlı
// Tiebreak, Pro Set 8, 3 Set Klasik). Ports the design bundle's `FORMATS`
// table from
//   docs/superpowers/specs/plan-8-design-bundle/project/app/data.jsx
// and adds a two-way mapping to the backend `match_format` enum so screens
// can round-trip between the UI key (`klasik`) and the persisted enum value
// (`bu_klasik`).
//
// Consumers: FormatChip, match preview / result screens, leaderboard
// filters, ELO history rows, season + tournament screens.

import type { MatchFormat as MatchFormatDb } from '@tennis/shared';
import type { IconName } from '../components/ui/Icon';

export type FormatKey = 'klasik' | 'tiebreak' | 'proset' | 'set3';

export interface FormatDef {
  key: FormatKey;
  name: string;
  /** Short slot label (e.g., "4 El", "10 Sayı", "ATP"). */
  tag: string;
  /** Brand color rendered as text + tinted background by `FormatChip`. */
  color: string;
  /** Glyph rendered by `FormatChip`. */
  mark: IconName;
  /**
   * Human-readable ELO multiplier ladder rendered on the
   * `/match/new/format-rules` screen (Plan 8 E15). Mirrors the design
   * bundle's `FORMATS[].mult` strings — score margins map to a multiplier
   * that scales the K-factor delta for the winner.
   */
  mult: string;
}

export const FORMATS: FormatDef[] = [
  {
    key: 'klasik',
    name: 'Klasik',
    tag: '4 El',
    color: '#2742A0',
    mark: 'spark',
    mult: '4-0 → 1.5×  ·  4-1 → 1.3×  ·  4-2 → 1.1×  ·  4-3 → 1.0×',
  },
  {
    key: 'tiebreak',
    name: 'Hızlı Tiebreak',
    tag: '10 Sayı',
    color: '#2E63B8',
    mark: 'bolt',
    mult: '10-0 → 1.5×  ·  10-5 → 1.2×  ·  10-8 → 1.0×',
  },
  {
    key: 'proset',
    name: 'Pro Set 8',
    tag: '8 Oyun',
    color: '#5E8B39',
    mark: 'shield',
    mult: '8-0 → 1.5×  ·  8-4 → 1.2×  ·  9-8 tb → 1.0×',
  },
  {
    key: 'set3',
    name: '3 Set Klasik',
    tag: 'ATP',
    color: '#7A4FA0',
    mark: 'trophy',
    mult: '2-0 set → 1.3×  ·  2-1 set → 1.0×',
  },
];

export function formatByKey(key: FormatKey): FormatDef {
  // The map is closed over a fixed literal union, so this lookup is total.
  return FORMATS.find((f) => f.key === key)!;
}

// ---------------------------------------------------------------------------
// UI ↔ DB enum mapping
// ---------------------------------------------------------------------------
//
// Backend enum lives in `@tennis/shared` (`packages/shared/src/types/formats.ts`
// → `ALL_FORMATS`/`MatchFormat`). Keep these maps symmetric — the test in
// `__tests__/DomainChips.test.tsx` enforces round-tripping.

export type { MatchFormatDb };

export const UI_TO_DB_FORMAT: Record<FormatKey, MatchFormatDb> = {
  klasik: 'bu_klasik',
  tiebreak: 'hizli_tiebreak',
  proset: 'pro_set_8',
  set3: '3set_klasik',
};

export const DB_TO_UI_FORMAT: Record<MatchFormatDb, FormatKey> = {
  bu_klasik: 'klasik',
  hizli_tiebreak: 'tiebreak',
  pro_set_8: 'proset',
  '3set_klasik': 'set3',
};

// ---------------------------------------------------------------------------
// ELO K-factor constants (mirrors packages/supabase/functions/_shared/elo.ts)
// ---------------------------------------------------------------------------
// Kept here so preview.tsx and format-rules.tsx always read from the same
// place and cannot diverge from server logic.
//
// Server source: packages/supabase/functions/_shared/elo.ts
//   K_NEW_PLAYER = 40  (matchesPlayed < 10)
//   K_ESTABLISHED = 20 (matchesPlayed >= 10)

export const K_NEW_PLAYER = 40;
export const K_ESTABLISHED = 20;
export const NEW_PLAYER_THRESHOLD = 10;

/** Returns the K-factor the server will apply for a player's next rated match. */
export function clientKFactor(matchesPlayed: number): number {
  return matchesPlayed < NEW_PLAYER_THRESHOLD ? K_NEW_PLAYER : K_ESTABLISHED;
}
