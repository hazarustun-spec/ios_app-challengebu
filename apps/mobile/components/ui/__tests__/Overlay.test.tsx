// Snapshot tests for the Overlay primitives (Modal + Sheet).
//
// Mirrors the bun:test + normalized-tree pattern used by
//   apps/mobile/components/ui/__tests__/Selection.test.tsx
// because @testing-library/react-native isn't installed. We substitute the
// react-native host components (View, Text, Pressable, Modal) plus the
// `Dimensions` module and react-native-reanimated with deterministic
// stand-ins so the snapshots stay stable across environments where the
// actual screen size / animation worklet runtime is unavailable.
//
// What the snapshots lock in:
//   - Backdrop styling + dismissibility flag on the outer Pressable.
//   - Animated content wrapper presence + child structure.
//   - Modal: dismissible={false} drops the backdrop press handler.
//   - Sheet: optional title (centered h3) + grabHandle (default-on pill).

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
  Modal: makeTag('RNModal'),
  Dimensions: {
    get: (_dim: string) => ({ width: 390, height: 844 }),
  },
}));

// react-native-reanimated: stub Animated.View as a tagged host component and
// replace the worklet hooks with deterministic no-ops. The real values run
// on the UI thread via a runtime bun:test cannot provide.
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
  Easing: {
    bezier: () => 'easing',
  },
}));

// Import AFTER the mocks so the components pick up the stubs.
const { Modal } = await import('../Modal');
const { Sheet } = await import('../Sheet');

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
  for (const key of ['onPress', 'onClose', 'onRequestClose'] as const) {
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

// A literal text node used in place of <Text>...</Text> children since the
// components are invoked as functions (not rendered through React), so we
// stick raw strings into the children slot.
function textNode(value: string): ReactNode {
  return value as unknown as ReactNode;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

describe('Modal', () => {
  test('visible with dismissible default renders backdrop press handler', () => {
    const tree = normalize(
      Modal({
        visible: true,
        onClose: () => {},
        children: textNode('Hesabı sil?'),
      }),
    );
    expect(tree).toMatchSnapshot();
    // The outer Pressable is the backdrop — it must wire onPress when
    // dismissible is true.
    const backdrop = find(tree, (n) => n.type === 'Pressable');
    expect(backdrop).not.toBeNull();
    expect(backdrop?.props.onPress).toBe('[Function]');
  });

  test('hidden state still renders the RN Modal (visible=false)', () => {
    const tree = normalize(
      Modal({
        visible: false,
        onClose: () => {},
        children: textNode('hidden'),
      }),
    );
    expect(tree).toMatchSnapshot();
    const rnModal = find(tree, (n) => n.type === 'RNModal');
    expect(rnModal?.props.visible).toBe(false);
  });

  test('dismissible=false drops backdrop press handler', () => {
    const tree = normalize(
      Modal({
        visible: true,
        dismissible: false,
        onClose: () => {},
        children: textNode('blocking'),
      }),
    );
    expect(tree).toMatchSnapshot();
    // The outermost Pressable (backdrop) has no onPress when dismissible is
    // false — taps outside the content should be inert.
    const backdrop = find(tree, (n) => n.type === 'Pressable');
    expect(backdrop?.props.onPress).toBeUndefined();
    expect(backdrop?.props.accessibilityRole).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

describe('Sheet', () => {
  test('renders title and grab handle by default', () => {
    const tree = normalize(
      Sheet({
        visible: true,
        onClose: () => {},
        title: 'Format seç',
        children: textNode('Option list'),
      }),
    );
    expect(tree).toMatchSnapshot();
    // Title text appears verbatim in a Text node.
    const titleNode = find(
      tree,
      (n) =>
        n.type === 'Text' &&
        typeof (n.props as Record<string, unknown>).className === 'string',
    );
    expect(titleNode).not.toBeNull();
  });

  test('omits title node when title prop missing', () => {
    const tree = normalize(
      Sheet({
        visible: true,
        onClose: () => {},
        children: textNode('untitled'),
      }),
    );
    expect(tree).toMatchSnapshot();
    // No Text node should appear when title is absent.
    const textHit = find(tree, (n) => n.type === 'Text');
    expect(textHit).toBeNull();
  });

  test('grabHandle={false} drops the handle pill', () => {
    const tree = normalize(
      Sheet({
        visible: true,
        onClose: () => {},
        title: 'X',
        grabHandle: false,
        children: textNode('no handle'),
      }),
    );
    expect(tree).toMatchSnapshot();
    // The handle is the only View with `bg-surface-3` class — its absence
    // means the snapshot's content Animated.View has fewer children.
    const handle = find(
      tree,
      (n) =>
        n.type === 'View' &&
        typeof (n.props as Record<string, unknown>).className === 'string' &&
        ((n.props as Record<string, string>).className).includes('bg-surface-3'),
    );
    expect(handle).toBeNull();
  });
});
