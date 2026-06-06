import { describe, expect, test } from 'bun:test';
import {
  ALL_CATEGORIES,
  SINGLES_CATEGORIES,
  DOUBLES_CATEGORIES,
  isSinglesCategory,
  isDoublesCategory,
  type Category,
} from '../../src/types/categories.js';

describe('categories', () => {
  test('ALL_CATEGORIES contains all 7 expected codes', () => {
    expect(ALL_CATEGORIES).toEqual([
      'erkek_tek',
      'kadin_tek',
      'open_tek',
      'erkek_cift',
      'kadin_cift',
      'karma_cift',
      'open_cift',
    ]);
  });

  test('SINGLES_CATEGORIES contains 3 singles', () => {
    expect(SINGLES_CATEGORIES).toEqual(['erkek_tek', 'kadin_tek', 'open_tek']);
  });

  test('DOUBLES_CATEGORIES contains 4 doubles', () => {
    expect(DOUBLES_CATEGORIES).toEqual([
      'erkek_cift',
      'kadin_cift',
      'karma_cift',
      'open_cift',
    ]);
  });

  test('isSinglesCategory true for singles', () => {
    expect(isSinglesCategory('erkek_tek')).toBe(true);
    expect(isSinglesCategory('open_tek')).toBe(true);
  });

  test('isSinglesCategory false for doubles', () => {
    expect(isSinglesCategory('karma_cift')).toBe(false);
  });

  test('isDoublesCategory true for doubles', () => {
    expect(isDoublesCategory('erkek_cift')).toBe(true);
    expect(isDoublesCategory('open_cift')).toBe(true);
  });

  test('isDoublesCategory false for singles', () => {
    expect(isDoublesCategory('kadin_tek')).toBe(false);
  });

  test('Category type narrows correctly', () => {
    const c: Category = 'erkek_tek';
    expect(c).toBe('erkek_tek');
  });
});
