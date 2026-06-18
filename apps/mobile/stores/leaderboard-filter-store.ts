// stores/leaderboard-filter-store.ts — Zustand store for leaderboard filter state.
//
// Mirrors the existing store pattern (see score-entry-store.ts).
// Also exports pure helpers `applyLadderFilter` and `isFilterActive` that are
// shared between leaderboard.tsx and leaderboard/filter.tsx so the two screens
// stay in sync without prop-drilling.

import { create } from 'zustand';
import type { LadderRow } from '../hooks/use-ladder';

// ─── Public types ────────────────────────────────────────────────────────────

export interface LadderFilter {
  eloMin: number;
  eloMax: number;
  availability: string[];
  showFrozen: boolean;
  showHibernating: boolean;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: LadderFilter = {
  eloMin: 900,
  eloMax: 2000,
  availability: [],
  showFrozen: true,
  showHibernating: false,
};

// ─── Pure helpers (exported for both screens) ────────────────────────────────

/**
 * Filter a ladder row array by the given LadderFilter.
 *
 * A row is kept when:
 *   1. rating is within [eloMin, eloMax]
 *   2. availability is empty OR the row shares at least one window key
 *   3. if status === 'frozen_30', showFrozen must be true
 *   4. if status === 'hibernating_60', showHibernating must be true
 *   (active rows always pass checks 3 & 4)
 */
export function applyLadderFilter(rows: LadderRow[], f: LadderFilter): LadderRow[] {
  return rows.filter((row) => {
    // ELO range
    if (row.rating < f.eloMin || row.rating > f.eloMax) return false;
    // Availability: empty means "any"
    if (
      f.availability.length > 0 &&
      !f.availability.some((k) => row.availabilityWindows.includes(k))
    ) {
      return false;
    }
    // Status toggles
    if (row.status === 'frozen_30' && !f.showFrozen) return false;
    if (row.status === 'hibernating_60' && !f.showHibernating) return false;
    return true;
  });
}

/**
 * Returns true when any filter field differs from its default value.
 * Used by the leaderboard tab to show a visual "filter active" indicator.
 */
export function isFilterActive(f: LadderFilter): boolean {
  return (
    f.eloMin !== DEFAULTS.eloMin ||
    f.eloMax !== DEFAULTS.eloMax ||
    f.availability.length > 0 ||
    !f.showFrozen ||
    f.showHibernating
  );
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface State extends LadderFilter {
  setElo: (min: number, max: number) => void;
  toggleAvailability: (key: string) => void;
  setShowFrozen: (b: boolean) => void;
  setShowHibernating: (b: boolean) => void;
  reset: () => void;
}

export const useLeaderboardFilterStore = create<State>((set) => ({
  ...DEFAULTS,
  setElo: (min, max) => set({ eloMin: min, eloMax: max }),
  toggleAvailability: (key) =>
    set((s) => ({
      availability: s.availability.includes(key)
        ? s.availability.filter((k) => k !== key)
        : [...s.availability, key],
    })),
  setShowFrozen: (b) => set({ showFrozen: b }),
  setShowHibernating: (b) => set({ showHibernating: b }),
  reset: () => set({ ...DEFAULTS }),
}));
