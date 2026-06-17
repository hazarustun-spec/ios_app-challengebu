// lib/primary-category.ts — pick a player's primary ranking category.
//
// Shared priority order used wherever a screen needs to default to "the
// player's main category" (Home hero, opponent suggestions, etc.).

const ORDER = ['erkek_tek', 'kadin_tek', 'open_tek'];

/** The player's primary category string, defaulting to erkek_tek when unknown. */
export function primaryCategoryOf(
  rows: { category: string }[] | undefined,
): string {
  if (!rows || rows.length === 0) return 'erkek_tek';
  for (const cat of ORDER) {
    if (rows.some((r) => r.category === cat)) return cat;
  }
  return rows[0].category;
}
