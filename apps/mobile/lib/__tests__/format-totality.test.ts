// Every lookup that ends in a non-null assertion over a closed union is only
// safe while the union really is closed. This pins that.
//
// The failure mode is not hypothetical: `class_year` gained 'mezun' in a
// migration in July and the shared schema stayed behind for two months with
// nothing failing. The same drift on `match_format` would make
// `formatByKey(...)!` return undefined and crash whatever rendered it — the
// format chip is on the match card, the ladder and the result screen.
//
// A compile error would be better than a test, and for LIVE_FORMAT_RULES there
// IS one: it is typed `Record<MatchFormat, …>`, so a new format breaks the
// build. FORMATS is an array, which TypeScript cannot check that way.

import { describe, expect, test } from 'bun:test';
import { ALL_FORMATS } from '@tennis/shared';
import { DB_TO_UI_FORMAT, FORMATS, UI_TO_DB_FORMAT, formatByKey } from '../formats';
import { LIVE_FORMAT_RULES, liveFormatRule } from '../live-format';

describe('match format tables are total over the DB enum', () => {
  test('every DB format maps to a UI key', () => {
    for (const dbFormat of ALL_FORMATS) {
      expect(DB_TO_UI_FORMAT[dbFormat]).toBeDefined();
    }
  });

  test('every UI key resolves to a definition — the `.find(...)!` in formatByKey', () => {
    for (const dbFormat of ALL_FORMATS) {
      const uiKey = DB_TO_UI_FORMAT[dbFormat];
      // formatByKey asserts non-null; if the tables ever disagree this is where
      // it turns into `undefined.name` on a user's screen.
      expect(formatByKey(uiKey)).toBeDefined();
      expect(formatByKey(uiKey).key).toBe(uiKey);
    }
  });

  test('UI → DB → UI round-trips', () => {
    for (const def of FORMATS) {
      expect(DB_TO_UI_FORMAT[UI_TO_DB_FORMAT[def.key]]).toBe(def.key);
    }
  });

  test('FORMATS has exactly one entry per DB format — no orphans either way', () => {
    expect(FORMATS.length).toBe(ALL_FORMATS.length);
  });
});

describe('live scoring rules are total over the DB enum', () => {
  test('every format has a live rule', () => {
    for (const dbFormat of ALL_FORMATS) {
      expect(LIVE_FORMAT_RULES[dbFormat]).toBeDefined();
      expect(liveFormatRule(dbFormat).unit.length).toBeGreaterThan(0);
    }
  });

  test('each rule can actually be won', () => {
    for (const dbFormat of ALL_FORMATS) {
      const rule = liveFormatRule(dbFormat);
      // A target below the margin would be unreachable: you could never lead by
      // more than you are allowed to score.
      expect(rule.target).toBeGreaterThanOrEqual(rule.margin);
      if (rule.cap !== null) {
        // The decider must not sit below the target, or the match would end
        // before anybody reached it.
        expect(rule.cap).toBeGreaterThanOrEqual(rule.target);
      }
    }
  });

  test('an unknown format falls back rather than returning undefined', () => {
    // liveFormatRule is called with `match?.format`, which is undefined while
    // the match row is still loading.
    expect(liveFormatRule(undefined).unit).toBe('oyun');
  });
});
