import { describe, expect, test } from 'bun:test';
import { ALL_FORMATS, FORMAT_RULES, type MatchFormat } from '../../src/types/formats.js';

describe('formats', () => {
  test('ALL_FORMATS contains 4 expected codes', () => {
    expect(ALL_FORMATS).toEqual(['bu_klasik', 'hizli_tiebreak', 'pro_set_8', '3set_klasik']);
  });

  test('FORMAT_RULES has rules for every format', () => {
    for (const format of ALL_FORMATS) {
      expect(FORMAT_RULES[format]).toBeDefined();
      expect(FORMAT_RULES[format].displayName).toBeTruthy();
      expect(FORMAT_RULES[format].approximateDuration).toBeGreaterThan(0);
    }
  });

  test('bu_klasik has target of 4 els', () => {
    expect(FORMAT_RULES['bu_klasik'].targetUnits).toBe(4);
    expect(FORMAT_RULES['bu_klasik'].canVoidAtTie).toBe(true);
  });

  test('hizli_tiebreak has target of 10', () => {
    expect(FORMAT_RULES['hizli_tiebreak'].targetUnits).toBe(10);
  });

  test('Format type narrows correctly', () => {
    const f: MatchFormat = 'bu_klasik';
    expect(f).toBe('bu_klasik');
  });
});
