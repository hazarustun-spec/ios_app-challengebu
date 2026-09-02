// Snapshot tests for the Field + SearchBar primitives.
//
// Follows the same `bun:test` + normalized-tree pattern as
//   apps/mobile/components/ui/__tests__/Button.test.tsx
// and
//   apps/mobile/components/ui/__tests__/Icon.test.tsx
// — @testing-library/react-native isn't installed, so we substitute the
// react-native host components (View, Text, TextInput, Pressable) plus
// react-native-svg with stable string-named stand-ins and snapshot the
// resulting React element tree.
//
// What the snapshots lock in:
//   - className strings per variant (label / icon+suffix / error / big)
//     so token regressions surface immediately
//   - TextInput passthroughs: secureTextEntry, keyboardType,
//     autoCapitalize, autoCorrect derived from the `type` prop
//   - presence + ordering of leading Icon, TextInput, trailing suffix
//   - Pressable wrapping when `onSuffixPress` is supplied
//   - SearchBar preset (default placeholder + custom placeholder)

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
  TextInput: makeTag('TextInput'),
  Pressable: makeTag('Pressable'),
}));

mock.module('react-native-svg', () => ({
  default: makeTag('Svg'),
  Svg: makeTag('Svg'),
  Path: makeTag('Path'),
  Circle: makeTag('Circle'),
  Rect: makeTag('Rect'),
}));

// Import AFTER the mocks so Field/SearchBar pick up the stubs.
const { Field } = await import('../Field');
const { SearchBar } = await import('../SearchBar');

// SearchBar returns `<Field {...props} />` — a React element whose `type` is
// the Field function component. Calling that element directly leaves Field
// unrendered, so we eagerly invoke Field with the propagated props to get
// the actual host-component tree.
function renderSearchBar(props: Parameters<typeof SearchBar>[0]) {
  const el = SearchBar(props) as { type: typeof Field; props: Parameters<typeof Field>[0] };
  return Field(el.props);
}

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
  for (const key of ['onChange', 'onChangeText', 'onPress', 'onSuffixPress'] as const) {
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

describe('Field', () => {
  test('renders with label + placeholder', () => {
    expect(
      normalize(Field({ label: 'Ad', placeholder: 'Adın', value: '' })),
    ).toMatchSnapshot();
  });

  test('renders with leading icon + suffix', () => {
    expect(
      normalize(
        Field({ icon: 'mail', suffix: 'değiştir', value: 'ad@example.edu.tr' }),
      ),
    ).toMatchSnapshot();
  });

  test('renders error state with hint', () => {
    expect(
      normalize(Field({ error: true, hint: 'Geçersiz e-posta', value: 'x' })),
    ).toMatchSnapshot();
  });

  test('big variant applies larger height + font', () => {
    expect(normalize(Field({ big: true, value: '', placeholder: 'Ad' }))).toMatchSnapshot();
  });

  test('type=password sets secureTextEntry', () => {
    const tree = normalize(Field({ type: 'password', value: 'secret' }));
    expect(tree).toMatchSnapshot();
    // Sanity-check the TextInput received the derived defaults.
    const input = find(tree, (n) => n.type === 'TextInput');
    expect(input).not.toBeNull();
    expect(input?.props.secureTextEntry).toBe(true);
    expect(input?.props.autoCorrect).toBe(false);
  });

  test('type=email applies email keyboard + autoCapitalize=none', () => {
    const tree = normalize(Field({ type: 'email', value: 'a@b.c' }));
    const input = find(tree, (n) => n.type === 'TextInput');
    expect(input?.props.keyboardType).toBe('email-address');
    expect(input?.props.autoCapitalize).toBe('none');
    expect(input?.props.autoCorrect).toBe(false);
  });

  test('type=tel applies phone-pad keyboard', () => {
    const tree = normalize(Field({ type: 'tel', value: '5551234' }));
    const input = find(tree, (n) => n.type === 'TextInput');
    expect(input?.props.keyboardType).toBe('phone-pad');
  });

  test('explicit keyboardType + secureTextEntry override the type defaults', () => {
    const tree = normalize(
      Field({
        type: 'email',
        keyboardType: 'numeric',
        secureTextEntry: true,
        value: '1',
      }),
    );
    const input = find(tree, (n) => n.type === 'TextInput');
    expect(input?.props.keyboardType).toBe('numeric');
    expect(input?.props.secureTextEntry).toBe(true);
  });

  test('onSuffixPress wraps suffix in a Pressable', () => {
    const tree = normalize(
      Field({ value: '', suffix: 'göster', onSuffixPress: () => {} }),
    );
    expect(tree).toMatchSnapshot();
    const pressable = find(tree, (n) => n.type === 'Pressable');
    expect(pressable).not.toBeNull();
    expect(pressable?.props.accessibilityRole).toBe('button');
  });
});

describe('SearchBar', () => {
  test('renders with search icon + default placeholder', () => {
    expect(normalize(renderSearchBar({ value: '' }))).toMatchSnapshot();
  });

  test('custom placeholder', () => {
    expect(
      normalize(renderSearchBar({ placeholder: 'Oyuncu ara…', value: '' })),
    ).toMatchSnapshot();
  });

  test('SearchBar delegates to Field with type=search', () => {
    const tree = normalize(renderSearchBar({ value: '' }));
    const input = find(tree, (n) => n.type === 'TextInput');
    expect(input?.props.placeholder).toBe('Ara…');
    // search type maps to default keyboard + secureTextEntry=false.
    expect(input?.props.secureTextEntry).toBe(false);
  });
});
