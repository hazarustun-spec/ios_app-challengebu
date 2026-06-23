// lib/primary-category.ts — pick a player's primary ranking category.
//
// Shared priority order used wherever a screen needs to default to "the
// player's main category" (Home hero, opponent suggestions, etc.).

const ORDER = ['erkek_tek', 'kadin_tek', 'open_tek'];

/**
 * Gender-aware category default for users with no rankings yet.
 * 'kadin' → 'kadin_tek', 'open_only' → 'open_tek', else 'erkek_tek'.
 */
export function defaultCategoryForGender(gender: string | null | undefined): string {
  if (gender === 'kadin') return 'kadin_tek';
  if (gender === 'open_only') return 'open_tek';
  return 'erkek_tek';
}

/**
 * The player's primary category string.
 * Falls back to `fallback` (or 'erkek_tek') when no ranking rows exist.
 */
export function primaryCategoryOf(
  rows: { category: string }[] | undefined,
  fallback?: string,
): string {
  if (!rows || rows.length === 0) return fallback ?? 'erkek_tek';
  for (const cat of ORDER) {
    if (rows.some((r) => r.category === cat)) return cat;
  }
  return rows[0].category;
}
