// lib/match-dates.ts — Pure date helpers for the "Yeni Maç" wizard.
//
// The create-match-request Edge Function requires `proposedDate` as a strict
// ISO calendar date (YYYY-MM-DD). The wizard's date picker shows friendly
// Turkish labels ("Bugün", "Yarın", "19 Haz Cum") but must STORE the ISO
// value so the API accepts it. These helpers bridge label ⇄ ISO.
//
// No React-Native imports → safe to unit test under bun test.

const TR_MONTHS = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];
// JS getDay(): 0 = Sunday … 6 = Saturday
const TR_WEEKDAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export interface DayChoice {
  /** Strict ISO calendar date, e.g. "2026-06-19". */
  iso: string;
  /** Friendly Turkish label, e.g. "Bugün" / "Yarın" / "19 Haz Cum". */
  label: string;
}

/** Format a Date as a local-time ISO calendar date (YYYY-MM-DD). */
export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function labelFor(d: Date, offsetDays: number): string {
  if (offsetDays === 0) return 'Bugün';
  if (offsetDays === 1) return 'Yarın';
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${TR_WEEKDAYS[d.getDay()]}`;
}

/**
 * The next `count` days starting today (local time), each with an ISO value
 * + Turkish label. `from` is injectable for deterministic tests.
 */
export function nextDays(count: number, from: Date = new Date()): DayChoice[] {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const out: DayChoice[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({ iso: toIso(d), label: labelFor(d, i) });
  }
  return out;
}

/** Human label for a stored ISO date, relative to today. */
export function formatDateLabel(iso: string, from: Date = new Date()): string {
  if (!iso) return 'Tarih seç';
  const [y, m, day] = iso.split('-').map(Number);
  if (!y || !m || !day) return iso;
  const d = new Date(y, m - 1, day);
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = Math.round((d.getTime() - base.getTime()) / 86_400_000);
  return labelFor(d, diff);
}
