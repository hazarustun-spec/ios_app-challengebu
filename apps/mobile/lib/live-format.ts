// What a live match counts, per format.
//
// Every format in this app scores in a different unit, and until now the live
// engine pretended they were all BÜ Klasik: it accumulated 15/30/40 rally
// points into games and declared a winner at 4 games, whatever format the two
// players had actually agreed on.
//
// This module is the client half of that rule. The server half is
// `public.live_score_rule` (migration 20260909000001) and the Live Activity's
// is `targets/live-activity/ScoreFormat.swift`. All three must agree; the
// server is the authority, and the pgTAP tests in
// packages/supabase/tests/database/live-score-formats.test.sql pin it.
//
// Points are deliberately not modelled here. Nobody picks up a phone between
// rallies, so the phone records the unit players actually say out loud — the
// game, the tiebreak point, the set. Point-by-point entry is planned for an
// Apple Watch mode, where it costs a wrist tap instead of a pocket dig.

import type { MatchFormat } from '@tennis/shared';

export interface LiveFormatRule {
  /** Singular name of one unit, as it appears mid-sentence. */
  unit: string;
  /** Plural/collective form for headers. */
  unitPlural: string;
  /** Units needed to win outright. */
  target: number;
  /** Units the winner must lead by. */
  margin: number;
  /**
   * Unit count that ends the match regardless of margin — the decider.
   * Klasik's seventh game (4-3) and Pro Set's tiebreak (9-8) both land here.
   * `null` means the match runs until the margin is met.
   */
  cap: number | null;
  /**
   * Largest number of units the two sides can total between them, for the
   * "EL 5 / 7" style progress line. `null` where the format is open-ended.
   */
  maxTotal: number | null;
}

export const LIVE_FORMAT_RULES: Record<MatchFormat, LiveFormatRule> = {
  // First to 4 games, at most seven games played: 3-3 is followed by a decider
  // and the match ends 4-3. There is no draw — the engine used to void at 3-3,
  // which contradicted both the "EL n / 7" counter and the format-rules screen's
  // advertised `4-3 → 1.0×`.
  bu_klasik: {
    unit: 'oyun',
    unitPlural: 'oyun',
    target: 4,
    margin: 1,
    cap: 4,
    maxTotal: 7,
  },
  // First to 8 games with two to spare; 8-8 goes to a tiebreak and ends 9-8.
  pro_set_8: {
    unit: 'oyun',
    unitPlural: 'oyun',
    target: 8,
    margin: 2,
    cap: 9,
    maxTotal: 17,
  },
  // A single tiebreak to 10, two clear. 12-10 and beyond are legal.
  hizli_tiebreak: {
    unit: 'sayı',
    unitPlural: 'sayı',
    target: 10,
    margin: 2,
    cap: null,
    maxTotal: null,
  },
  // Best of three: the score entered is the SET score, 2-0 or 2-1.
  '3set_klasik': {
    unit: 'set',
    unitPlural: 'set',
    target: 2,
    margin: 1,
    cap: 2,
    maxTotal: 3,
  },
};

export function liveFormatRule(format: MatchFormat | undefined): LiveFormatRule {
  return LIVE_FORMAT_RULES[format ?? 'bu_klasik'];
}

/**
 * Has `a` won, given the rule? Mirrors the server's condition exactly, and is
 * only used to render ahead of the round trip — `live_match_scores.phase` is
 * what actually decides.
 */
export function unitsWin(rule: LiveFormatRule, a: number, b: number): boolean {
  if (a >= rule.target && a - b >= rule.margin) return true;
  return rule.cap !== null && a >= rule.cap;
}

/**
 * "EL 5 / 7" for Klasik, "SAYI 13" for an open-ended tiebreak. The label names
 * the unit so a player never has to guess whether the 4 on screen is games or
 * sets — the confusion that made a 3 Set Klasik result read like a Klasik one.
 */
export function progressLabel(rule: LiveFormatRule, a: number, b: number): string {
  const played = a + b;
  const head = rule.unit.toLocaleUpperCase('tr-TR');
  if (rule.maxTotal === null) return `${head} ${played + 1}`;
  return `${head} ${Math.min(played + 1, rule.maxTotal)} / ${rule.maxTotal}`;
}
