// apps/mobile/lib/levels.ts — Plan 8 Phase C9.
//
// Source of truth for the seven ELO-derived player levels (Çekirge →
// Şampiyon). Ports the design bundle's `LEVELS` table + `levelForElo` /
// `levelProgress` helpers from
//   docs/superpowers/specs/plan-8-design-bundle/project/app/icons.jsx
// `const LEVELS = [...]`, `function levelForElo(elo)`,
// `function levelProgress(elo)`.
//
// Consumers: LevelIcon, Avatar level badge, leaderboard rows, profile
// header, season/tournament screens, ELO history detail, etc.

import type { IconName } from '../components/ui/Icon';

export type LevelKey =
  | 'cekirge'
  | 'caylak'
  | 'amator'
  | 'rekabet'
  | 'usta'
  | 'elit'
  | 'sampiyon';

export interface LevelDef {
  key: LevelKey;
  name: string;
  /** Hex color — paired with the Icon glyph below. */
  color: string;
  /** Icon glyph rendered by `LevelIcon`. */
  icon: IconName;
  /** Inclusive lower-bound ELO for this level. */
  minElo: number;
}

export const LEVELS: LevelDef[] = [
  { key: 'cekirge',  name: 'Çekirge',   color: '#5E8B39', icon: 'spark',  minElo: 0 },
  { key: 'caylak',   name: 'Çaylak',    color: '#6F8B47', icon: 'bolt',   minElo: 1100 },
  { key: 'amator',   name: 'Amatör',    color: '#2E63B8', icon: 'shield', minElo: 1300 },
  { key: 'rekabet',  name: 'Rekabetçi', color: '#2742A0', icon: 'flame',  minElo: 1500 },
  { key: 'usta',     name: 'Usta',      color: '#2A3A8E', icon: 'crown',  minElo: 1700 },
  { key: 'elit',     name: 'Elit',      color: '#2B357A', icon: 'crown',  minElo: 1900 },
  { key: 'sampiyon', name: 'Şampiyon',  color: '#B98A1E', icon: 'trophy', minElo: 2100 },
];

/**
 * Map an ELO value to its level definition. Walks `LEVELS` in order; the last
 * entry whose `minElo` is `<= elo` wins (so an ELO of 1100 maps to "caylak",
 * not "cekirge").
 */
export function levelForElo(elo: number): LevelDef {
  let lv = LEVELS[0]!;
  for (const L of LEVELS) if (elo >= L.minElo) lv = L;
  return lv;
}

/**
 * Progress data for a player's *current* level — used by `LevelRing` and the
 * profile header progress bar.
 *
 * - `current` : the level the player is currently in (per `levelForElo`)
 * - `next`    : the level above; `null` when the player is at the top (Şampiyon)
 * - `pct`     : 0..1 progress toward `next.minElo`; clamped, `1` when no next
 * - `toNext`  : ELO points still needed to reach `next.minElo`; `0` at top
 */
export function levelProgress(elo: number): {
  current: LevelDef;
  next: LevelDef | null;
  pct: number;
  toNext: number;
} {
  // Find the first level whose threshold is *strictly above* `elo` — the one
  // before it is the player's current level.
  const aboveIdx = LEVELS.findIndex((l) => elo < l.minElo);
  const currentIdx = aboveIdx === -1 ? LEVELS.length - 1 : aboveIdx - 1;
  const current = LEVELS[Math.max(0, currentIdx)]!;
  const next = currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1]! : null;
  if (!next) return { current, next: null, pct: 1, toNext: 0 };
  const span = next.minElo - current.minElo;
  const pct = span <= 0 ? 1 : Math.min(1, Math.max(0, (elo - current.minElo) / span));
  return { current, next, pct, toNext: next.minElo - elo };
}
