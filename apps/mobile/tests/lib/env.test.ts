import { describe, expect, test, beforeAll } from 'bun:test';

describe('env loader', () => {
  beforeAll(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'sb_anon_aaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  });

  test('parses valid env', async () => {
    const mod = await import('../../lib/env');
    expect(mod.env.EXPO_PUBLIC_SUPABASE_URL).toBe('http://127.0.0.1:54321');
  });
});
