import { describe, expect, test } from 'bun:test';
import { getFinalePoints, placementFromRank } from '../../src/seasons/finale-points';

describe('getFinalePoints', () => {
  test('champion = 100', () => {
    expect(getFinalePoints('champion')).toBe(100);
  });
  test('finalist = 70', () => {
    expect(getFinalePoints('finalist')).toBe(70);
  });
  test('semifinalist = 50', () => {
    expect(getFinalePoints('semifinalist')).toBe(50);
  });
  test('qf = 25', () => {
    expect(getFinalePoints('qf')).toBe(25);
  });
});

describe('placementFromRank', () => {
  test('rank 1 → champion', () => {
    expect(placementFromRank(1)).toBe('champion');
  });
  test('rank 2 → finalist', () => {
    expect(placementFromRank(2)).toBe('finalist');
  });
  test('rank 3 and 4 → semifinalist', () => {
    expect(placementFromRank(3)).toBe('semifinalist');
    expect(placementFromRank(4)).toBe('semifinalist');
  });
  test('rank 5..8 → qf', () => {
    expect(placementFromRank(5)).toBe('qf');
    expect(placementFromRank(8)).toBe('qf');
  });
  test('rank 9+ → null', () => {
    expect(placementFromRank(9)).toBeNull();
    expect(placementFromRank(99)).toBeNull();
  });
});
