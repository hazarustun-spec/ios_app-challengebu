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

  describe('pro_set_8 current behavior (deferred design call)', () => {
    const fmt: MatchFormat = 'pro_set_8';
    test('8-5 currently returns 1.0 (diff < 4 threshold)', () => {
      expect(getMarginMultiplier(fmt, 8, 5)).toBeCloseTo(1.0);
    });
    test('8-6 currently returns 1.0 (diff < 4 threshold)', () => {
      expect(getMarginMultiplier(fmt, 8, 6)).toBeCloseTo(1.0);
    });
    test('9-7 (tiebreak win) returns 1.0', () => {
      expect(getMarginMultiplier(fmt, 9, 7)).toBeCloseTo(1.0);
    });
  });

  describe('input validation', () => {
    test('throws on NaN winnerScore', () => {
      expect(() => getMarginMultiplier('bu_klasik', Number.NaN, 0)).toThrow();
    });
    test('throws on NaN loserScore', () => {
      expect(() => getMarginMultiplier('bu_klasik', 4, Number.NaN)).toThrow();
    });
    test('throws on Infinity', () => {
      expect(() => getMarginMultiplier('bu_klasik', Number.POSITIVE_INFINITY, 0)).toThrow();
    });
    test('throws on negative winnerScore', () => {
      expect(() => getMarginMultiplier('bu_klasik', -1, -5)).toThrow();
    });
    test('throws on negative loserScore', () => {
      expect(() => getMarginMultiplier('bu_klasik', 4, -1)).toThrow();
    });
    test('throws on non-integer scores', () => {
      expect(() => getMarginMultiplier('bu_klasik', 4.5, 2)).toThrow();
      expect(() => getMarginMultiplier('bu_klasik', 4, 1.5)).toThrow();
    });
  });

  test('throws if loser score >= winner score', () => {
    expect(() => getMarginMultiplier('bu_klasik', 3, 4)).toThrow();
    expect(() => getMarginMultiplier('bu_klasik', 4, 4)).toThrow();
  });
});
