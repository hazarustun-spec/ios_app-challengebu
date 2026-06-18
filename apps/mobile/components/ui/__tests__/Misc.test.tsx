// Snapshot tests for the final batch of Phase C primitives:
//   GreetHeader + LevelRing + Skel + EmptyState + BellWithBadge + ScoreInput.
//
// Follows the same `bun:test` + normalized-tree pattern as
//   apps/mobile/components/ui/__tests__/Selection.test.tsx
//   apps/mobile/components/ui/__tests__/Overlay.test.tsx
//   apps/mobile/components/ui/__tests__/Feedback.test.tsx
// — @testing-library/react-native isn't installed, so we substitute the
// react-native host components (View, Text, Pressable, Image, ActivityIndicator)
// plus react-native-svg + react-native-reanimated with stable string-named
// stand-ins and snapshot the resulting React element tree.
//
// What the snapshots lock in:
//   - GreetHeader: name + sub copy, padding tokens, BellWithBadge wiring,
//     accessibilityLabel on the bell tap target.
//   - LevelRing: forwards the level color out of `levelForElo` as the
//     Avatar `ring` prop (mid-tier ELO → rekabet color).
//   - Skel: default vs custom dimensions; surface-2 fill color.
//   - EmptyState: info vs error tones (different chip backgrounds /
//     icon colors), action button presence, extra footer slot.
//   - BellWithBadge: badge appears only when count > 0; "99+" overflow
//     at counts > 99.
//   - ScoreInput: tint forwarded to Icon `color`; disabled variant
//     drops onPress + adds opacity-50 to className.

import { describe, expect, mock, test } from 'bun:test';
import {
  createElement,
  type ReactElement,
  type ReactNode,
} from 'react';

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
  ActivityIndicator: makeTag('ActivityIndicator'),
}));

mock.module('react-native-svg', () => ({
  default: makeTag('Svg'),
  Svg: makeTag('Svg'),
  Path: makeTag('Path'),
  Circle: makeTag('Circle'),
  Rect: makeTag('Rect'),
}));

// react-native-reanimated: stub Animated.View as a tagged host component
// and replace the worklet hooks with deterministic no-ops. Real reanimated
// runs these on the UI thread via a worklet runtime bun:test cannot
// provide.
mock.module('react-native-reanimated', () => {
  const AnimatedNamespace = {
    View: makeTag('Animated.View'),
    createAnimatedComponent: (C: unknown) => C,
  };
  return {
    default: AnimatedNamespace,
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
    useAnimatedProps: (factory: () => Record<string, unknown>) => {
      try {
        return factory();
      } catch {
        return {};
      }
    },
    withTiming: (toValue: number) => toValue,
    withRepeat: (toValue: unknown) => toValue,
    withDelay: (_delay: number, toValue: unknown) => toValue,
    interpolate: (value: number, _input: number[], output: number[]) => {
      // Simple linear interpolation stub.
      if (!output || output.length < 2) return 0;
      return value <= 0 ? output[0] : value >= 1 ? output[output.length - 1] : output[0];
    },
    Easing: {
      inOut: () => (t: number) => t,
      ease: (t: number) => t,
      out: () => (t: number) => t,
      cubic: (t: number) => t,
    },
  };
});

// Import AFTER the mocks so the components pick up the stubs.
const { GreetHeader } = await import('../GreetHeader');
const { LevelRing } = await import('../LevelRing');
const { Skel } = await import('../Skel');
const { EmptyState } = await import('../EmptyState');
const { BellWithBadge } = await import('../BellWithBadge');
const { ScoreInput } = await import('../ScoreInput');

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
  for (const key of ['onPress', 'onChange', 'onBellPress', 'onAction', 'onLayout'] as const) {
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

function findAll(
  node: Normalized,
  predicate: (n: { type: string; props: Record<string, unknown> }) => boolean,
): Array<{ type: string; props: Record<string, unknown>; children: Normalized[] }> {
  const out: Array<{
    type: string;
    props: Record<string, unknown>;
    children: Normalized[];
  }> = [];
  function walk(n: Normalized): void {
    if (n === null || typeof n === 'string' || typeof n === 'number') return;
    if (predicate({ type: n.type, props: n.props })) out.push(n);
    for (const c of n.children) walk(c);
  }
  walk(node);
  return out;
}

// ---------------------------------------------------------------------------
// GreetHeader
// ---------------------------------------------------------------------------

describe('GreetHeader', () => {
  test('renders name + sub + bell', () => {
    const tree = normalize(
      GreetHeader({
        name: 'Hazar',
        sub: 'Bugün maç günü mü?',
        unreadCount: 3,
        onBellPress: () => {},
      }),
    );
    expect(tree).toMatchSnapshot();
    // Bell tap target should be a Pressable with the right a11y label.
    const bell = find(
      tree,
      (n) =>
        n.type === 'Pressable' && n.props.accessibilityLabel === 'Bildirimler',
    );
    expect(bell).not.toBeNull();
  });

  test('without sub line', () => {
    const tree = normalize(
      GreetHeader({ name: 'Hazar' }),
    );
    expect(tree).toMatchSnapshot();
    // Exactly two Text nodes ("Selam," + name) when sub is omitted.
    const texts = findAll(tree, (n) => n.type === 'Text');
    expect(texts.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// LevelRing
// ---------------------------------------------------------------------------

describe('LevelRing', () => {
  test('mid-tier ELO renders Avatar (no ring prop) + SVG overlay', () => {
    // Wave 1: LevelRing now overlays an animated SVG ring instead of
    // forwarding the `ring` color to Avatar's border. The Avatar is
    // rendered WITHOUT `ring` (undefined) and an Svg is placed on top.
    const tree = normalize(
      LevelRing({ name: 'Mert Şahin', elo: 1612 }),
    );
    expect(tree).toMatchSnapshot();
    // Avatar present with correct name + size but no ring prop.
    const avatar = find(tree, (n) => n.type === 'Avatar');
    expect(avatar).not.toBeNull();
    expect(avatar?.props.ring).toBeUndefined();
    expect(avatar?.props.name).toBe('Mert Şahin');
    expect(avatar?.props.size).toBe(82);
    // SVG overlay present somewhere in the tree.
    const svg = find(tree, (n) => n.type === 'Svg');
    expect(svg).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Skel
// ---------------------------------------------------------------------------

describe('Skel', () => {
  test('default size', () => {
    expect(normalize(Skel({}))).toMatchSnapshot();
  });

  test('custom dimensions', () => {
    expect(
      normalize(Skel({ w: 120, h: 32, r: 16 })),
    ).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

describe('EmptyState', () => {
  test('info tone with action button', () => {
    const tree = normalize(
      EmptyState({
        icon: 'matches',
        title: 'Henüz maç yok',
        body: 'İlk maçını oluştur.',
        action: 'Yeni maç oluştur',
        onAction: () => {},
      }),
    );
    expect(tree).toMatchSnapshot();
    // Default tone => surface-2 chip (#F3F3F1).
    const chip = find(
      tree,
      (n) =>
        typeof n.props.style === 'object' &&
        n.props.style !== null &&
        (n.props.style as { backgroundColor?: string }).backgroundColor === '#F3F3F1',
    );
    expect(chip).not.toBeNull();
  });

  test('error tone with extra technical code', () => {
    const tree = normalize(
      EmptyState({
        tone: 'error',
        icon: 'lock',
        title: 'Oturum süresi doldu',
        body: 'Yeniden giriş yap.',
        action: 'Tekrar giriş yap',
        onAction: () => {},
        extra: createElement('Text' as unknown as string, {}, 'TOKEN_EXPIRED · 401') as ReactNode,
      }),
    );
    expect(tree).toMatchSnapshot();
    // Error tone => pink-soft chip (#FCE6E4).
    const chip = find(
      tree,
      (n) =>
        typeof n.props.style === 'object' &&
        n.props.style !== null &&
        (n.props.style as { backgroundColor?: string }).backgroundColor === '#FCE6E4',
    );
    expect(chip).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// BellWithBadge
// ---------------------------------------------------------------------------

describe('BellWithBadge', () => {
  test('count=0 renders bell only (no badge pip)', () => {
    const tree = normalize(BellWithBadge({ count: 0 }));
    expect(tree).toMatchSnapshot();
    const texts = findAll(tree, (n) => n.type === 'Text');
    expect(texts.length).toBe(0);
  });

  test('count=5 renders bell + pip with "5"', () => {
    const tree = normalize(BellWithBadge({ count: 5 }));
    expect(tree).toMatchSnapshot();
    const texts = findAll(tree, (n) => n.type === 'Text');
    expect(texts.length).toBe(1);
    expect(texts[0]?.children[0]).toBe(5);
  });

  test('count=150 overflows to "99+"', () => {
    const tree = normalize(BellWithBadge({ count: 150 }));
    expect(tree).toMatchSnapshot();
    const texts = findAll(tree, (n) => n.type === 'Text');
    expect(texts.length).toBe(1);
    expect(texts[0]?.children[0]).toBe('99+');
  });
});

// ---------------------------------------------------------------------------
// ScoreInput
// ---------------------------------------------------------------------------

describe('ScoreInput', () => {
  test('with court tint (my-side button)', () => {
    const tree = normalize(
      ScoreInput({ label: 'Sana sayı', tint: '#2270BC', onPress: () => {} }),
    );
    expect(tree).toMatchSnapshot();
    // Icon receives the tint color.
    const icon = find(tree, (n) => n.type === 'Icon');
    expect(icon?.props.color).toBe('#2270BC');
  });

  test('without tint (opponent button) falls back to ink', () => {
    const tree = normalize(
      ScoreInput({ label: 'Berk sayı', onPress: () => {} }),
    );
    expect(tree).toMatchSnapshot();
    const icon = find(tree, (n) => n.type === 'Icon');
    expect(icon?.props.color).toBe('#161618');
  });

  test('disabled drops onPress + adds opacity-50', () => {
    const tree = normalize(
      ScoreInput({ label: 'Disabled', onPress: () => {}, disabled: true }),
    );
    expect(tree).toMatchSnapshot();
    const pressable = find(tree, (n) => n.type === 'Pressable');
    expect(pressable?.props.onPress).toBeUndefined();
    expect(pressable?.props.disabled).toBe(true);
    expect(String(pressable?.props.className ?? '')).toContain('opacity-50');
  });
});
