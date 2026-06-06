import { describe, expect, test } from 'bun:test';
import {
  expectedScore,
  calculateEloChange,
  calculateDoublesEloChange,
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

  test('uses winner K for both sides (kWinner contract)', () => {
    // Equal ratings, new winner (K=40) vs established loser (K=20)
    // Margin = 1.5 (4-0). Expected change with kWinner = 40 * 0.5 * 1.5 = 30
    const result = calculateEloChange({
      winnerRating: 1200,
      loserRating: 1200,
      winnerMatchesPlayed: 5, // K=40
      loserMatchesPlayed: 20, // K=20
      format: 'bu_klasik',
      winnerScore: 4,
      loserScore: 0,
    });
    expect(result.winnerChange).toBe(30);
    expect(result.loserChange).toBe(-30);
  });

  test('throws on NaN winnerRating', () => {
    expect(() =>
      calculateEloChange({
        winnerRating: Number.NaN,
        loserRating: 1200,
        winnerMatchesPlayed: 20,
        loserMatchesPlayed: 20,
        format: 'bu_klasik',
        winnerScore: 4,
        loserScore: 2,
      }),
    ).toThrow();
  });

  test('throws on Infinity loserRating', () => {
    expect(() =>
      calculateEloChange({
        winnerRating: 1200,
        loserRating: Number.POSITIVE_INFINITY,
        winnerMatchesPlayed: 20,
        loserMatchesPlayed: 20,
        format: 'bu_klasik',
        winnerScore: 4,
        loserScore: 2,
      }),
    ).toThrow();
  });

  test('propagates invalid matchesPlayed from getKFactor', () => {
    expect(() =>
      calculateEloChange({
        winnerRating: 1200,
        loserRating: 1200,
        winnerMatchesPlayed: -1,
        loserMatchesPlayed: 20,
        format: 'bu_klasik',
        winnerScore: 4,
        loserScore: 2,
      }),
    ).toThrow();
  });

  test('propagates invalid scores from getMarginMultiplier', () => {
    expect(() =>
      calculateEloChange({
        winnerRating: 1200,
        loserRating: 1200,
        winnerMatchesPlayed: 20,
        loserMatchesPlayed: 20,
        format: 'bu_klasik',
        winnerScore: 2,
        loserScore: 4,
      }),
    ).toThrow();
  });
});

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
        // @ts-expect-error - intentionally malformed input to test runtime validation
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
