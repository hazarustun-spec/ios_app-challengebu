// lib/primary-category.ts — pick a player's primary ranking category.
//
// Shared wherever a screen needs to default to "the player's main category":
// the Home hero (rating, rank, ELO trend), the Matches hub, ELO history, and —
// through categoryToGender() — the suggested-opponent list.
//
// Getting it wrong is not cosmetic: it shows a man a list of women to
// challenge, and files his hero rating under the wrong ladder.
//
// This module used to walk a fixed order:
//
//     const ORDER = ['erkek_tek', 'kadin_tek', 'open_tek'];
//
// which falls through to the wrong gender whenever the row for the player's
// own gender is missing. That happens in practice: trg_seed_elo_ratings only
// fired on INSERT, so anyone who came back through onboarding on an existing
// profile row — the path taken after an in-app account deletion — kept the
// previous gender's rows and had none of their own. 20260806000001 fixes the
// seeding; the functions here refuse to guess wrong even while data is stale.

/**
 * Gender-aware category default for users with no rankings yet.
 * 'kadin' → 'kadin_tek', 'open_only' → 'open_tek', else 'erkek_tek'.
 */
export function defaultCategoryForGender(gender: string | null | undefined): string {
  if (gender === 'kadin') return 'kadin_tek';
  if (gender === 'open_only') return 'open_tek';
  return 'erkek_tek';
}

export interface RankingLike {
  category: string;
}

/**
 * Pick the primary ranking row, preferring in order:
 *
 *   1. the singles ladder for the player's own gender
 *   2. open_tek — the one singles ladder everybody plays
 *   3. any other row for their own gender (doubles)
 *   4. whatever came first
 *
 * A row belonging to a different gender is only reachable at step 4, so a
 * leftover kadin_tek row can no longer outrank a present erkek_tek one.
 */
export function pickPrimaryCategory<T extends RankingLike>(
  rows: T[] | undefined,
  gender: string | null | undefined,
): T | null {
  if (!rows || rows.length === 0) return null;

  const mine = defaultCategoryForGender(gender);
  const exact = rows.find((r) => r.category === mine);
  if (exact) return exact;

  const open = rows.find((r) => r.category === 'open_tek');
  if (open) return open;

  if (gender === 'erkek' || gender === 'kadin') {
    const sameGender = rows.find((r) => r.category.startsWith(`${gender}_`));
    if (sameGender) return sameGender;
  }

  return rows[0];
}

/**
 * The player's primary category as a plain string.
 * Falls back to `fallback` (or the gender default) when no rows exist.
 */
export function primaryCategoryOf(
  rows: RankingLike[] | undefined,
  gender: string | null | undefined,
  fallback?: string,
): string {
  return (
    pickPrimaryCategory(rows, gender)?.category ??
    fallback ??
    defaultCategoryForGender(gender)
  );
}
