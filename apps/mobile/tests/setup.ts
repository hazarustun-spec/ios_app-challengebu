import { mock } from 'bun:test';

// `__DEV__` is injected by Metro at bundle time, so it simply does not exist
// under bun:test. Anything reaching expo's own runtime (expo/src/async-require/
// setup.ts guards its dev-only branch on it) threw `ReferenceError: __DEV__ is
// not defined` before the first assertion — which is why several component
// suites reported "Unhandled error between tests" and zero passes.
(globalThis as { __DEV__?: boolean }).__DEV__ ??= true;

process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'sb_anon_aaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

mock.module('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

// expo-haptics imports `TurboModuleRegistry` from react-native. Test files
// mock `react-native` down to the two or three components they render, so that
// named export is gone and bun fails to LINK the module:
//
//   SyntaxError: Export named 'TurboModuleRegistry' not found in module
//   '.../react-native/index.js'
//
// The failure is in the linker, before any test body runs, so it took the
// whole file with it. Nothing under test asserts on haptics — it is a
// fire-and-forget side effect — so a no-op stub is the honest substitute.
mock.module('expo-haptics', () => ({
  impactAsync: async () => {},
  notificationAsync: async () => {},
  selectionAsync: async () => {},
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// react-native-reanimated pulls in react-native (Flow-typed) which bun:test can't parse.
// Mock the surface our components actually use so tokens/motion stay testable.
// `Easing.bezier` is asserted on by the motion-token tests; the rest only has
// to exist and be inert — a shared value that stores a number, a style hook
// that returns an object, and animation helpers that pass their target
// through.
mock.module('react-native-reanimated', () => {
  const passthrough = (v: unknown) => v;
  const View = (_props: Record<string, unknown>) => null;
  (View as { displayName?: string }).displayName = 'Animated.View';
  return {
    default: {
      View,
      Text: View,
      ScrollView: View,
      // Pass the wrapped component through instead of swallowing it: tests
      // look for the underlying element (a Polyline, say), and returning a
      // generic stand-in erased it from the tree.
      createAnimatedComponent: (C: unknown) => C,
    },
    Easing: {
      bezier: (x1: number, y1: number, x2: number, y2: number) => ({
        __type: 'bezier',
        points: [x1, y1, x2, y2] as const,
      }),
      linear: passthrough,
      out: passthrough,
      inOut: passthrough,
    },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useAnimatedProps: (fn: () => unknown) => fn(),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    withSpring: passthrough,
    withTiming: passthrough,
    withDelay: (_d: number, v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withRepeat: passthrough,
    runOnJS: (fn: unknown) => fn,
    cancelAnimation: () => {},
    interpolate: () => 0,
    FadeIn: {},
    FadeOut: {},
  };
});

// react-native-safe-area-context reaches into react-native's Flow-typed
// internals (Libraries/Utilities/codegenNativeComponent.js), which bun:test
// cannot parse — a test that pulls in any component using `useSafeAreaInsets`
// died with `Expected "from" but found "{"` before a single assertion ran,
// even though the test itself mocked `react-native`. Mocking `react-native`
// does not help: the crash is in a DIFFERENT module specifier
// (`react-native/Libraries/...`), reached through this package.
//
// Stubbed here in the preload rather than per file so it is registered before
// any module graph is built. Files that assert on inset values (Nav.test.tsx)
// still override it with their own mock.module call.
mock.module('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children?: unknown }) => children,
  SafeAreaView: ({ children }: { children?: unknown }) => children,
  initialWindowMetrics: null,
}));
