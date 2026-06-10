// Snapshot + behavioral tests for the four domain chip primitives
// (EloChip + LevelIcon + FormatChip + FormDots) plus the helper functions in
// `lib/levels.ts` and `lib/formats.ts`.
//
// Follows the same bun:test + normalized-tree pattern as
//   apps/mobile/components/ui/__tests__/Button.test.tsx
//   apps/mobile/components/ui/__tests__/Icon.test.tsx
//   apps/mobile/components/ui/__tests__/Selection.test.tsx
// — RNTL isn't installed, so we mock react-native + react-native-svg with
// string-named host stubs and snapshot the resulting element tree.
//
// What the snapshots lock in:
//   - EloChip: pill structure + win/loss color flip on negative delta
//   - LevelIcon: each of the 7 levels picks the right icon + color
//   - FormatChip: each of the 4 formats picks the right icon + color + name
//   - FormDots: dot count + per-dot W/L color routing
//
// Helper assertions guard the math behind `levelForElo`, `levelProgress`,
// and the UI ↔ DB format mapping (`UI_TO_DB_FORMAT` ↔ `DB_TO_UI_FORMAT`).

import { describe, expect, mock, test } from 'bun:test';
import type { ReactElement } from 'react';

function makeTag(displayName: string) {
  const Comp = (_props: Record<string, unknown>) => null;
  (Comp as { displayName?: string }).displayName = displayName;
  return Comp;
}

mock.module('react-native', () => ({
  View: makeTag('View'),
  Text: makeTag('Text'),
}));

mock.module('react-native-svg', () => ({
  default: makeTag('Svg'),
  Svg: makeTag('Svg'),
  Path: makeTag('Path'),
  Circle: makeTag('Circle'),
  Rect: makeTag('Rect'),
}));

// Import AFTER the mocks so the components pick up the stubs.
const { EloChip } = await import('../EloChip');
const { LevelIcon } = await import('../LevelIcon');
const { FormatChip } = await import('../FormatChip');
const { FormDots } = await import('../FormDots');
const { LEVELS, levelForElo, levelProgress } = await import('../../../lib/levels');
const { FORMATS, UI_TO_DB_FORMAT, DB_TO_UI_FORMAT } = await import(
  '../../../lib/formats'
);

function describeType(type: unknown): string {
  if (typeof type === 'string') return type;
  if (typeof type === 'function') {
    const fn = type as { displayName?: string; name?: string };
    return fn.displayName ?? fn.name ?? 'Component';
  }
  if (type && typeof type === 'object') {
    const obj = type as { displayName?: string; render?: { name?: string } };
    if (obj.displayName) return obj.displayName;
    if (obj.render?.name) return obj.render.name;
  }
  return 'Unknown';
}

type Normalized =
  | string
  | number
  | null
  | { type: string; props: Record<string, unknown>; children: Normalized[] };

function normalize(node: unknown): Normalized {
  if (node === null || node === undefined || node === false || node === true) {
    return null;
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return node;
  }
  if (Array.isArray(node)) {
    return {
      type: 'Fragment',
      props: {},
      children: node.map(normalize).filter((c): c is Normalized => c !== null),
    };
  }
  const el = node as ReactElement;
  const elType = el.type as unknown;
  const typeLabel =
    typeof elType === 'symbol' ? 'Fragment' : describeType(elType);
  const { children, ...rest } = (el.props ?? {}) as { children?: unknown } & Record<
    string,
    unknown
  >;
  const childArray =
    children === undefined ? [] : Array.isArray(children) ? children : [children];
  return {
    type: typeLabel,
    props: rest,
    children: childArray.map(normalize).filter((c): c is Normalized => c !== null),
  };
}

// Count tree nodes matching a predicate (used to count W/L dots etc.).
function count(
  node: Normalized,
  predicate: (n: { type: string; props: Record<string, unknown> }) => boolean,
): number {
  if (node === null || typeof node === 'string' || typeof node === 'number') return 0;
  let total = predicate({ type: node.type, props: node.props }) ? 1 : 0;
  for (const child of node.children) {
    total += count(child, predicate);
  }
  return total;
}

// ---------------------------------------------------------------------------
// EloChip
// ---------------------------------------------------------------------------

describe('EloChip', () => {
  test('positive delta renders win color + chevU', () => {
    const tree = normalize(EloChip({ elo: 1612, delta: 22 }));
    expect(tree).toMatchSnapshot();
    // Win color is #5C8C1E (colors.win).
    expect(count(tree, (n) => n.type === 'Icon' && n.props.name === 'chevU')).toBe(1);
    expect(count(tree, (n) => n.type === 'Icon' && n.props.name === 'chevD')).toBe(0);
  });

  test('negative delta renders loss color + chevD', () => {
    const tree = normalize(EloChip({ elo: 1487, delta: -14 }));
    expect(tree).toMatchSnapshot();
    expect(count(tree, (n) => n.type === 'Icon' && n.props.name === 'chevD')).toBe(1);
    expect(count(tree, (n) => n.type === 'Icon' && n.props.name === 'chevU')).toBe(0);
  });

  test('zero delta renders as up (chevU)', () => {
    const tree = normalize(EloChip({ elo: 1500, delta: 0 }));
    expect(count(tree, (n) => n.type === 'Icon' && n.props.name === 'chevU')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// LevelIcon
// ---------------------------------------------------------------------------

describe('LevelIcon', () => {
  test('all 7 levels render with their color + glyph', () => {
    for (const lv of LEVELS) {
      const tree = normalize(LevelIcon({ level: lv, size: 16 }));
      expect(tree).toMatchSnapshot(`level-${lv.key}`);
      // The rendered Icon should pick up the level's color + icon name.
      expect(
        count(
          tree,
          (n) =>
            n.type === 'Icon' &&
            n.props.name === lv.icon &&
            n.props.color === lv.color,
        ),
      ).toBe(1);
    }
  });

  test('custom size is forwarded to the Icon', () => {
    const lv = LEVELS[0]!;
    const tree = normalize(LevelIcon({ level: lv, size: 28 }));
    expect(count(tree, (n) => n.type === 'Icon' && n.props.size === 28)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// FormatChip
// ---------------------------------------------------------------------------

describe('FormatChip', () => {
  test('all 4 formats render with name + glyph', () => {
    for (const f of FORMATS) {
      const tree = normalize(FormatChip({ fmtKey: f.key }));
      expect(tree).toMatchSnapshot(`format-${f.key}`);
      expect(
        count(
          tree,
          (n) =>
            n.type === 'Icon' &&
            n.props.name === f.mark &&
            n.props.color === f.color,
        ),
      ).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// FormDots
// ---------------------------------------------------------------------------

describe('FormDots', () => {
  test('renders 5 mixed dots', () => {
    const tree = normalize(FormDots({ form: ['W', 'W', 'L', 'W', 'W'] }));
    expect(tree).toMatchSnapshot();
    // 5 dots total — each a <View> child of the row.
    const rowView = tree as Exclude<Normalized, string | number | null>;
    expect(rowView.children.length).toBe(5);
  });

  test('empty form renders zero dots', () => {
    const tree = normalize(FormDots({ form: [] }));
    const rowView = tree as Exclude<Normalized, string | number | null>;
    expect(rowView.children.length).toBe(0);
  });

  test('W and L pick semantic colors', () => {
    const tree = normalize(FormDots({ form: ['W', 'L'] })) as Exclude<
      Normalized,
      string | number | null
    >;
    const [win, loss] = rowChildren(tree);
    expect((win!.props.style as { backgroundColor: string }).backgroundColor).toBe(
      '#5C8C1E',
    );
    expect((loss!.props.style as { backgroundColor: string }).backgroundColor).toBe(
      '#E0463C',
    );
  });
});

function rowChildren(tree: Exclude<Normalized, string | number | null>) {
  return tree.children.filter(
    (c): c is Exclude<Normalized, string | number | null> =>
      c !== null && typeof c !== 'string' && typeof c !== 'number',
  );
}

// ---------------------------------------------------------------------------
// Helpers — levels + format mapping
// ---------------------------------------------------------------------------

describe('levelForElo', () => {
  test('cekirge boundary at 0', () => {
    expect(levelForElo(0).key).toBe('cekirge');
    expect(levelForElo(1099).key).toBe('cekirge');
  });

  test('caylak boundary at 1100', () => {
    expect(levelForElo(1100).key).toBe('caylak');
    expect(levelForElo(1299).key).toBe('caylak');
  });

  test('amator + rekabet + usta mid-band', () => {
    expect(levelForElo(1300).key).toBe('amator');
    expect(levelForElo(1500).key).toBe('rekabet');
    expect(levelForElo(1700).key).toBe('usta');
  });

  test('sampiyon clamps the top end', () => {
    expect(levelForElo(2100).key).toBe('sampiyon');
    expect(levelForElo(2500).key).toBe('sampiyon');
  });

  test('matches the seed scenarios — ME (1612) → rekabet', () => {
    expect(levelForElo(1612).key).toBe('rekabet');
  });
});

describe('levelProgress', () => {
  test('mid-level — 1400 sits halfway between amator (1300) and rekabet (1500)', () => {
    const p = levelProgress(1400);
    expect(p.current.key).toBe('amator');
    expect(p.next?.key).toBe('rekabet');
    expect(p.pct).toBeCloseTo(0.5, 5);
    expect(p.toNext).toBe(100);
  });

  test('exact boundary — 1300 → start of amator with pct=0', () => {
    const p = levelProgress(1300);
    expect(p.current.key).toBe('amator');
    expect(p.pct).toBe(0);
    expect(p.toNext).toBe(200);
  });

  test('top level has no next + pct=1', () => {
    const p = levelProgress(2400);
    expect(p.current.key).toBe('sampiyon');
    expect(p.next).toBeNull();
    expect(p.pct).toBe(1);
    expect(p.toNext).toBe(0);
  });

  test('below the lowest threshold still maps to cekirge without crashing', () => {
    // Defensive — the leaderboard should never serve a negative ELO, but the
    // helper must not crash on out-of-range input. The exact `next` pointer
    // is intentionally undefined for this edge case; we only guarantee
    // `current` is cekirge and `pct` is clamped.
    const p = levelProgress(-50);
    expect(p.current.key).toBe('cekirge');
    expect(p.pct).toBeGreaterThanOrEqual(0);
    expect(p.pct).toBeLessThanOrEqual(1);
  });
});

describe('FORMATS mapping', () => {
  test('UI ↔ DB format mapping round-trips', () => {
    for (const fmt of FORMATS) {
      const dbName = UI_TO_DB_FORMAT[fmt.key];
      expect(DB_TO_UI_FORMAT[dbName]).toBe(fmt.key);
    }
  });

  test('every UI key has a DB counterpart and vice versa', () => {
    const uiKeys = Object.keys(UI_TO_DB_FORMAT).sort();
    const dbKeys = Object.values(UI_TO_DB_FORMAT).sort();
    expect(uiKeys).toEqual(['klasik', 'proset', 'set3', 'tiebreak']);
    expect(dbKeys).toEqual([
      '3set_klasik',
      'bu_klasik',
      'hizli_tiebreak',
      'pro_set_8',
    ]);
  });
});
