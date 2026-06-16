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
import { toIso } from '../lib/match-dates';

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
  /** Strict ISO calendar date (YYYY-MM-DD) — the shape the API requires. */
  date: string;
  /** "HH:mm". */
  time: string;
  /** Court UUID from the `courts` table (empty until the user picks one). */
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

// `date` defaults to "today" — re-derived on every reset() so a long-lived
// app session never starts the wizard on a stale calendar date.
const baseInitial: Omit<NewMatchState, 'setField' | 'reset' | 'date'> = {
  kind: 'ranking',
  path: 'direct',
  category: 'erkek_tek',
  format: 'klasik',
  time: '18:30',
  court: '',
  opponent: null,
  partner: null,
};

const freshInitial = (): Omit<NewMatchState, 'setField' | 'reset'> => ({
  ...baseInitial,
  date: toIso(new Date()),
});

export const useNewMatchStore = create<NewMatchState>((set) => ({
  ...freshInitial(),
  setField: (k, v) => set((s) => ({ ...s, [k]: v })),
  reset: () => set(freshInitial()),
}));
