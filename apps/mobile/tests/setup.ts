import { mock } from 'bun:test';

process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'sb_anon_aaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

mock.module('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

// react-native-reanimated pulls in react-native (Flow-typed) which bun:test can't parse.
// Mock only the surface our code uses so tokens/motion stay testable.
mock.module('react-native-reanimated', () => ({
  Easing: {
    bezier: (x1: number, y1: number, x2: number, y2: number) => ({
      __type: 'bezier',
      points: [x1, y1, x2, y2] as const,
    }),
  },
}));
