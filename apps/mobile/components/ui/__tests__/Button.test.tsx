// Snapshot tests for the Button primitive.
//
// Follows the same `bun:test` + normalized-tree pattern as
// apps/mobile/components/ui/doodles/__tests__/doodles.test.tsx —
// @testing-library/react-native isn't installed, so we substitute
// react-native's host components with stable string-named stand-ins
// and snapshot the resulting element tree.
//
// What the snapshots lock in:
//   - className strings per variant / size (so token regressions get caught)
//   - Pressable accessibilityRole / accessibilityState
//   - ActivityIndicator color when loading
//   - presence / absence of the chevron, leading icon, trailing icon, Text

import { describe, expect, mock, test } from 'bun:test';
import type { ReactElement } from 'react';

function makeTag(displayName: string) {
  const Comp = (_props: Record<string, unknown>) => null;
  (Comp as { displayName?: string }).displayName = displayName;
  return Comp;
}

mock.module('react-native', () => ({
  Pressable: makeTag('Pressable'),
  Text: makeTag('Text'),
  ActivityIndicator: makeTag('ActivityIndicator'),
}));

// Import AFTER the mock so Button picks up the stubs.
const { Button } = await import('../Button');

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
  const { children, ...rest } = (el.props ?? {}) as { children?: unknown } & Record<
    string,
    unknown
  >;
  // Drop the onPress function ref so snapshots stay stable across runs.
  if ('onPress' in rest) {
    rest.onPress = rest.onPress === undefined ? undefined : '[Function]';
  }
  const childArray =
    children === undefined ? [] : Array.isArray(children) ? children : [children];
  return {
    type: describeType(el.type),
    props: rest,
    children: childArray.map(normalize).filter((c): c is Normalized => c !== null),
  };
}

describe('Button', () => {
  test('renders text in primary variant md size', () => {
    expect(normalize(Button({ children: 'Maç oluştur', onPress: () => {} }))).toMatchSnapshot();
  });

  test('renders disabled state', () => {
    expect(normalize(Button({ children: 'Disabled', disabled: true, onPress: () => {} }))).toMatchSnapshot();
  });

  test('renders loading state with ActivityIndicator', () => {
    expect(normalize(Button({ children: 'Yükleniyor', loading: true, onPress: () => {} }))).toMatchSnapshot();
  });

  test.each(['primary', 'secondary', 'danger', 'dark', 'ghost', 'tonal'] as const)(
    'renders %s variant',
    (v) => {
      expect(normalize(Button({ variant: v, children: v }))).toMatchSnapshot();
    },
  );

  test.each(['sm', 'md', 'lg'] as const)('renders %s size', (s) => {
    expect(normalize(Button({ size: s, children: s }))).toMatchSnapshot();
  });

  test('full width prop applies w-full', () => {
    expect(normalize(Button({ full: true, children: 'Full' }))).toMatchSnapshot();
  });

  test('arrow prop renders the chevron after children', () => {
    expect(normalize(Button({ arrow: true, children: 'İleri' }))).toMatchSnapshot();
  });

  test('loading state ignores onPress and marks pressable disabled', () => {
    const tree = normalize(Button({ loading: true, onPress: () => {}, children: 'X' }));
    expect(tree).not.toBeNull();
    if (tree && typeof tree === 'object') {
      expect(tree.props.disabled).toBe(true);
      expect(tree.props.onPress).toBeUndefined();
      const state = tree.props.accessibilityState as { busy?: boolean; disabled?: boolean };
      expect(state.busy).toBe(true);
      expect(state.disabled).toBe(true);
    }
  });

  test('disabled state ignores onPress', () => {
    const tree = normalize(Button({ disabled: true, onPress: () => {}, children: 'X' }));
    if (tree && typeof tree === 'object') {
      expect(tree.props.disabled).toBe(true);
      expect(tree.props.onPress).toBeUndefined();
    }
  });
});
