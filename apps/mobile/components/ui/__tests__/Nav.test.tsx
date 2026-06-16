// Snapshot tests for the Nav primitives (TabBar + Avatar).
//
// Follows the same `bun:test` + normalized-tree pattern as
//   apps/mobile/components/ui/__tests__/Button.test.tsx
//   apps/mobile/components/ui/__tests__/Layout.test.tsx
//   apps/mobile/components/ui/__tests__/Selection.test.tsx
// — @testing-library/react-native isn't installed, so we substitute the
// react-native host components (View, Text, Pressable, Image) plus
// react-native-svg and react-native-safe-area-context with stable
// string-named stand-ins and snapshot the resulting React element tree.
//
// What the snapshots lock in:
//   - Avatar: initials extraction (1-word vs 2-word names), size scaling,
//     ring rendering, badge variants (number / frozen / level)
//   - TabBar: 5 slots, ink-fill on active + center, white ring on center,
//     pink-deep badge on notif slot with count, badge hides on active

import { describe, expect, mock, test } from 'bun:test';
import type { ReactElement, ReactNode } from 'react';

function makeTag(displayName: string) {
  const Comp = (_props: Record<string, unknown>) => null;
  (Comp as { displayName?: string }).displayName = displayName;
  return Comp;
}

mock.module('react-native', () => ({
  View: makeTag('View'),
  Text: makeTag('Text'),
  Pressable: makeTag('Pressable'),
  Image: makeTag('Image'),
}));

mock.module('react-native-svg', () => ({
  default: makeTag('Svg'),
  Svg: makeTag('Svg'),
  Path: makeTag('Path'),
  Circle: makeTag('Circle'),
  Rect: makeTag('Rect'),
}));

// Safe-area: TabBar reads `insets.bottom` to pad above the home indicator.
// Stub the hook with a fixed value so snapshots stay deterministic.
mock.module('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

// Import AFTER the mocks so the components pick up the stubs.
const { Avatar } = await import('../Avatar');
const { TabBar } = await import('../TabBar');

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
  const typeLabel = (() => {
    if (typeof elType === 'symbol') return 'Fragment';
    return describeType(elType);
  })();
  const { children, ...rest } = (el.props ?? {}) as { children?: unknown } & Record<
    string,
    unknown
  >;
  // Drop callback identities so snapshots stay stable across runs.
  for (const key of ['onPress'] as const) {
    if (key in rest) {
      rest[key] = rest[key] === undefined ? undefined : '[Function]';
    }
  }
  const childArray =
    children === undefined ? [] : Array.isArray(children) ? children : [children];
  return {
    type: typeLabel,
    props: rest,
    children: childArray.map(normalize).filter((c): c is Normalized => c !== null),
  };
}

// Walk the tree until we find the first node matching `predicate`.
function find(
  node: Normalized,
  predicate: (n: { type: string; props: Record<string, unknown> }) => boolean,
): { type: string; props: Record<string, unknown>; children: Normalized[] } | null {
  if (node === null || typeof node === 'string' || typeof node === 'number') return null;
  if (predicate({ type: node.type, props: node.props })) return node;
  for (const child of node.children) {
    const hit = find(child, predicate);
    if (hit) return hit;
  }
  return null;
}

// Walk the tree collecting every node matching `predicate`.
function findAll(
  node: Normalized,
  predicate: (n: { type: string; props: Record<string, unknown> }) => boolean,
): Array<{ type: string; props: Record<string, unknown>; children: Normalized[] }> {
  const out: Array<{
    type: string;
    props: Record<string, unknown>;
    children: Normalized[];
  }> = [];
  function walk(n: Normalized) {
    if (n === null || typeof n === 'string' || typeof n === 'number') return;
    if (predicate({ type: n.type, props: n.props })) out.push(n);
    for (const c of n.children) walk(c);
  }
  walk(node);
  return out;
}

function collectText(node: Normalized, out: Array<string | number> = []): Array<string | number> {
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(node);
    return out;
  }
  if (node === null) return out;
  for (const child of node.children) collectText(child, out);
  return out;
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

describe('Avatar', () => {
  test('initials from "Aleyna Kaya" → AK', () => {
    const tree = normalize(Avatar({ name: 'Aleyna Kaya' }));
    expect(tree).toMatchSnapshot();
    expect(collectText(tree)).toContain('AK');
  });

  test('initials from single name → A', () => {
    const tree = normalize(Avatar({ name: 'Aleyna' }));
    expect(tree).toMatchSnapshot();
    expect(collectText(tree)).toContain('A');
  });

  test('initials fallback when name is whitespace → ?', () => {
    const tree = normalize(Avatar({ name: '   ' }));
    expect(collectText(tree)).toContain('?');
  });

  test('size 92 (large profile) scales the box + font', () => {
    const tree = normalize(Avatar({ name: 'Kaan Demir', size: 92 }));
    expect(tree).toMatchSnapshot();
    if (tree && typeof tree === 'object') {
      const style = tree.props.style as { width?: number; height?: number };
      expect(style.width).toBe(92);
      expect(style.height).toBe(92);
    }
  });

  test('with ring renders a colored outer container with 3px padding', () => {
    const tree = normalize(Avatar({ name: 'Mert', ring: '#2270BC' }));
    expect(tree).toMatchSnapshot();
    // The second-level View carries the ring color as backgroundColor.
    const ringNode = find(tree, (n) => {
      if (n.type !== 'View') return false;
      const style = n.props.style as { backgroundColor?: string } | undefined;
      return style?.backgroundColor === '#2270BC';
    });
    expect(ringNode).not.toBeNull();
  });

  test('with number badge renders pink-deep circle + numeric text', () => {
    const tree = normalize(Avatar({ name: 'Mert', badge: 1 }));
    expect(tree).toMatchSnapshot();
    expect(collectText(tree)).toContain(1);
    // Badge backgroundColor should match pinkDeep token.
    const badgeNode = find(tree, (n) => {
      if (n.type !== 'View') return false;
      const style = n.props.style as { backgroundColor?: string } | undefined;
      return style?.backgroundColor === '#C81E92';
    });
    expect(badgeNode).not.toBeNull();
  });

  test('with frozen badge renders snow icon over frozen color', () => {
    const tree = normalize(Avatar({ name: 'Mert', badge: 'frozen' }));
    expect(tree).toMatchSnapshot();
    const snow = find(tree, (n) => 'name' in n.props && n.props.name === 'snow');
    expect(snow).not.toBeNull();
    const badgeNode = find(tree, (n) => {
      if (n.type !== 'View') return false;
      const style = n.props.style as { backgroundColor?: string } | undefined;
      return style?.backgroundColor === '#5E7CB4'; // colors.frozen
    });
    expect(badgeNode).not.toBeNull();
  });

  test('with level badge renders the supplied icon + color', () => {
    const tree = normalize(
      Avatar({
        name: 'Mert',
        badge: { kind: 'level', color: '#2742A0', icon: 'crown' },
      }),
    );
    expect(tree).toMatchSnapshot();
    const crown = find(tree, (n) => 'name' in n.props && n.props.name === 'crown');
    expect(crown).not.toBeNull();
  });

  test('photo URI wins over initials', () => {
    const tree = normalize(
      Avatar({ name: 'Mert', uri: 'https://example.com/me.jpg' }),
    );
    const image = find(tree, (n) => n.type === 'Image');
    expect(image).not.toBeNull();
    // Initials Text should NOT be present when a URI is supplied.
    expect(collectText(tree)).not.toContain('M');
  });
});

// ---------------------------------------------------------------------------
// TabBar
// ---------------------------------------------------------------------------

// Minimal BottomTabBarProps stand-in — the component only reads
// `state.index`, `state.routes`, `navigation.navigate`, `navigation.emit`.
const mockRoutes = [
  { key: 'index-1', name: 'index' },
  { key: 'matches-1', name: 'matches' },
  { key: 'new-match-1', name: 'new-match' },
  { key: 'leaderboard-1', name: 'leaderboard' },
  { key: 'profile-1', name: 'profile' },
];

function makeNav() {
  return {
    navigate: () => {},
    emit: () => ({ defaultPrevented: false }),
  };
}

describe('TabBar', () => {
  test('renders 5 slots with index active', () => {
    const tree = normalize(
      TabBar({
        state: { index: 0, routes: mockRoutes },
        navigation: makeNav(),
      }),
    );
    expect(tree).toMatchSnapshot();
    // 5 Pressables (one per slot).
    const slots = findAll(tree, (n) => n.type === 'Pressable');
    expect(slots.length).toBe(5);
    // Slot 0 (index) should carry the ink-fill background class.
    expect(String(slots[0]?.props.className)).toContain('bg-court');
    // Slot 1 (matches) should be transparent.
    expect(String(slots[1]?.props.className)).toContain('bg-transparent');
    // Slot 2 (new-match) is the central "+" — ink bg + white ring border.
    expect(String(slots[2]?.props.className)).toContain('bg-court');
    expect(String(slots[2]?.props.className)).toContain('border-white');
  });

  test('central + slot is always court-blue-filled with white ring even when inactive', () => {
    const tree = normalize(
      TabBar({
        state: { index: 1, routes: mockRoutes }, // matches active
        navigation: makeNav(),
      }),
    );
    const slots = findAll(tree, (n) => n.type === 'Pressable');
    // Index slot is no longer active.
    expect(String(slots[0]?.props.className)).toContain('bg-transparent');
    // Matches slot now active.
    expect(String(slots[1]?.props.className)).toContain('bg-court');
    // Center remains court-blue-filled.
    expect(String(slots[2]?.props.className)).toContain('bg-court');
    expect(String(slots[2]?.props.className)).toContain('border-white');
  });

  // Note: the notification tab + unread badge were removed from TabBar in the
  // Plan 8 notifications refactor (notifications moved to a standalone screen
  // reached via the home header bell). The badge-specific TabBar tests that
  // lived here were dropped along with the `notifBadgeCount` prop.

  test('lime pill container carries the design-source classes', () => {
    const tree = normalize(
      TabBar({
        state: { index: 0, routes: mockRoutes },
        navigation: makeNav(),
      }),
    );
    const pill = find(
      tree,
      (n) => n.type === 'View' && String(n.props.className).includes('bg-lime'),
    );
    expect(pill).not.toBeNull();
    expect(String(pill?.props.className)).toContain('rounded-pill');
    expect(String(pill?.props.className)).toContain('border-base');
    expect(String(pill?.props.className)).toContain('border-border-strong');
    expect(String(pill?.props.className)).toContain('h-16');
  });

  test('safe-area inset bottom is added below the pill', () => {
    const tree = normalize(
      TabBar({
        state: { index: 0, routes: mockRoutes },
        navigation: makeNav(),
      }),
    );
    // The mocked useSafeAreaInsets returns bottom: 34, so paddingBottom = 42.
    if (tree && typeof tree === 'object') {
      const style = tree.props.style as { paddingBottom?: number };
      expect(style.paddingBottom).toBe(42);
    }
  });
});

// Mark `ReactNode` as used so the import isn't pruned by the linter — it
// documents that the test helpers can accept any node shape.
const _typeFence: ReactNode = null;
void _typeFence;
