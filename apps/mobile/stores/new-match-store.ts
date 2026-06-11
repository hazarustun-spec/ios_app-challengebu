// apps/mobile/stores/new-match-store.ts — Plan 8 Phase E10-E15.
//
// Wizard state for the "Yeni Maç" flow (`/match/new/...`). Ports the
// design bundle's `window.NM` singleton (see
//   docs/superpowers/specs/plan-8-design-bundle/project/app/screens-match-flow.jsx
// `window.NM = window.NM || { ... }`) into a typed Zustand store so each
// step can read + write the same shared draft without prop-drilling
// through expo-router.
//
// Lifecycle:
//   - E10 (type) chooses `kind`.
//   - E11 (path) chooses `path` (direct vs open call).
//   - E12 (detail) sets `category`, `format`, `date`, `time`, `court`.
//   - E13 (opponent) sets `opponent` (and `partner` for doubles).
//   - E14 (preview) reads everything for the VS layout + ELO predictor.
//   - E15 (format-rules) is read-only; toggles `read` confirmation locally.
//
// Reset is called from the post-send replace to ensure the next entry to
// `/match/new/type` starts fresh.

import { create } from 'zustand';
import type { FormatKey } from '../lib/formats';

export type MatchKind = 'ranking' | 'friendly';
export type MatchPath = 'direct' | 'open';
export type CategoryKey =
  | 'erkek_tek'
  | 'kadin_tek'
  | 'open_tek'
  | 'erkek_cift'
  | 'kadin_cift'
  | 'karma_cift'
  | 'open_cift';

export interface OpponentChoice {
  userId: string;
  name: string;
  elo: number;
}

export interface NewMatchState {
  kind: MatchKind;
  path: MatchPath;
  category: CategoryKey;
  format: FormatKey;
  /** Display label, e.g. "Bugün", "Yarın", "8 Haz". */
  date: string;
  /** "HH:mm". */
  time: string;
  /** Court label (e.g. "Kort 1"). Backed by the real `courts` table later. */
  court: string;
  opponent: OpponentChoice | null;
  /** Only set on doubles categories — partner for the player creating the match. */
  partner: OpponentChoice | null;
  setField: <K extends keyof Omit<NewMatchState, 'setField' | 'reset'>>(
    k: K,
    v: NewMatchState[K],
  ) => void;
  reset: () => void;
}

const INITIAL: Omit<NewMatchState, 'setField' | 'reset'> = {
  kind: 'ranking',
  path: 'direct',
  category: 'erkek_tek',
  format: 'klasik',
  date: 'Bugün',
  time: '18:30',
  court: 'Kort 1',
  opponent: null,
  partner: null,
};

export const useNewMatchStore = create<NewMatchState>((set) => ({
  ...INITIAL,
  setField: (k, v) => set((s) => ({ ...s, [k]: v })),
  reset: () => set(INITIAL),
}));
