import { describe, expect, test } from 'bun:test';
import { getKFactor, K_NEW_PLAYER, K_ESTABLISHED, NEW_PLAYER_THRESHOLD } from '../../src/elo/k-factor.js';

describe('K-factor', () => {
  test('constants are 40 and 20', () => {
    expect(K_NEW_PLAYER).toBe(40);
    expect(K_ESTABLISHED).toBe(20);
    expect(NEW_PLAYER_THRESHOLD).toBe(10);
  });

  test('returns K=40 for 0 matches', () => {
    expect(getKFactor(0)).toBe(40);
  });

  test('returns K=40 for 9 matches (boundary, still new)', () => {
    expect(getKFactor(9)).toBe(40);
  });

  test('returns K=20 for exactly 10 matches (just established)', () => {
    expect(getKFactor(10)).toBe(20);
  });

  test('returns K=20 for 50 matches', () => {
    expect(getKFactor(50)).toBe(20);
  });

  test('throws on negative matches_played', () => {
    expect(() => getKFactor(-1)).toThrow();
  });

  test('throws on NaN', () => {
    expect(() => getKFactor(Number.NaN)).toThrow();
  });

  test('throws on Infinity', () => {
    expect(() => getKFactor(Number.POSITIVE_INFINITY)).toThrow();
  });

  test('throws on non-integer', () => {
    expect(() => getKFactor(5.5)).toThrow();
  });
});
