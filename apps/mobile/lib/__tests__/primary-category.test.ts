import { describe, expect, test } from 'bun:test';
import {
  defaultCategoryForGender,
  pickPrimaryCategory,
  primaryCategoryOf,
} from '../primary-category';

const row = (category: string, rating = 1200, rank = 0) => ({ category, rating, rank });

describe('defaultCategoryForGender', () => {
  test('maps each gender to its singles ladder', () => {
    expect(defaultCategoryForGender('erkek')).toBe('erkek_tek');
    expect(defaultCategoryForGender('kadin')).toBe('kadin_tek');
    expect(defaultCategoryForGender('open_only')).toBe('open_tek');
  });

  test('an unknown gender is treated as erkek_tek, as it always was', () => {
    expect(defaultCategoryForGender(null)).toBe('erkek_tek');
    expect(defaultCategoryForGender(undefined)).toBe('erkek_tek');
  });
});

describe('primaryCategoryOf', () => {
  test('returns the picked row category', () => {
    expect(primaryCategoryOf([row('kadin_tek'), row('erkek_tek')], 'erkek')).toBe('erkek_tek');
  });

  test('uses the explicit fallback when there are no rows', () => {
    expect(primaryCategoryOf([], 'kadin', 'open_tek')).toBe('open_tek');
    expect(primaryCategoryOf(undefined, 'kadin', 'open_tek')).toBe('open_tek');
  });

  test('falls back to the gender default with no explicit fallback', () => {
    expect(primaryCategoryOf([], 'kadin')).toBe('kadin_tek');
  });
});

describe('pickPrimaryCategory', () => {
  test('prefers the singles ladder for the user own gender', () => {
    const rows = [row('open_tek'), row('erkek_tek'), row('erkek_cift')];
    expect(pickPrimaryCategory(rows, 'erkek')?.category).toBe('erkek_tek');
  });

  // The regression. A man who re-onboarded kept his old kadin_tek row and had
  // no erkek_tek row; the old fixed-order lookup returned kadin_tek and the
  // home screen suggested women to challenge.
  test('never returns another gender ladder while open_tek exists', () => {
    const stale = [row('kadin_tek'), row('open_tek')];
    expect(pickPrimaryCategory(stale, 'erkek')?.category).toBe('open_tek');
  });

  test('prefers own-gender doubles over another gender singles', () => {
    const rows = [row('kadin_tek'), row('erkek_cift')];
    expect(pickPrimaryCategory(rows, 'erkek')?.category).toBe('erkek_cift');
  });

  test('open_only players land on open_tek', () => {
    const rows = [row('open_cift'), row('open_tek')];
    expect(pickPrimaryCategory(rows, 'open_only')?.category).toBe('open_tek');
  });

  test('returns null for an empty ladder set', () => {
    expect(pickPrimaryCategory([], 'erkek')).toBeNull();
  });

  // Last resort: only reached when nothing matches the user at all.
  test('falls back to the first row when nothing matches', () => {
    const rows = [row('kadin_cift')];
    expect(pickPrimaryCategory(rows, 'erkek')?.category).toBe('kadin_cift');
  });

  test('a woman gets kadin_tek even when erkek_tek is listed first', () => {
    const rows = [row('erkek_tek'), row('kadin_tek')];
    expect(pickPrimaryCategory(rows, 'kadin')?.category).toBe('kadin_tek');
  });
});
