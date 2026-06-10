// Snapshot tests for the Icon primitive.
//
// Mirrors the bun:test + normalized-tree pattern used by
//   apps/mobile/components/ui/__tests__/Button.test.tsx
// and
//   apps/mobile/components/ui/doodles/__tests__/doodles.test.tsx
// — RNTL is not installed, so we mock react-native + react-native-svg with
// string-named stubs and snapshot the normalized React element tree.
//
// The snapshots lock in:
//   - viewBox / width / height / strokeLinecap / strokeLinejoin defaults
//   - color (stroke) + fill props
//   - the actual `d` / `cx` / `cy` / `rx` payload of each shape
//   - element order so multi-shape icons don't silently re-order
//
// We snapshot a *representative* set of icons across shape categories
// (chevron, plus, trophy, mail, check, warn, lock, dots) instead of all
// 60+ entries — the goal is to catch regressions in the rendering path,
// not to repeat what `bun snapshot` already does for every key.

import { describe, expect, mock, test } from 'bun:test';
import type { ReactElement } from 'react';
// Type-only import is erased at runtime, so it stays compatible with the
// mock.module() calls below — no react-native-svg native code is required.
import type { IconName } from '../Icon';

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
}));

mock.module('react-native', () => ({}));

// Import AFTER the mocks so Icon picks up the stubs.
const { Icon } = await import('../Icon');

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
  // Fragments don't have a useful displayName — flatten them by surfacing
  // children with a 'Fragment' label so snapshot shapes stay readable.
  const typeLabel = (() => {
    if (typeof elType === 'symbol') return 'Fragment';
    return describeType(elType);
  })();
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

describe('Icon', () => {
  // ----------- shape category snapshots -----------
  test.each<IconName>([
    'chevR',
    'plus',
    'trophy',
    'mail',
    'check',
    'warn',
    'lock',
    'dots',
  ])('renders %s with defaults', (name) => {
    expect(normalize(Icon({ name }))).toMatchSnapshot();
  });

  test('applies custom size, color, stroke, fill', () => {
    expect(
      normalize(
        Icon({
          name: 'star',
          size: 32,
          color: '#F5B924',
          stroke: 1.6,
          fill: '#F5B924',
        }),
      ),
    ).toMatchSnapshot();
  });

  test('multi-shape icon (settings) preserves child element order', () => {
    const tree = normalize(Icon({ name: 'settings' }));
    expect(tree).toMatchSnapshot();
    if (tree && typeof tree === 'object') {
      // <Svg> wraps a Fragment containing <Circle> + <Path>.
      expect(tree.type).toBe('Svg');
      // Some renders flatten the fragment, others keep it wrapped — accept both
      // shapes by walking until we hit named shape children.
      const flat: Normalized[] = [];
      const walk = (n: Normalized) => {
        if (n && typeof n === 'object') {
          if (n.type === 'Fragment') n.children.forEach(walk);
          else flat.push(n);
        }
      };
      tree.children.forEach(walk);
      const types = flat.map((c) => (c && typeof c === 'object' ? c.type : null));
      expect(types).toEqual(['Circle', 'Path']);
    }
  });

  test('Svg defaults: viewBox, fill=none, stroke linecap/join round', () => {
    const tree = normalize(Icon({ name: 'check' }));
    if (tree && typeof tree === 'object') {
      expect(tree.type).toBe('Svg');
      expect(tree.props.viewBox).toBe('0 0 24 24');
      expect(tree.props.fill).toBe('none');
      expect(tree.props.strokeLinecap).toBe('round');
      expect(tree.props.strokeLinejoin).toBe('round');
      expect(tree.props.strokeWidth).toBe(2);
      expect(tree.props.width).toBe(24);
      expect(tree.props.height).toBe(24);
    }
  });

  test('IconName union covers expected keys', () => {
    // Compile-time check via assignment — exposes regressions if an icon is
    // removed or renamed in the registry.
    const sample: IconName[] = [
      'chevR',
      'chevL',
      'chevU',
      'chevD',
      'back',
      'arrowRight',
      'x',
      'xCircle',
      'check',
      'checkCircle',
      'plus',
      'refresh',
      'share',
      'bell',
      'bellOff',
      'trash',
      'edit',
      'trophy',
      'crown',
      'flame',
      'bolt',
      'shield',
      'star',
      'medal',
      'spark',
      'flag',
      'megaphone',
      'handshake',
      'ranking',
      'matches',
      'search',
      'filter',
      'list',
      'settings',
      'user',
      'mail',
      'phone',
      'pin',
      'calendar',
      'clock',
      'camera',
      'eye',
      'eyeOff',
      'lock',
      'link',
      'info',
      'warn',
      'swap',
      'dots',
      'snow',
      'moon',
      'sun',
      'ban',
      'home',
      'compass',
      'people',
      'diamond',
      'grid',
      'wifiOff',
      'download',
    ];
    // At least 50 names must be valid IconNames.
    expect(sample.length).toBeGreaterThanOrEqual(50);
  });
});
