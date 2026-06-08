export type SeasonName = 'guz' | 'bahar' | 'yaz';

export interface SeasonWindow {
  name: SeasonName;
  year: number;
  starts_at: string;
  ends_at: string;
  finale_starts_at: string;
  finale_ends_at: string;
}

function iso(year: number, monthZeroBased: number, day: number, endOfDay = false): string {
  const h = endOfDay ? 23 : 0;
  const m = endOfDay ? 59 : 0;
  const s = endOfDay ? 59 : 0;
  const d = new Date(Date.UTC(year, monthZeroBased, day, h, m, s));
  return d.toISOString();
}

export function buildSeasonWindow(name: SeasonName, year: number): SeasonWindow {
  if (name === 'guz') {
    return {
      name: 'guz',
      year,
      starts_at: iso(year, 8, 1),
      ends_at: iso(year + 1, 0, 25, true),
      finale_starts_at: iso(year + 1, 0, 16),
      finale_ends_at: iso(year + 1, 0, 25, true),
    };
  }
  if (name === 'bahar') {
    return {
      name: 'bahar',
      year,
      starts_at: iso(year, 0, 26),
      ends_at: iso(year, 5, 30, true),
      finale_starts_at: iso(year, 5, 21),
      finale_ends_at: iso(year, 5, 30, true),
    };
  }
  return {
    name: 'yaz',
    year,
    starts_at: iso(year, 6, 1),
    ends_at: iso(year, 7, 31, true),
    finale_starts_at: iso(year, 7, 21),
    finale_ends_at: iso(year, 7, 31, true),
  };
}

export function getCurrentSeasonWindow(at: Date = new Date()): SeasonWindow {
  const year = at.getUTCFullYear();
  const month = at.getUTCMonth();
  const day = at.getUTCDate();

  // Jan 1-25 still belongs to the previous year's güz (finale runs Jan 16-25).
  if (month === 0 && day <= 25) return buildSeasonWindow('guz', year - 1);
  if (month >= 8) return buildSeasonWindow('guz', year);
  if (month <= 5) return buildSeasonWindow('bahar', year);
  return buildSeasonWindow('yaz', year);
}

export function isInFinaleWindow(window: SeasonWindow, at: Date = new Date()): boolean {
  const t = at.getTime();
  return t >= Date.parse(window.finale_starts_at) && t <= Date.parse(window.finale_ends_at);
}
