// Snapshot tests for the three composed domain primitives —
// Sparkline + PlayerChip + MatchCard.
//
// Follows the same bun:test + normalized-tree pattern as
//   apps/mobile/components/ui/__tests__/DomainChips.test.tsx
// — RNTL isn't installed, so we mock react-native + react-native-svg with
// string-named host stubs and snapshot the resulting element tree.
//
// What the snapshots lock in:
//   - Sparkline: upward + downward + explicit-color + single-point edge case
//   - PlayerChip: with/without subtitle line
//   - MatchCard: planned / pending / done(win) variants
//
// Additional behavioural assertions guard the load-bearing colour routing
// (auto trend → win/loss; planned vs pending CTA variant; done variant
// renders the win/loss verb instead of a CTA).
//
// Component subtrees that don't unfold (Avatar/Button/EloChip/FormatChip)
// are inspected via their PROPS — we assert on the props passed to the
// nested component rather than digging into their rendered output. That
// keeps the test focused on MatchCard's contract.

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
  Image: makeTag('Image'),
  Pressable: makeTag('Pressable'),
  ActivityIndicator: makeTag('ActivityIndicator'),
}));

mock.module('react-native-svg', () => {
  const Svg = makeTag('Svg');
  return {
    default: Svg,
    Svg,
    Path: makeTag('Path'),
    Circle: makeTag('Circle'),
    Rect: makeTag('Rect'),
    Polyline: makeTag('Polyline'),
  };
});

// Import AFTER the mocks so the components pick up the stubs.
const { Sparkline } = await import('../Sparkline');
const { PlayerChip } = await import('../PlayerChip');
const { MatchCard } = await import('../MatchCard');

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

function findFirst(
  node: Normalized,
  predicate: (n: { type: string; props: Record<string, unknown> }) => boolean,
): { type: string; props: Record<string, unknown>; children: Normalized[] } | null {
  if (node === null || typeof node === 'string' || typeof node === 'number') return null;
  if (predicate({ type: node.type, props: node.props })) return node;
  for (const child of node.children) {
    const hit = findFirst(child, predicate);
    if (hit) return hit;
  }
  return null;
}

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

// Collect text leaves rendered DIRECTLY by the component under test — note
// that nested host components (Avatar/Button/EloChip/...) don't unfold here
// because their render functions aren't invoked. Their text content lives
// inside their respective unit-test files.
function textContents(node: Normalized): Array<string | number> {
  if (node === null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [node];
  const out: Array<string | number> = [];
  for (const child of node.children) {
    out.push(...textContents(child));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

describe('Sparkline', () => {
  test('upward trend with auto color routes to win', () => {
    const tree = normalize(
      Sparkline({ data: [1500, 1520, 1540, 1612], color: 'auto', w: 60, h: 20 }),
    );
    expect(tree).toMatchSnapshot('upward');
    const poly = findFirst(tree, (n) => n.type === 'Polyline');
    expect(poly).not.toBeNull();
    expect(poly!.props.stroke).toBe('#5C8C1E'); // colors.win
  });

  test('downward trend with auto color routes to loss', () => {
    const tree = normalize(
      Sparkline({ data: [1612, 1580, 1530, 1487], color: 'auto', w: 60, h: 20 }),
    );
    expect(tree).toMatchSnapshot('downward');
    const poly = findFirst(tree, (n) => n.type === 'Polyline');
    expect(poly!.props.stroke).toBe('#E0463C'); // colors.loss
  });

  test('renders with explicit color', () => {
    const tree = normalize(Sparkline({ data: [100, 150, 120], color: '#8FD43B' }));
    expect(tree).toMatchSnapshot('explicit-color');
    const poly = findFirst(tree, (n) => n.type === 'Polyline');
    expect(poly!.props.stroke).toBe('#8FD43B');
  });

  test('handles single point gracefully — no polyline, just an empty Svg', () => {
    const tree = normalize(Sparkline({ data: [1500] }));
    expect(tree).toMatchSnapshot('single-point');
    expect(count(tree, (n) => n.type === 'Polyline')).toBe(0);
    expect(count(tree, (n) => n.type === 'Svg')).toBe(1);
  });

  test('empty data also renders an empty Svg', () => {
    const tree = normalize(Sparkline({ data: [] }));
    expect(count(tree, (n) => n.type === 'Polyline')).toBe(0);
    expect(count(tree, (n) => n.type === 'Svg')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// PlayerChip
// ---------------------------------------------------------------------------

describe('PlayerChip', () => {
  test('with name + elo + sub renders all three text leaves', () => {
    const tree = normalize(
      PlayerChip({ name: 'Aleyna Kaya', elo: 1487, sub: 'Amatör · 2. sınıf' }),
    );
    expect(tree).toMatchSnapshot('with-sub');
    const texts = textContents(tree);
    expect(texts).toContain('Aleyna Kaya');
    expect(texts).toContain('Amatör · 2. sınıf');
    expect(texts).toContain(1487);
    // Exactly one Avatar at size 32.
    const avatar = findFirst(tree, (n) => n.type === 'Avatar');
    expect(avatar).not.toBeNull();
    expect(avatar!.props.size).toBe(32);
    expect(avatar!.props.name).toBe('Aleyna Kaya');
  });

  test('without sub omits the secondary text node', () => {
    const tree = normalize(PlayerChip({ name: 'Kaan Demir', elo: 1924 }));
    expect(tree).toMatchSnapshot('no-sub');
    const texts = textContents(tree);
    expect(texts).toContain('Kaan Demir');
    expect(texts).toContain(1924);
    // Only two text leaves: name + ELO. No subtitle.
    expect(texts.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// MatchCard
// ---------------------------------------------------------------------------

describe('MatchCard', () => {
  test('planned variant — blue header + secondary CTA', () => {
    const tree = normalize(
      MatchCard({
        kind: 'planned',
        opponentName: 'Aleyna Kaya',
        whenLabel: 'Yarın 10:00 · Hisar',
        format: 'klasik',
        ctaLabel: 'Detay',
        onCtaPress: () => {},
      }),
    );
    expect(tree).toMatchSnapshot('planned');
    const texts = textContents(tree);
    expect(texts).toContain('Planlı');
    expect(texts).toContain('Yarın 10:00 · Hisar');
    expect(texts).toContain('Aleyna Kaya');
    // The Button is rendered as secondary with the CTA label as children.
    const button = findFirst(tree, (n) => n.type === 'Button');
    expect(button).not.toBeNull();
    expect(button!.props.variant).toBe('secondary');
    expect(button!.props.size).toBe('sm');
    expect(button!.children).toEqual(['Detay']);
    // FormatChip wired to the right format key.
    const fmt = findFirst(tree, (n) => n.type === 'FormatChip');
    expect(fmt).not.toBeNull();
    expect(fmt!.props.fmtKey).toBe('klasik');
  });

  test('pending variant — warn header + primary CTA', () => {
    const tree = normalize(
      MatchCard({
        kind: 'pending',
        opponentName: 'Berk Aydın',
        whenLabel: 'Bugün 18:30 · Kort 1',
        format: 'klasik',
        ctaLabel: 'Skoru gir',
        onCtaPress: () => {},
      }),
    );
    expect(tree).toMatchSnapshot('pending');
    const texts = textContents(tree);
    expect(texts).toContain('Skor bekliyor');
    expect(texts).toContain('Bugün 18:30 · Kort 1');
    const button = findFirst(tree, (n) => n.type === 'Button');
    expect(button).not.toBeNull();
    expect(button!.props.variant).toBe('primary');
    expect(button!.children).toEqual(['Skoru gir']);
  });

  test('done variant with win — lime header + scoreline + EloChip', () => {
    const tree = normalize(
      MatchCard({
        kind: 'done',
        opponentName: 'Onur Çelik',
        opponentElo: 1612,
        whenLabel: 'Kandilli Tenis Kortu',
        format: 'klasik',
        win: true,
        score: '4-2',
        eloDelta: 22,
      }),
    );
    expect(tree).toMatchSnapshot('done-win');
    const texts = textContents(tree);
    expect(texts).toContain('Tamamlandı');
    expect(texts).toContain('Kazandın');
    expect(texts).toContain('4-2');
    // No CTA Button on the done variant; an EloChip surfaces ELO + delta.
    expect(count(tree, (n) => n.type === 'Button')).toBe(0);
    const elo = findFirst(tree, (n) => n.type === 'EloChip');
    expect(elo).not.toBeNull();
    expect(elo!.props.elo).toBe(1612);
    expect(elo!.props.delta).toBe(22);
  });

  test('done variant with loss flips the verb', () => {
    const tree = normalize(
      MatchCard({
        kind: 'done',
        opponentName: 'Onur Çelik',
        opponentElo: 1612,
        whenLabel: 'Kandilli Tenis Kortu',
        format: 'klasik',
        win: false,
        score: '2-4',
        eloDelta: -14,
      }),
    );
    const texts = textContents(tree);
    expect(texts).toContain('Kaybettin');
    expect(texts).not.toContain('Kazandın');
  });
});
