// Snapshot tests for the Selection primitives (Segmented + Toggle + CheckBox).
//
// Follows the same `bun:test` + normalized-tree pattern as
//   apps/mobile/components/ui/__tests__/Button.test.tsx
//   apps/mobile/components/ui/__tests__/Field.test.tsx
//   apps/mobile/components/ui/__tests__/Icon.test.tsx
// — @testing-library/react-native isn't installed, so we substitute the
// react-native host components (View, Text, Pressable) plus
// react-native-svg + react-native-reanimated with stable string-named
// stand-ins and snapshot the resulting React element tree.
//
// What the snapshots lock in:
//   - className strings per variant / size (token regressions surface)
//   - Pressable accessibilityRole + accessibilityState (switch / checkbox / radio / button)
//   - Toggle: track + thumb structure; on/off state via background class
//   - CheckBox: presence/absence of inner Icon, shape -> rounded-* class
//   - Segmented: option count + selected styling per row

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
  Pressable: makeTag('Pressable'),
}));

mock.module('react-native-svg', () => ({
  default: makeTag('Svg'),
  Svg: makeTag('Svg'),
  Path: makeTag('Path'),
  Circle: makeTag('Circle'),
  Rect: makeTag('Rect'),
}));

// react-native-reanimated: stub Animated.View as a tagged host component
// and replace the shared-value / derived-value / animated-style hooks with
// no-op implementations so the tree stays deterministic across snapshot runs.
// Real reanimated calls these on the UI thread via a worklet runtime that
// bun:test can't provide.
mock.module('react-native-reanimated', () => ({
  default: {
    View: makeTag('Animated.View'),
  },
  useSharedValue: (initial: number) => ({ value: initial }),
  useDerivedValue: (factory: () => unknown) => {
    let value: unknown;
    try {
      value = factory();
    } catch {
      value = 0;
    }
    return { value };
  },
  useAnimatedStyle: (factory: () => Record<string, unknown>) => {
    try {
      return factory();
    } catch {
      return {};
    }
  },
  withTiming: (toValue: number) => toValue,
}));

// Import AFTER the mocks so the components pick up the stubs.
const { Segmented } = await import('../Segmented');
const { Toggle } = await import('../Toggle');
const { CheckBox } = await import('../CheckBox');

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
  // Drop callback identities so snapshots stay stable across runs.
  for (const key of ['onChange', 'onPress'] as const) {
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

// Count nodes matching predicate.
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
// Segmented
// ---------------------------------------------------------------------------

describe('Segmented', () => {
  test('renders 3 options with one selected', () => {
    const tree = normalize(
      Segmented({
        value: 'hafta',
        onChange: () => {},
        options: [
          { value: 'hafta', label: 'Haftalık' },
          { value: 'ay', label: 'Aylık' },
          { value: 'sezon', label: 'Sezon' },
        ],
      }),
    );
    expect(tree).toMatchSnapshot();
    // Sanity-check: one Pressable per option (3 total).
    expect(count(tree, (n) => n.type === 'Pressable')).toBe(3);
  });

  test('sm size variant', () => {
    expect(
      normalize(
        Segmented({
          size: 'sm',
          value: 'a',
          onChange: () => {},
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
        }),
      ),
    ).toMatchSnapshot();
  });

  test('numeric option values are supported', () => {
    const tree = normalize(
      Segmented({
        value: 1,
        onChange: () => {},
        options: [
          { value: 0, label: 'Sıfır' },
          { value: 1, label: 'Bir' },
          { value: 2, label: 'İki' },
        ],
      }),
    );
    expect(count(tree, (n) => n.type === 'Pressable')).toBe(3);
  });

  test('selected option marks accessibilityState.selected=true', () => {
    const tree = normalize(
      Segmented({
        value: 'b',
        onChange: () => {},
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      }),
    );
    const selectedHits: boolean[] = [];
    const collect = (n: Normalized): void => {
      if (n === null || typeof n === 'string' || typeof n === 'number') return;
      if (n.type === 'Pressable') {
        const state = n.props.accessibilityState as { selected?: boolean };
        selectedHits.push(state?.selected === true);
      }
      for (const child of n.children) collect(child);
    };
    collect(tree);
    expect(selectedHits).toEqual([false, true]);
  });
});

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

describe('Toggle', () => {
  test('renders off state', () => {
    expect(normalize(Toggle({ value: false, onChange: () => {} }))).toMatchSnapshot();
  });

  test('renders on state', () => {
    expect(normalize(Toggle({ value: true, onChange: () => {} }))).toMatchSnapshot();
  });

  test('renders disabled state', () => {
    expect(normalize(Toggle({ value: true, disabled: true }))).toMatchSnapshot();
  });

  test('off state exposes accessibilityRole=switch + checked=false', () => {
    const tree = normalize(Toggle({ value: false, onChange: () => {} }));
    const pressable = find(tree, (n) => n.type === 'Pressable');
    expect(pressable).not.toBeNull();
    expect(pressable?.props.accessibilityRole).toBe('switch');
    const state = pressable?.props.accessibilityState as { checked?: boolean };
    expect(state.checked).toBe(false);
  });

  test('on state flips accessibilityState.checked to true', () => {
    const tree = normalize(Toggle({ value: true, onChange: () => {} }));
    const pressable = find(tree, (n) => n.type === 'Pressable');
    const state = pressable?.props.accessibilityState as { checked?: boolean };
    expect(state.checked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CheckBox
// ---------------------------------------------------------------------------

describe('CheckBox', () => {
  test('square unchecked', () => {
    expect(
      normalize(CheckBox({ checked: false, onChange: () => {} })),
    ).toMatchSnapshot();
  });

  test('square checked renders inner Icon', () => {
    const tree = normalize(CheckBox({ checked: true, onChange: () => {} }));
    expect(tree).toMatchSnapshot();
    // We call CheckBox directly so children are unrendered React elements —
    // the Icon component appears as a child element with type label 'Icon'.
    expect(find(tree, (n) => n.type === 'Icon')).not.toBeNull();
  });

  test('circle (radio) checked exposes accessibilityRole=radio', () => {
    const tree = normalize(
      CheckBox({ shape: 'circle', checked: true, onChange: () => {} }),
    );
    expect(tree).toMatchSnapshot();
    const pressable = find(tree, (n) => n.type === 'Pressable');
    expect(pressable?.props.accessibilityRole).toBe('radio');
  });

  test('square unchecked exposes accessibilityRole=checkbox', () => {
    const tree = normalize(CheckBox({ checked: false, onChange: () => {} }));
    const pressable = find(tree, (n) => n.type === 'Pressable');
    expect(pressable?.props.accessibilityRole).toBe('checkbox');
  });

  test('disabled state', () => {
    expect(normalize(CheckBox({ checked: false, disabled: true }))).toMatchSnapshot();
  });

  test('custom size scales the inner check icon to ~60%', () => {
    const tree = normalize(CheckBox({ checked: true, size: 40 }));
    const icon = find(tree, (n) => n.type === 'Icon');
    expect(icon).not.toBeNull();
    expect(icon?.props.size).toBe(24); // round(40 * 0.6) = 24
  });
});
