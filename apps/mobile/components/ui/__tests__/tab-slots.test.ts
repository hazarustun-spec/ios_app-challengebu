// Tab slot configuration tests.
//
// `TabBar.tsx` itself uses React hooks (useRef/useEffect/useSharedValue), so
// the repo's direct-invocation snapshot pattern cannot render it. The slot
// configuration — which is what the icon work actually changes — lives in a
// pure module so it can be asserted directly.

import { describe, expect, test } from 'bun:test';
import { TAB_SLOTS } from '../tab-slots';

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
    const matches = TAB_SLOTS.find((s) => s.name === 'matches');
    expect(matches?.icon).toBe('calendar');
  });

  test('center slot renders the ball mark, not an Icon glyph', () => {
    const center = TAB_SLOTS.find((s) => s.isCenter);
    expect(center?.name).toBe('new-match');
    // `icon` is intentionally absent — TabSlot draws BallMark for the center.
    expect(center?.icon).toBeUndefined();
  });

  test('exactly one slot is the center slot', () => {
    expect(TAB_SLOTS.filter((s) => s.isCenter).length).toBe(1);
  });

  test('every non-center slot declares an icon', () => {
    for (const slot of TAB_SLOTS.filter((s) => !s.isCenter)) {
      expect(slot.icon).toBeTruthy();
    }
  });
});
