// Snapshot tests for the layout primitives (Card + ListRow + NavHeader).
//
// Follows the same `bun:test` + normalized-tree pattern as
//   apps/mobile/components/ui/__tests__/Button.test.tsx
//   apps/mobile/components/ui/__tests__/Field.test.tsx
//   apps/mobile/components/ui/__tests__/Selection.test.tsx
// — @testing-library/react-native isn't installed, so we substitute the
// react-native host components (View, Text, Pressable) plus react-native-svg
// with stable string-named stand-ins and snapshot the resulting tree.
//
// What the snapshots lock in:
//   - Card: variant -> className mapping; Pressable vs View element type;
//     onPress passthrough
//   - ListRow: icon chip presence, title/subtitle text nodes, chevron,
//     right slot, danger -> text-loss class
//   - NavHeader: back button (back vs x), large vs standard title sizing,
//     trailing text action vs icon chip action, subtitle rendering

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
}));

mock.module('react-native-svg', () => ({
  default: makeTag('Svg'),
  Svg: makeTag('Svg'),
  Path: makeTag('Path'),
  Circle: makeTag('Circle'),
  Rect: makeTag('Rect'),
}));

// Import AFTER the mocks so the components pick up the stubs.
const { Card } = await import('../Card');
const { ListRow } = await import('../ListRow');
const { NavHeader } = await import('../NavHeader');

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
  for (const key of ['onPress', 'onAction', 'onBack'] as const) {
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

// Collect all text-string descendants of a node (handy for confirming
// labels like "Bildirimler" appear somewhere in a tree).
function collectText(node: Normalized, out: string[] = []): string[] {
  if (typeof node === 'string') {
    out.push(node);
    return out;
  }
  if (node === null || typeof node === 'number') return out;
  for (const child of node.children) collectText(child, out);
  return out;
}

// ListRow + NavHeader accept arbitrary ReactNode children via props (e.g.
// `right` slot, `children` to Card). Pass them in as already-normalized
// strings rather than `<Text>` to keep snapshots tight.
const textNode = (s: string): ReactNode => s;

describe('Card', () => {
  test('default variant renders a View', () => {
    const tree = normalize(Card({ children: textNode('Inside') }));
    expect(tree).toMatchSnapshot();
    if (tree && typeof tree === 'object') {
      expect(tree.type).toBe('View');
      expect(String(tree.props.className)).toContain('bg-surface');
      expect(String(tree.props.className)).toContain('border-border-strong');
    }
  });

  test('interactive variant renders a Pressable with active:opacity-80', () => {
    const tree = normalize(
      Card({ variant: 'interactive', onPress: () => {}, children: textNode('Tap me') }),
    );
    expect(tree).toMatchSnapshot();
    if (tree && typeof tree === 'object') {
      expect(tree.type).toBe('Pressable');
      expect(String(tree.props.className)).toContain('active:opacity-80');
      expect(tree.props.onPress).toBe('[Function]');
      expect(tree.props.accessibilityRole).toBe('button');
    }
  });

  test('featured variant uses court bg', () => {
    const tree = normalize(Card({ variant: 'featured', children: textNode('Hero') }));
    expect(tree).toMatchSnapshot();
    if (tree && typeof tree === 'object') {
      expect(String(tree.props.className)).toContain('bg-court');
    }
  });

  test('onPress without explicit variant upgrades to Pressable', () => {
    const tree = normalize(Card({ onPress: () => {}, children: textNode('Bare') }));
    if (tree && typeof tree === 'object') {
      expect(tree.type).toBe('Pressable');
    }
  });

  test('className prop is appended to base classes', () => {
    const tree = normalize(Card({ className: 'mt-4', children: textNode('X') }));
    if (tree && typeof tree === 'object') {
      expect(String(tree.props.className)).toContain('mt-4');
      expect(String(tree.props.className)).toContain('rounded-lg');
    }
  });
});

describe('ListRow', () => {
  test('icon + title + subtitle + chevron + onPress', () => {
    const tree = normalize(
      ListRow({
        icon: 'bell',
        title: 'Bildirimler',
        subtitle: '3 yeni',
        chevron: true,
        onPress: () => {},
      }),
    );
    expect(tree).toMatchSnapshot();
    if (tree && typeof tree === 'object') {
      expect(tree.type).toBe('Pressable');
    }
    expect(collectText(tree)).toContain('Bildirimler');
    expect(collectText(tree)).toContain('3 yeni');
  });

  test('danger row (Hesabı sil) flips title + icon to loss', () => {
    const tree = normalize(
      ListRow({ icon: 'trash', title: 'Hesabı sil', danger: true, onPress: () => {} }),
    );
    expect(tree).toMatchSnapshot();
    const title = find(
      tree,
      (n) => n.type === 'Text' && String(n.props.className).includes('text-loss'),
    );
    expect(title).not.toBeNull();
  });

  test('right node renders between content and chevron', () => {
    const tree = normalize(
      ListRow({ icon: 'bell', title: 'Push', right: textNode('ON') }),
    );
    expect(tree).toMatchSnapshot();
    expect(collectText(tree)).toContain('ON');
  });

  test('no onPress renders bare View (not Pressable)', () => {
    const tree = normalize(ListRow({ title: 'Static row' }));
    if (tree && typeof tree === 'object') {
      // Bare row's root container is the inner View wrapper.
      expect(tree.type).toBe('View');
    }
  });

  test('iconColor override beats the default text-2 / loss color', () => {
    const tree = normalize(
      ListRow({ icon: 'bell', title: 'Custom', iconColor: '#FF00FF' }),
    );
    const icon = find(tree, (n) => n.type === 'Component' || n.type === 'Icon');
    // Icon is invoked as a function in our normalized output — find via the
    // 'name' prop rather than displayName since `Icon` is a named export.
    const iconNode = find(tree, (n) => 'name' in n.props && n.props.name === 'bell');
    expect(iconNode?.props.color).toBe('#FF00FF');
  });
});

describe('NavHeader', () => {
  test('standard with back + title', () => {
    const tree = normalize(NavHeader({ onBack: () => {}, title: 'Maç detayı' }));
    expect(tree).toMatchSnapshot();
    expect(collectText(tree)).toContain('Maç detayı');
    const back = find(tree, (n) => 'name' in n.props && n.props.name === 'back');
    expect(back).not.toBeNull();
  });

  test('large with title + subtitle', () => {
    const tree = normalize(
      NavHeader({
        large: true,
        title: 'Sıralama',
        subtitle: 'Güz Sezonu · 41 gün kaldı',
      }),
    );
    expect(tree).toMatchSnapshot();
    expect(collectText(tree)).toContain('Sıralama');
    expect(collectText(tree)).toContain('Güz Sezonu · 41 gün kaldı');
    // Large title uses the 27px display class.
    const title = find(
      tree,
      (n) => n.type === 'Text' && String(n.props.className).includes('text-[27px]'),
    );
    expect(title).not.toBeNull();
  });

  test('close icon (modal) + action text', () => {
    const tree = normalize(
      NavHeader({
        onBack: () => {},
        close: true,
        title: 'Sezon',
        action: 'Sıfırla',
        onAction: () => {},
      }),
    );
    expect(tree).toMatchSnapshot();
    // Close swaps the back arrow for the x icon.
    const xIcon = find(tree, (n) => 'name' in n.props && n.props.name === 'x');
    expect(xIcon).not.toBeNull();
    // Text action renders as clay-colored bold text.
    const actionText = find(
      tree,
      (n) => n.type === 'Text' && String(n.props.className).includes('text-clay'),
    );
    expect(actionText).not.toBeNull();
    expect(collectText(tree)).toContain('Sıfırla');
  });

  test('action icon variant on large header', () => {
    const tree = normalize(
      NavHeader({
        large: true,
        title: 'Maçlar',
        actionIcon: 'clock',
        onAction: () => {},
      }),
    );
    expect(tree).toMatchSnapshot();
    const clockIcon = find(tree, (n) => 'name' in n.props && n.props.name === 'clock');
    expect(clockIcon).not.toBeNull();
  });

  test('title-only standard centers when no back button', () => {
    const tree = normalize(NavHeader({ title: 'Ortalanmış' }));
    // The title container has items-center when no onBack present.
    const centered = find(
      tree,
      (n) => n.type === 'View' && String(n.props.className).includes('items-center'),
    );
    expect(centered).not.toBeNull();
  });
});
