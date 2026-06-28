// Pure-unit tests for the ELO engine in functions/_shared/elo.ts.
// No database, no Supabase client — these import the pure functions directly
// and assert the algorithm: expected-score formula, K-factor selection,
// win/loss deltas (zero-sum), the absence of rating floors/caps, doubles vs
// singles distribution, and every MatchFormat's margin-multiplier behaviour.
//
// Run:
//   cd packages/supabase && deno test --config functions/deno.json \
//     --allow-read tests/functions/elo-unit.deno-test.ts

import { assertAlmostEquals, assertEquals, assertThrows } from 'jsr:@std/assert';
import {
  ALL_FORMATS,
  calculateDoublesEloChange,
  calculateEloChange,
  DEFAULT_STARTING_ELO,
  expectedScore,
  getKFactor,
  getMarginMultiplier,
  K_ESTABLISHED,
  K_NEW_PLAYER,
  type MatchFormat,
  NEW_PLAYER_THRESHOLD,
} from '../../functions/_shared/elo.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

Deno.test('constants: published values', () => {
  assertEquals(K_NEW_PLAYER, 40);
  assertEquals(K_ESTABLISHED, 20);
  assertEquals(NEW_PLAYER_THRESHOLD, 10);
  assertEquals(DEFAULT_STARTING_ELO, 1200);
  assertEquals(ALL_FORMATS, ['bu_klasik', 'hizli_tiebreak', 'pro_set_8', '3set_klasik']);
});

// ---------------------------------------------------------------------------
// expectedScore — logistic curve, base 10, scale 400
// ---------------------------------------------------------------------------

Deno.test('expectedScore: equal ratings → 0.5', () => {
  assertAlmostEquals(expectedScore(1200, 1200), 0.5, 1e-12);
  assertAlmostEquals(expectedScore(0, 0), 0.5, 1e-12);
});

Deno.test('expectedScore: +400 rating ≈ 0.909, -400 ≈ 0.091', () => {
  assertAlmostEquals(expectedScore(1600, 1200), 1 / 1.1, 1e-12);
  assertAlmostEquals(expectedScore(1200, 1600), 0.1 / 1.1, 1e-12);
});

Deno.test('expectedScore: symmetric — eA + eB = 1', () => {
  const a = 1453;
  const b = 1187;
  assertAlmostEquals(expectedScore(a, b) + expectedScore(b, a), 1, 1e-12);
});

Deno.test('expectedScore: monotonic in rating gap', () => {
  // Higher relative rating → higher expected score.
  const e0 = expectedScore(1200, 1200);
  const e1 = expectedScore(1300, 1200);
  const e2 = expectedScore(1400, 1200);
  if (!(e0 < e1 && e1 < e2)) {
    throw new Error(`expected monotonic increase, got ${e0}, ${e1}, ${e2}`);
  }
});

// ---------------------------------------------------------------------------
// getKFactor — new vs established threshold
// ---------------------------------------------------------------------------

Deno.test('getKFactor: below threshold → K_NEW_PLAYER (40)', () => {
  assertEquals(getKFactor(0), 40);
  assertEquals(getKFactor(5), 40);
  assertEquals(getKFactor(9), 40);
});

Deno.test('getKFactor: at/above threshold → K_ESTABLISHED (20)', () => {
  assertEquals(getKFactor(10), 20); // threshold is exclusive for "new"
  assertEquals(getKFactor(11), 20);
  assertEquals(getKFactor(100), 20);
});

Deno.test('getKFactor: rejects negative and non-integer input', () => {
  assertThrows(() => getKFactor(-1), Error);
  assertThrows(() => getKFactor(3.5), Error);
  assertThrows(() => getKFactor(NaN), Error);
});

// ---------------------------------------------------------------------------
// getMarginMultiplier — per-format thresholds
// ---------------------------------------------------------------------------

Deno.test('getMarginMultiplier: bu_klasik diff buckets', () => {
  assertEquals(getMarginMultiplier('bu_klasik', 4, 0), 1.5); // diff 4
  assertEquals(getMarginMultiplier('bu_klasik', 4, 1), 1.3); // diff 3
  assertEquals(getMarginMultiplier('bu_klasik', 4, 2), 1.1); // diff 2
  assertEquals(getMarginMultiplier('bu_klasik', 4, 3), 1.0); // diff 1
  assertEquals(getMarginMultiplier('bu_klasik', 6, 0), 1.5); // diff >= 4 capped
});

Deno.test('getMarginMultiplier: hizli_tiebreak diff buckets', () => {
  assertEquals(getMarginMultiplier('hizli_tiebreak', 10, 0), 1.5); // diff 10
  assertEquals(getMarginMultiplier('hizli_tiebreak', 10, 5), 1.2); // diff 5
  assertEquals(getMarginMultiplier('hizli_tiebreak', 10, 6), 1.0); // diff 4 (<5)
  assertEquals(getMarginMultiplier('hizli_tiebreak', 10, 8), 1.0); // diff 2
});

Deno.test('getMarginMultiplier: hizli_tiebreak boundary at diff 5/4', () => {
  assertEquals(getMarginMultiplier('hizli_tiebreak', 11, 6), 1.2); // diff 5
  assertEquals(getMarginMultiplier('hizli_tiebreak', 10, 7), 1.0); // diff 3 (<5)
});

Deno.test('getMarginMultiplier: pro_set_8 diff buckets', () => {
  assertEquals(getMarginMultiplier('pro_set_8', 8, 0), 1.5); // diff 8
  assertEquals(getMarginMultiplier('pro_set_8', 8, 4), 1.2); // diff 4
  assertEquals(getMarginMultiplier('pro_set_8', 9, 8), 1.0); // diff 1
  assertEquals(getMarginMultiplier('pro_set_8', 8, 3), 1.2); // diff 5 (>=4)
});

Deno.test('getMarginMultiplier: 3set_klasik diff buckets', () => {
  assertEquals(getMarginMultiplier('3set_klasik', 2, 0), 1.3); // diff 2
  assertEquals(getMarginMultiplier('3set_klasik', 2, 1), 1.0); // diff 1
});

Deno.test('getMarginMultiplier: rejects invalid scores', () => {
  assertThrows(() => getMarginMultiplier('bu_klasik', 4, 4), Error); // loser == winner
  assertThrows(() => getMarginMultiplier('bu_klasik', 4, 5), Error); // loser > winner
  assertThrows(() => getMarginMultiplier('bu_klasik', 4, -1), Error); // negative
  assertThrows(() => getMarginMultiplier('bu_klasik', 4.5, 1), Error); // non-integer
});

// ---------------------------------------------------------------------------
// calculateEloChange (singles) — deltas, zero-sum, K selection, margin
// ---------------------------------------------------------------------------

Deno.test('singles: equal ratings, new player, no margin → +/-20', () => {
  // K=40 (new), expected 0.5, margin 1.0 → 40 * 0.5 * 1.0 = 20.
  const r = calculateEloChange({
    winnerRating: 1200,
    loserRating: 1200,
    winnerMatchesPlayed: 0,
    loserMatchesPlayed: 0,
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 3,
  });
  assertEquals(r.winnerChange, 20);
  assertEquals(r.loserChange, -20);
  assertEquals(r.winnerNewRating, 1220);
  assertEquals(r.loserNewRating, 1180);
});

Deno.test('singles: established player uses K=20', () => {
  // K=20, expected 0.5, margin 1.0 → 20 * 0.5 = 10.
  const r = calculateEloChange({
    winnerRating: 1200,
    loserRating: 1200,
    winnerMatchesPlayed: 50,
    loserMatchesPlayed: 50,
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 3,
  });
  assertEquals(r.winnerChange, 10);
  assertEquals(r.loserChange, -10);
});

Deno.test("singles: K-factor follows the WINNER's match count only", () => {
  // New winner vs established loser → K=40 (winner's K), not min().
  const newWinner = calculateEloChange({
    winnerRating: 1200,
    loserRating: 1200,
    winnerMatchesPlayed: 0,
    loserMatchesPlayed: 500,
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 3,
  });
  assertEquals(newWinner.winnerChange, 20); // K=40

  // Established winner vs new loser → K=20 (winner's K).
  const estWinner = calculateEloChange({
    winnerRating: 1200,
    loserRating: 1200,
    winnerMatchesPlayed: 500,
    loserMatchesPlayed: 0,
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 3,
  });
  assertEquals(estWinner.winnerChange, 10); // K=20
});

Deno.test('singles: zero-sum holds across rating gaps and margins', () => {
  const cases: Array<[number, number, MatchFormat, number, number, number]> = [
    [1200, 1200, 'bu_klasik', 4, 0, 0],
    [1000, 1600, 'hizli_tiebreak', 10, 8, 3],
    [1800, 1100, 'pro_set_8', 8, 0, 25],
    [1350, 1342, '3set_klasik', 2, 1, 70],
  ];
  for (const [wr, lr, fmt, ws, ls, mp] of cases) {
    const r = calculateEloChange({
      winnerRating: wr,
      loserRating: lr,
      winnerMatchesPlayed: mp,
      loserMatchesPlayed: mp,
      format: fmt,
      winnerScore: ws,
      loserScore: ls,
    });
    // Zero-sum: what the winner gains, the loser loses (exactly).
    assertEquals(r.loserChange, -r.winnerChange);
    assertEquals(r.winnerNewRating - wr, r.winnerChange);
    assertEquals(r.loserNewRating - lr, r.loserChange);
  }
});

Deno.test('singles: margin multiplier scales the delta', () => {
  const base = {
    winnerRating: 1200,
    loserRating: 1200,
    winnerMatchesPlayed: 0,
    loserMatchesPlayed: 0,
    format: 'bu_klasik' as MatchFormat,
  };
  // diff 1 (4-3) → margin 1.0 → 20; diff 4 (4-0) → margin 1.5 → 30.
  const close = calculateEloChange({ ...base, winnerScore: 4, loserScore: 3 });
  const blowout = calculateEloChange({ ...base, winnerScore: 4, loserScore: 0 });
  assertEquals(close.winnerChange, 20);
  assertEquals(blowout.winnerChange, 30);
});

Deno.test('singles: big upset → large winner gain (K=40, low expected)', () => {
  // 1000 beats 1600: expected ≈ 0.0307, raw = 40*(1-0.0307)*1.0 ≈ 38.77 → 39.
  const r = calculateEloChange({
    winnerRating: 1000,
    loserRating: 1600,
    winnerMatchesPlayed: 0,
    loserMatchesPlayed: 0,
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 3,
  });
  assertEquals(r.winnerChange, 39);
  assertEquals(r.loserChange, -39);
});

Deno.test('singles: favourite winning gains little', () => {
  // 1600 beats 1000: expected ≈ 0.969, raw = 40*(1-0.969) ≈ 1.23 → 1.
  const r = calculateEloChange({
    winnerRating: 1600,
    loserRating: 1000,
    winnerMatchesPlayed: 0,
    loserMatchesPlayed: 0,
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 3,
  });
  assertEquals(r.winnerChange, 1);
  assertEquals(r.loserChange, -1);
});

Deno.test('singles: each MatchFormat produces its expected blowout delta', () => {
  // All with equal ratings (expected 0.5) and K=40 → delta = round(20 * margin).
  // Max-margin (1.5) blowout for each format except 3set (max 1.3).
  const expectations: Array<[MatchFormat, number, number, number]> = [
    ['bu_klasik', 4, 0, 30], // 20 * 1.5
    ['hizli_tiebreak', 10, 0, 30], // 20 * 1.5
    ['pro_set_8', 8, 0, 30], // 20 * 1.5
    ['3set_klasik', 2, 0, 26], // 20 * 1.3
  ];
  for (const [fmt, ws, ls, expected] of expectations) {
    const r = calculateEloChange({
      winnerRating: 1200,
      loserRating: 1200,
      winnerMatchesPlayed: 0,
      loserMatchesPlayed: 0,
      format: fmt,
      winnerScore: ws,
      loserScore: ls,
    });
    assertEquals(r.winnerChange, expected, `format ${fmt}`);
  }
});

Deno.test('singles: no rating floor or cap is applied', () => {
  // Engine adds/subtracts freely; new rating is always exactly
  // rating + change, with NO clamping in elo.ts.

  // No floor: a low-rated loser drops below the 1200 starting value and below
  // any conventional floor (e.g. 100), straight off rating + change.
  const lowLoser = calculateEloChange({
    winnerRating: 110,
    loserRating: 110,
    winnerMatchesPlayed: 0,
    loserMatchesPlayed: 0,
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 0, // margin 1.5, K=40 → change 30
  });
  assertEquals(lowLoser.loserChange, -30);
  assertEquals(lowLoser.loserNewRating, 80); // 110 - 30, below 100; not clamped
  assertEquals(lowLoser.winnerNewRating, 140); // 110 + 30, no cap

  // Rating can even be driven negative — confirms there is truly no floor.
  const negative = calculateEloChange({
    winnerRating: -5000, // extreme underdog → winnerChange ≈ K*margin
    loserRating: 20,
    winnerMatchesPlayed: 0,
    loserMatchesPlayed: 0,
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 0,
  });
  assertEquals(negative.loserNewRating, 20 + negative.loserChange);
  if (!(negative.loserNewRating < 0)) {
    throw new Error(`expected loser below 0, got ${negative.loserNewRating}`);
  }
});

Deno.test('singles: rejects non-finite ratings', () => {
  const base = {
    loserRating: 1200,
    winnerMatchesPlayed: 0,
    loserMatchesPlayed: 0,
    format: 'bu_klasik' as MatchFormat,
    winnerScore: 4,
    loserScore: 3,
  };
  assertThrows(() => calculateEloChange({ ...base, winnerRating: Infinity }), Error);
  assertThrows(() => calculateEloChange({ ...base, winnerRating: NaN }), Error);
  assertThrows(
    () => calculateEloChange({ ...base, winnerRating: 1200, loserRating: Infinity }),
    Error,
  );
});

// ---------------------------------------------------------------------------
// calculateDoublesEloChange — team average, equal split, zero-sum
// ---------------------------------------------------------------------------

Deno.test('doubles: equal teams, new players → +/-10 per player', () => {
  // avg 1200 vs 1200 → expected 0.5; min matches 0 → K=40; margin 1.0.
  // raw = 40 * 0.5 * 1.0 = 20; perPlayer = round(20/2) = 10.
  const r = calculateDoublesEloChange({
    winnerTeamRatings: [1200, 1200],
    loserTeamRatings: [1200, 1200],
    winnerTeamMatchesPlayed: [0, 0],
    loserTeamMatchesPlayed: [0, 0],
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 3,
  });
  assertEquals(r.winnerChanges, [10, 10]);
  assertEquals(r.loserChanges, [-10, -10]);
  assertEquals(r.winnerNewRatings, [1210, 1210]);
  assertEquals(r.loserNewRatings, [1190, 1190]);
});

Deno.test('doubles: uses team AVERAGE rating for expected score', () => {
  // Winners avg (1000+1400)/2 = 1200; losers avg (1100+1300)/2 = 1200.
  // Expected 0.5 despite different individual ratings → same delta as equal teams.
  const r = calculateDoublesEloChange({
    winnerTeamRatings: [1000, 1400],
    loserTeamRatings: [1100, 1300],
    winnerTeamMatchesPlayed: [0, 0],
    loserTeamMatchesPlayed: [0, 0],
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 3,
  });
  assertEquals(r.winnerChanges, [10, 10]);
  // Both teammates get the SAME change regardless of individual rating.
  assertEquals(r.winnerChanges[0], r.winnerChanges[1]);
});

Deno.test('doubles: K-factor uses the MIN match count across all four players', () => {
  // One brand-new player among established → K=40 (min).
  const withNew = calculateDoublesEloChange({
    winnerTeamRatings: [1200, 1200],
    loserTeamRatings: [1200, 1200],
    winnerTeamMatchesPlayed: [500, 500],
    loserTeamMatchesPlayed: [500, 0], // a new player present
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 3,
  });
  assertEquals(withNew.winnerChanges, [10, 10]); // K=40 → raw 20 → perPlayer 10

  // All established → K=20 → raw 10 → perPlayer round(5) = 5.
  const allEst = calculateDoublesEloChange({
    winnerTeamRatings: [1200, 1200],
    loserTeamRatings: [1200, 1200],
    winnerTeamMatchesPlayed: [500, 500],
    loserTeamMatchesPlayed: [500, 500],
    format: 'bu_klasik',
    winnerScore: 4,
    loserScore: 3,
  });
  assertEquals(allEst.winnerChanges, [5, 5]);
});

Deno.test('doubles: zero-sum at team level (2*perPlayer balances)', () => {
  const r = calculateDoublesEloChange({
    winnerTeamRatings: [1500, 1300],
    loserTeamRatings: [1100, 900],
    winnerTeamMatchesPlayed: [3, 4],
    loserTeamMatchesPlayed: [2, 8],
    format: 'pro_set_8',
    winnerScore: 8,
    loserScore: 0,
  });
  // Teammates identical.
  assertEquals(r.winnerChanges[0], r.winnerChanges[1]);
  assertEquals(r.loserChanges[0], r.loserChanges[1]);
  // Loser change is the negation of winner change per player → team zero-sum.
  assertEquals(r.loserChanges[0], -r.winnerChanges[0]);
  const winnerTeamTotal = r.winnerChanges[0] + r.winnerChanges[1];
  const loserTeamTotal = r.loserChanges[0] + r.loserChanges[1];
  assertEquals(winnerTeamTotal + loserTeamTotal, 0);
});

Deno.test('doubles: margin multiplier applies via format', () => {
  const base = {
    winnerTeamRatings: [1200, 1200] as [number, number],
    loserTeamRatings: [1200, 1200] as [number, number],
    winnerTeamMatchesPlayed: [0, 0] as [number, number],
    loserTeamMatchesPlayed: [0, 0] as [number, number],
    format: 'bu_klasik' as MatchFormat,
  };
  // blowout 4-0 margin 1.5 → raw 40*0.5*1.5 = 30 → perPlayer round(15) = 15.
  const blowout = calculateDoublesEloChange({ ...base, winnerScore: 4, loserScore: 0 });
  assertEquals(blowout.winnerChanges, [15, 15]);
  assertEquals(blowout.loserChanges, [-15, -15]);
});

Deno.test('doubles: rejects teams that are not exactly 2 players', () => {
  assertThrows(
    () =>
      calculateDoublesEloChange({
        // deno-lint-ignore no-explicit-any
        winnerTeamRatings: [1200] as any,
        loserTeamRatings: [1200, 1200],
        // deno-lint-ignore no-explicit-any
        winnerTeamMatchesPlayed: [0] as any,
        loserTeamMatchesPlayed: [0, 0],
        format: 'bu_klasik',
        winnerScore: 4,
        loserScore: 3,
      }),
    Error,
  );
});

// ---------------------------------------------------------------------------
// Singles vs doubles cross-check
// ---------------------------------------------------------------------------

Deno.test('singles vs doubles: doubles per-player delta is ~half the singles delta', () => {
  const shared = {
    format: 'bu_klasik' as MatchFormat,
    winnerScore: 4,
    loserScore: 3,
  };
  const singles = calculateEloChange({
    winnerRating: 1200,
    loserRating: 1200,
    winnerMatchesPlayed: 0,
    loserMatchesPlayed: 0,
    ...shared,
  });
  const doubles = calculateDoublesEloChange({
    winnerTeamRatings: [1200, 1200],
    loserTeamRatings: [1200, 1200],
    winnerTeamMatchesPlayed: [0, 0],
    loserTeamMatchesPlayed: [0, 0],
    ...shared,
  });
  // singles 20, doubles per-player 10 → distributed across two teammates.
  assertEquals(singles.winnerChange, 20);
  assertEquals(doubles.winnerChanges[0], 10);
  assertEquals(doubles.winnerChanges[0] * 2, singles.winnerChange);
});
