import { describe, expect, test } from 'bun:test';
import { formatDateLabel, nextDays, toIso } from '../match-dates';

// Fixed reference date: Wed 2026-06-17 (getDay() === 3 → "Çar")
const FROM = new Date(2026, 5, 17);

describe('toIso', () => {
  test('zero-pads month and day', () => {
    expect(toIso(new Date(2026, 0, 3))).toBe('2026-01-03');
    expect(toIso(new Date(2026, 11, 25))).toBe('2026-12-25');
  });
});

describe('nextDays', () => {
  test('first entry is today (ISO + "Bugün")', () => {
    const days = nextDays(7, FROM);
    expect(days[0]).toEqual({ iso: '2026-06-17', label: 'Bugün' });
  });

  test('second entry is tomorrow ("Yarın") and crosses to the next ISO date', () => {
    const days = nextDays(7, FROM);
    expect(days[1]).toEqual({ iso: '2026-06-18', label: 'Yarın' });
  });

  test('third+ entries use "D Mon Weekday" label', () => {
    const days = nextDays(7, FROM);
    // 2026-06-19 is a Friday → "Cum"
    expect(days[2]).toEqual({ iso: '2026-06-19', label: '19 Haz Cum' });
  });

  test('produces exactly `count` consecutive days', () => {
    const days = nextDays(10, FROM);
    expect(days).toHaveLength(10);
    expect(days[9].iso).toBe('2026-06-26');
  });

  test('rolls across a month boundary', () => {
    const days = nextDays(3, new Date(2026, 5, 30)); // 30 Haz
    expect(days.map((d) => d.iso)).toEqual([
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
    ]);
  });
});

describe('formatDateLabel', () => {
  test('today / tomorrow are relative', () => {
    expect(formatDateLabel('2026-06-17', FROM)).toBe('Bugün');
    expect(formatDateLabel('2026-06-18', FROM)).toBe('Yarın');
  });

  test('further dates show the day label', () => {
    expect(formatDateLabel('2026-06-19', FROM)).toBe('19 Haz Cum');
  });

  test('empty string is the placeholder', () => {
    expect(formatDateLabel('', FROM)).toBe('Tarih seç');
  });

  test('round-trips with nextDays', () => {
    for (const d of nextDays(7, FROM)) {
      expect(formatDateLabel(d.iso, FROM)).toBe(d.label);
    }
  });
});
