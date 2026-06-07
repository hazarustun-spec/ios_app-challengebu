# Tennis Challenger Mobile

Expo iOS-first app for the Boğaziçi Tennis Challenger ranking system.

## Dev setup

1. Make sure Xcode + iOS Simulator are installed (Mac App Store)
2. Start local Supabase: `cd ../../packages/supabase && supabase start`
3. Start Edge Functions: `supabase functions serve --no-verify-jwt`
4. Copy local keys to `.env.local`:
   ```bash
   supabase status --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321'); print(f'EXPO_PUBLIC_SUPABASE_ANON_KEY={d[\"ANON_KEY\"]}')"
   ```
5. Start Expo: `bun run ios` (opens iOS Simulator)

## Scripts

- `bun start` — Expo dev server
- `bun run ios` — iOS Simulator
- `bun run typecheck` — TypeScript
- `bun test` — bun unit tests

## Architecture

- Expo Router (file-based) under `app/`
- Zustand stores under `stores/`
- TanStack Query hooks under `hooks/`
- Supabase client in `lib/supabase.ts`
- Magic link OTP auth (no deep linking in dev)
