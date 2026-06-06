export const SINGLES_CATEGORIES = ['erkek_tek', 'kadin_tek', 'open_tek'] as const;

export const DOUBLES_CATEGORIES = [
  'erkek_cift',
  'kadin_cift',
  'karma_cift',
  'open_cift',
] as const;

export const ALL_CATEGORIES = [
  ...SINGLES_CATEGORIES,
  ...DOUBLES_CATEGORIES,
] as const;

export type SinglesCategory = (typeof SINGLES_CATEGORIES)[number];
export type DoublesCategory = (typeof DOUBLES_CATEGORIES)[number];
export type Category = (typeof ALL_CATEGORIES)[number];

const SINGLES_SET = new Set<string>(SINGLES_CATEGORIES);
const DOUBLES_SET = new Set<string>(DOUBLES_CATEGORIES);

export function isSinglesCategory(c: Category): c is SinglesCategory {
  return SINGLES_SET.has(c);
}

export function isDoublesCategory(c: Category): c is DoublesCategory {
  return DOUBLES_SET.has(c);
}
