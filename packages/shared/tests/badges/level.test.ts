import { describe, expect, test } from 'bun:test';
import { LEVELS, getLevel, levelChanged } from '../../src/badges/level.js';

describe('getLevel', () => {
  test('returns Yeni Çekirge for ELO 0', () => {
    expect(getLevel(0).code).toBe('yeni_cekirge');
  });

  test('returns Yeni Çekirge for ELO 999 (just below Çaylak)', () => {
    expect(getLevel(999).code).toBe('yeni_cekirge');
  });

  test('returns Çaylak at exactly 1000', () => {
    expect(getLevel(1000).code).toBe('caylak');
  });

  test('returns Amatör for default starting ELO 1200', () => {
    expect(getLevel(1200).code).toBe('amator');
  });

  test('returns Rekabetçi at 1400', () => {
    expect(getLevel(1400).code).toBe('rekabetci');
  });

  test('returns Usta at 1600', () => {
    expect(getLevel(1600).code).toBe('usta');
  });

  test('returns Elit at 1800', () => {
    expect(getLevel(1800).code).toBe('elit');
  });

  test('returns Şampiyon at 2000', () => {
    expect(getLevel(2000).code).toBe('sampiyon');
  });

  test('returns Şampiyon for very high ELO', () => {
    expect(getLevel(3500).code).toBe('sampiyon');
  });

  test('throws on NaN', () => {
    expect(() => getLevel(Number.NaN)).toThrow();
  });

  test('LEVELS table has 7 entries', () => {
    expect(LEVELS.length).toBe(7);
  });
});

describe('levelChanged', () => {
  test('detects level-up Amatör → Rekabetçi', () => {
    const r = levelChanged(1399, 1400);
    expect(r.up).toBe(true);
    expect(r.down).toBe(false);
    expect(r.before.code).toBe('amator');
    expect(r.after.code).toBe('rekabetci');
  });

  test('detects level-down Rekabetçi → Amatör', () => {
    const r = levelChanged(1400, 1399);
    expect(r.up).toBe(false);
    expect(r.down).toBe(true);
  });

  test('returns up=false down=false when no change', () => {
    const r = levelChanged(1200, 1250);
    expect(r.up).toBe(false);
    expect(r.down).toBe(false);
    expect(r.before.code).toBe('amator');
    expect(r.after.code).toBe('amator');
  });
});
