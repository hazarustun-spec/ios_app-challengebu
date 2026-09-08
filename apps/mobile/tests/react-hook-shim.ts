// Minimal hook shim for the component tests that call a component as a plain
// function.
//
// This repo deliberately has no @testing-library/react-native (see the header
// of any file in components/ui/__tests__): a component is invoked directly and
// the returned element tree is normalized and snapshotted. That works for a
// pure component, but React refuses to run a hook outside a renderer —
//
//   TypeError: null is not an object (evaluating 'resolveDispatcher().useRef')
//
// — so TabBar (useRef + useEffect) and Sparkline (useEffect) could not be
// tested at all. Rather than pull in a renderer, substitute the two hooks the
// way the suite already substitutes View, Text and Svg.
//
// The substitution is honest for these tests specifically:
//   - `useRef` returns a fresh box per call. There is one synchronous render
//     and nothing reads a value written by a previous one.
//   - `useEffect` is a no-op. Effects here only start animations; the tree
//     under test is what the component returns, not what it animates to.
//
// Anything asserting on effect behaviour or on state across renders needs a
// real renderer and must not use this.
//
// Call `installHookShim()` BEFORE importing the component under test, so the
// module picks up the mocked `react`.

import { mock } from 'bun:test';
// Imported at module load, i.e. BEFORE installHookShim() replaces the
// specifier, so this binding is the real React. Resolving it inside the mock
// factory instead (`require('react')`) re-enters the mock and the resulting
// namespace loses its named exports — bun then fails to link every `import
// { useEffect } from 'react'` in the graph.
import * as ReactActual from 'react';

export function installHookShim() {
  mock.module('react', () => ({
    ...ReactActual,
    default: ReactActual,
    useRef: <T>(initial: T) => ({ current: initial }),
    useEffect: () => {},
    useLayoutEffect: () => {},
  }));
}
