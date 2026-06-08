import { describe, expect, test } from 'bun:test';
import {
  buildSeasonWindow,
  getCurrentSeasonWindow,
  isInFinaleWindow,
} from '../../src/seasons/calendar';

describe('buildSeasonWindow', () => {
  test('guz 2026 spans Sept 2026 → Jan 2027', () => {
    const w = buildSeasonWindow('guz', 2026);
    expect(w.starts_at.startsWith('2026-09-01')).toBe(true);
    expect(w.ends_at.startsWith('2027-01-25')).toBe(true);
    expect(w.finale_starts_at.startsWith('2027-01-16')).toBe(true);
    expect(w.finale_ends_at.startsWith('2027-01-25')).toBe(true);
  });

  test('bahar 2026 spans 26 Jan → 30 June 2026', () => {
    const w = buildSeasonWindow('bahar', 2026);
    expect(w.starts_at.startsWith('2026-01-26')).toBe(true);
    expect(w.ends_at.startsWith('2026-06-30')).toBe(true);
    expect(w.finale_starts_at.startsWith('2026-06-21')).toBe(true);
  });

  test('yaz 2026 spans 1 July → 31 Aug 2026', () => {
    const w = buildSeasonWindow('yaz', 2026);
    expect(w.starts_at.startsWith('2026-07-01')).toBe(true);
    expect(w.ends_at.startsWith('2026-08-31')).toBe(true);
    expect(w.finale_starts_at.startsWith('2026-08-21')).toBe(true);
  });
});

describe('getCurrentSeasonWindow', () => {
  test('15 March 2026 → bahar 2026', () => {
    const w = getCurrentSeasonWindow(new Date('2026-03-15T12:00:00Z'));
    expect(w.name).toBe('bahar');
    expect(w.year).toBe(2026);
  });

  test('1 September 2026 → guz 2026', () => {
    const w = getCurrentSeasonWindow(new Date('2026-09-01T12:00:00Z'));
    expect(w.name).toBe('guz');
    expect(w.year).toBe(2026);
  });

  test('10 January 2027 → guz 2026 (finale window extension)', () => {
    const w = getCurrentSeasonWindow(new Date('2027-01-10T12:00:00Z'));
    expect(w.name).toBe('guz');
    expect(w.year).toBe(2026);
  });

  test('5 July 2026 → yaz 2026', () => {
    const w = getCurrentSeasonWindow(new Date('2026-07-05T12:00:00Z'));
    expect(w.name).toBe('yaz');
    expect(w.year).toBe(2026);
  });
});

describe('isInFinaleWindow', () => {
  test('22 June 2026 is inside bahar 2026 finale', () => {
    const w = buildSeasonWindow('bahar', 2026);
    expect(isInFinaleWindow(w, new Date('2026-06-22T12:00:00Z'))).toBe(true);
  });

  test('1 March 2026 is NOT inside bahar 2026 finale', () => {
    const w = buildSeasonWindow('bahar', 2026);
    expect(isInFinaleWindow(w, new Date('2026-03-01T12:00:00Z'))).toBe(false);
  });

  test('21 June 2026 00:00 UTC IS inside bahar 2026 finale (start edge)', () => {
    const w = buildSeasonWindow('bahar', 2026);
    expect(isInFinaleWindow(w, new Date('2026-06-21T00:00:00Z'))).toBe(true);
  });

  test('30 June 2026 23:59:59 UTC IS inside bahar 2026 finale (end edge)', () => {
    const w = buildSeasonWindow('bahar', 2026);
    expect(isInFinaleWindow(w, new Date('2026-06-30T23:59:59Z'))).toBe(true);
  });
});

describe('season boundary rollovers', () => {
  test('31 August → yaz, 1 September → güz (no gap)', () => {
    expect(getCurrentSeasonWindow(new Date('2026-08-31T23:00:00Z')).name).toBe('yaz');
    expect(getCurrentSeasonWindow(new Date('2026-09-01T00:00:00Z')).name).toBe('guz');
  });

  test('25 January → güz of previous year, 26 January → bahar of current year', () => {
    expect(getCurrentSeasonWindow(new Date('2027-01-25T23:00:00Z')).name).toBe('guz');
    expect(getCurrentSeasonWindow(new Date('2027-01-25T23:00:00Z')).year).toBe(2026);
    expect(getCurrentSeasonWindow(new Date('2027-01-26T00:00:00Z')).name).toBe('bahar');
    expect(getCurrentSeasonWindow(new Date('2027-01-26T00:00:00Z')).year).toBe(2027);
  });

  test('30 June → bahar, 1 July → yaz (no gap)', () => {
    expect(getCurrentSeasonWindow(new Date('2026-06-30T23:00:00Z')).name).toBe('bahar');
    expect(getCurrentSeasonWindow(new Date('2026-07-01T00:00:00Z')).name).toBe('yaz');
  });
});
