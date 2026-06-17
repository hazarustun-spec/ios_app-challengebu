// lib/opponent-suggest.ts — Pure scoring for the "Sana uygun rakipler" feature.
//
// Given the current player (Me) and a list of same-category candidates, rank them
// by a combined score of ELO proximity, availability-window overlap, and freshness
// (how recently you last played them). No React-Native imports → unit-testable.

export interface Me {
  userId: string;
  rating: number;
  /** Availability window keys, e.g. "mon-eve". */
  availability: string[];
  /** User ids the current player has blocked (or been blocked by). */
  blocked: Set<string>;
}

export interface Candidate {
  userId: string;
  name: string;
  rating: number;
  availability: string[];
  /** Days since the last completed match against this player; null = never played. */
  playedDaysAgo: number | null;
}

export interface ScoredCandidate extends Candidate {
  score: number;
}

// Tunables.
const ELO_BAND = 400; // ratings this far apart score ~0 on proximity
const W_ELO = 1.0;
const W_OVERLAP = 0.3;
const FRESH_BONUS = 0.2; // never played before
const RECENCY_WINDOW = 14; // days; played more recently than this is penalized
const RECENT_PENALTY = 0.5;

function eloProximity(a: number, b: number): number {
  return Math.max(0, 1 - Math.abs(a - b) / ELO_BAND);
}

function overlapCount(a: string[], b: string[]): number {
  const set = new Set(a);
  let n = 0;
  for (const x of b) if (set.has(x)) n += 1;
  return n;
}

function freshness(playedDaysAgo: number | null): number {
  if (playedDaysAgo === null) return FRESH_BONUS;
  if (playedDaysAgo >= RECENCY_WINDOW) return 0;
  // Linear penalty: harsher the more recently you played them.
  return -(1 - playedDaysAgo / RECENCY_WINDOW) * RECENT_PENALTY;
}

/**
 * Score + rank candidates for the current player. Excludes the player themselves
 * and any blocked users. Returns a new array sorted by descending score.
 */
export function scoreCandidates(me: Me, candidates: Candidate[]): ScoredCandidate[] {
  return candidates
    .filter((c) => c.userId !== me.userId && !me.blocked.has(c.userId))
    .map((c) => ({
      ...c,
      score:
        W_ELO * eloProximity(me.rating, c.rating) +
        W_OVERLAP * overlapCount(me.availability, c.availability) +
        freshness(c.playedDaysAgo),
    }))
    .sort((a, b) => b.score - a.score);
}
