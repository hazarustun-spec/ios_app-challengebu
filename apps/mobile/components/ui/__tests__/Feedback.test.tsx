// Snapshot tests for the Feedback primitives (Banner + ToastView).
//
// Follows the same `bun:test` + normalized-tree pattern as
//   apps/mobile/components/ui/__tests__/Selection.test.tsx
//   apps/mobile/components/ui/__tests__/Overlay.test.tsx
// — @testing-library/react-native isn't installed, so we substitute the
// react-native host components (View, Text) plus react-native-svg with
// stable string-named stand-ins and snapshot the resulting React element
// tree.
//
// What the snapshots lock in:
//   - Banner: 4 distinct tone styles (info/success/warning/error) → each
//     produces a different bg+border class combo + Icon name + iconColor.
//   - Banner: `inline` flips outer padding p-3.5 → p-3.
//   - ToastView: ink background, lime check on success, loss xCircle on
//     error.
//
// We deliberately do NOT test ToastProvider here — its imperative API
// relies on Animated + setTimeout + useState, which would require
// timer-mocking and animation-runtime stubs that bun:test doesn't ship by
// default. The visual surface is covered through ToastView; behavioral
// coverage lands in iOS Simulator QA (Plan 8 Phase J).

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
const { Banner } = await import('../Banner');
const { ToastView } = await import('../Toast');

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

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

describe('Banner', () => {
  test('info tone', () => {
    const tree = normalize(
      Banner({
        tone: 'info',
        title: 'Sezon finali yaklaşıyor',
        body: "İlk 8'e girmek için 41 günün var.",
      }),
    );
    expect(tree).toMatchSnapshot();
    const icon = find(tree, (n) => n.type === 'Icon');
    expect(icon?.props.name).toBe('info');
  });

  test('success tone', () => {
    const tree = normalize(
      Banner({
        tone: 'success',
        title: 'Skor onaylandı',
        body: "ELO'n 1590 → 1612.",
      }),
    );
    expect(tree).toMatchSnapshot();
    const icon = find(tree, (n) => n.type === 'Icon');
    expect(icon?.props.name).toBe('check');
  });

  test('warning tone', () => {
    const tree = normalize(
      Banner({ tone: 'warning', title: 'Skor onayı bekliyor' }),
    );
    expect(tree).toMatchSnapshot();
    const icon = find(tree, (n) => n.type === 'Icon');
    expect(icon?.props.name).toBe('warn');
    // body missing → only the title Text node should be present.
    const texts: string[] = [];
    const collect = (n: Normalized): void => {
      if (n === null || typeof n === 'string' || typeof n === 'number') return;
      if (n.type === 'Text') {
        for (const c of n.children) {
          if (typeof c === 'string') texts.push(c);
        }
      }
      for (const c of n.children) collect(c);
    };
    collect(tree);
    expect(texts).toEqual(['Skor onayı bekliyor']);
  });

  test('error tone', () => {
    const tree = normalize(
      Banner({
        tone: 'error',
        title: 'Skorlar uyuşmuyor',
        body: 'İtiraz açıldı.',
      }),
    );
    expect(tree).toMatchSnapshot();
    const icon = find(tree, (n) => n.type === 'Icon');
    expect(icon?.props.name).toBe('xCircle');
  });

  test('inline padding variant', () => {
    const tree = normalize(
      Banner({ tone: 'info', title: 'kompakt', inline: true }),
    );
    expect(tree).toMatchSnapshot();
    // The outermost View carries the inline padding token (p-3 vs p-3.5).
    const root = find(tree, (n) => n.type === 'View');
    expect(typeof root?.props.className).toBe('string');
    expect(root?.props.className as string).toContain(' p-3');
    expect(root?.props.className as string).not.toContain('p-3.5');
  });
});

// ---------------------------------------------------------------------------
// ToastView
// ---------------------------------------------------------------------------

describe('ToastView', () => {
  test('success variant', () => {
    const tree = normalize(
      ToastView({ variant: 'success', message: 'Meydan okuma gönderildi' }),
    );
    expect(tree).toMatchSnapshot();
    const icon = find(tree, (n) => n.type === 'Icon');
    expect(icon?.props.name).toBe('check');
  });

  test('error variant', () => {
    const tree = normalize(
      ToastView({ variant: 'error', message: 'Hata oluştu' }),
    );
    expect(tree).toMatchSnapshot();
    const icon = find(tree, (n) => n.type === 'Icon');
    expect(icon?.props.name).toBe('xCircle');
  });

  test('defaults to success when variant omitted', () => {
    const tree = normalize(ToastView({ message: 'Tamam' }));
    const icon = find(tree, (n) => n.type === 'Icon');
    expect(icon?.props.name).toBe('check');
  });
});
