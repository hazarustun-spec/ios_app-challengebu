// Tab slot configuration tests.
//
// `TabBar.tsx` itself uses React hooks (useRef/useEffect/useSharedValue), so
// the repo's direct-invocation snapshot pattern cannot render it. The slot
// configuration — which is what the icon work actually changes — lives in a
// pure module so it can be asserted directly.

import { describe, expect, test } from 'bun:test';
import { TAB_SLOTS, type TabSlotConfig, type TabSlotNormal } from '../tab-slots';

/** Narrows the discriminated union so `.icon` is typesafe on non-center slots. */
function isNormalSlot(s: TabSlotConfig): s is TabSlotNormal {
  return s.isCenter !== true;
}

describe('TAB_SLOTS', () => {
  test('declares the five tab slots in design order', () => {
    expect(TAB_SLOTS.map((s) => s.name)).toEqual([
      'index',
      'matches',
      'new-match',
      'leaderboard',
      'profile',
    ]);
  });

  test('matches tab uses the calendar glyph', () => {
    const matches = TAB_SLOTS.filter(isNormalSlot).find((s) => s.name === 'matches');
    expect(matches?.icon).toBe('calendar');
  });

  test('center slot renders the ball mark, not an Icon glyph', () => {
    const center = TAB_SLOTS.find((s) => s.isCenter === true);
    expect(center?.name).toBe('new-match');
    // `icon` doesn't exist on the center variant of the union at all — TabSlot
    // draws BallMark for the center instead of an Icon glyph.
    expect(center && 'icon' in center).toBe(false);
  });

  test('exactly one slot is the center slot', () => {
    expect(TAB_SLOTS.filter((s) => s.isCenter === true).length).toBe(1);
  });

  test('every non-center slot declares an icon', () => {
    for (const slot of TAB_SLOTS.filter(isNormalSlot)) {
      expect(slot.icon).toBeTruthy();
    }
  });

  test('every slot has a non-empty Turkish accessibility label', () => {
    const expected: Record<string, string> = {
      index: 'Anasayfa',
      matches: 'Maçlar',
      'new-match': 'Yeni maç',
      leaderboard: 'Sıralama',
      profile: 'Profil',
    };
    for (const slot of TAB_SLOTS) {
      expect(slot.label).toBeTruthy();
      expect(slot.label).toBe(expected[slot.name]);
    }
  });

  test("center slot's label is 'Yeni maç'", () => {
    const center = TAB_SLOTS.find((s) => s.isCenter);
    expect(center?.label).toBe('Yeni maç');
  });
});
