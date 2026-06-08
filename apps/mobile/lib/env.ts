import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function loadEnv(): Env {
  const parsed = schema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid env: ${JSON.stringify(parsed.error.format())}`);
  }
  return parsed.data;
}

// Lazy proxy: defers schema parse until first access so test files that set
// env vars in `beforeAll` (or callers that just import the module to inspect
// types) don't crash at import time.
export const env = new Proxy({} as Env, {
  get(_target, key: keyof Env) {
    if (!cached) cached = loadEnv();
    return cached[key];
  },
});
