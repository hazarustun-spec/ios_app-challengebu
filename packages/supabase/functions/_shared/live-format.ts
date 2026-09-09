// Unit names per match format, for the Live Activity payloads.
//
// The widget labels its score with this string, so a 3 Set Klasik result reads
// "2 set" rather than looking exactly like a 2-game Klasik score. Kept in step
// with apps/mobile/lib/live-format.ts and public.live_score_rule (migration
// 20260909000001); the database is the authority on the RULES, this only names
// the unit.

export type MatchFormatKey = 'bu_klasik' | 'hizli_tiebreak' | 'pro_set_8' | '3set_klasik';

const UNIT_LABELS: Record<MatchFormatKey, string> = {
  bu_klasik: 'oyun',
  pro_set_8: 'oyun',
  hizli_tiebreak: 'sayı',
  '3set_klasik': 'set',
};

export function unitLabel(format: string | null | undefined): string {
  return UNIT_LABELS[(format ?? 'bu_klasik') as MatchFormatKey] ?? 'oyun';
}
