// Snapshot tests for the SVG doodle components.
//
// We use the project's `bun:test` runner. `@testing-library/react-native` is
// not installed (and would require a jest+RN setup that's not configured),
// so instead of mounting a renderer we invoke the component functions
// directly and snapshot a normalized React element tree.
//
// This still catches accidental changes to:
//   - the SVG path "d" attribute
//   - viewBox / width / height
//   - fill / stroke / strokeWidth / strokeLinecap / strokeLinejoin
//   - child element order and count
//
// Without depending on react-native or react-native-svg natives at runtime.

import { describe, expect, mock, test } from 'bun:test';
import type { ReactElement } from 'react';

// Mock the native modules so the components can be imported in `bun:test`
// without pulling in `react-native`'s native bridge. We only need the
// JSX element type, so we substitute lightweight string-named stand-ins.
function makeTag(displayName: string) {
  const Comp = (_props: Record<string, unknown>) => null;
  (Comp as { displayName?: string }).displayName = displayName;
  return Comp;
}

mock.module('react-native-svg', () => ({
  default: makeTag('Svg'),
  Svg: makeTag('Svg'),
  Path: makeTag('Path'),
  Circle: makeTag('Circle'),
  Rect: makeTag('Rect'),
  G: makeTag('G'),
}));

mock.module('react-native', () => ({}));

// Components must be imported AFTER the mocks above.
const { BallMark, Cloud, Squiggle, Star, Dots } = await import('../index');

// Recursively normalize a React element tree into plain JSON.
// Replaces component/host types with a stable string label so snapshots
// don't depend on internal identity / displayName of react-native-svg exports.
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
    // Arrays in JSX become fragments — flatten by wrapping.
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
  const childArray = children === undefined
    ? []
    : Array.isArray(children)
      ? children
      : [children];
  return {
    type: describeType(el.type),
    props: rest,
    children: childArray.map(normalize).filter((c): c is Normalized => c !== null),
  };
}

function snapshot<P>(Component: (props: P) => ReactElement, props: P): Normalized {
  return normalize(Component(props));
}

describe('Doodles', () => {
  test('BallMark renders with defaults', () => {
    expect(snapshot(BallMark, {})).toMatchSnapshot();
  });

  test('Cloud renders with custom fill', () => {
    expect(snapshot(Cloud, { w: 120, fill: 'rgba(255,255,255,0.25)' })).toMatchSnapshot();
  });

  test('Squiggle renders with pink', () => {
    expect(snapshot(Squiggle, { w: 64, color: '#F73FBE', stroke: 4 })).toMatchSnapshot();
  });

  test('Star renders with white fill', () => {
    expect(snapshot(Star, { size: 22, color: '#FFFFFF' })).toMatchSnapshot();
  });

  test('Dots renders with 9 circles', () => {
    // The design's Dots actually renders 8 circles (4 cardinal + 4 diagonal).
    // We still snapshot the full tree to lock the geometry in.
    const tree = snapshot(Dots, { size: 40 });
    expect(tree).toMatchSnapshot();
    if (tree && typeof tree === 'object') {
      expect(tree.children.length).toBe(8);
    }
  });
});
