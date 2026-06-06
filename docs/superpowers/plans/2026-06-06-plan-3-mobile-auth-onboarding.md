# Plan 3: Mobile Skeleton + Auth + Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable iOS app (Expo) — magic link auth, 11-step onboarding flow, profile placeholder screen. After Plan 3, the user can install the app on their iPhone via Expo Go and complete a real signup → onboarding → profile-screen flow against the live Plan 2 backend.

**Architecture:** React Native + Expo SDK 53 + Expo Router (file-based routing). State: Zustand for client state (auth session, onboarding wizard), TanStack Query for server state (Supabase queries). Forms: react-hook-form + zod (schemas reused from `packages/shared`). Styling: NativeWind (Tailwind for RN) with placeholder design (real UI lands in Plan 8 when the user supplies Claude Design link). Auth: Supabase Auth magic link via OTP code (not deep-link — simpler and works in Expo Go). Tests: bun:test for stores/helpers/validation (pure logic); UI verified manually via Expo Go.

**Tech Stack:** Expo SDK 53, Expo Router 4, React Native 0.76, React 18, NativeWind 4, TanStack Query v5, Zustand v5, react-hook-form 7, @hookform/resolvers, zod 3 (from packages/shared), @supabase/supabase-js v2, expo-secure-store (token persistence), bun:test.

**Spec reference:** `docs/superpowers/specs/2026-06-06-tennis-challenger-design.md` sections 1 (tech stack), 3.1-3.2 (kayıt + onboarding 11 adım), 6.4 (profil ekran iskeleti).

**Plan dependencies:** Plan 1 (`packages/shared` for zod schemas + types), Plan 2 (Supabase Auth + profiles table, but the mobile app talks to local Supabase during dev).

**Plan 3 NOT in scope:** Real UI design (Plan 8 with Claude Design link), match flow screens (Plan 4), profile real content (Plan 5), admin panel (Plan 7), TestFlight build (Plan 8 with Apple Developer config), production env config.

---

## Dosya Yapısı

```
apps/mobile/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx              # Root: providers (Query, Auth) + redirect logic
│   ├── index.tsx                # Splash → redirect based on auth+profile state
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx          # Email input → request OTP
│   │   └── verify-otp.tsx       # 6-digit code → session
│   ├── (onboarding)/
│   │   ├── _layout.tsx          # Progress bar + step layout
│   │   ├── name.tsx             # Step 1+2: firstName, lastName
│   │   ├── phone.tsx            # Step 3: phone (optional)
│   │   ├── pronoun.tsx          # Step 4: pronoun + custom
│   │   ├── gender-category.tsx  # Step 5: erkek/kadin/open_only
│   │   ├── department.tsx       # Step 6: dept dropdown + show toggle
│   │   ├── class-year.tsx       # Step 7: class year + show toggle
│   │   ├── skill.tsx            # Step 8: baslangic/orta/ileri
│   │   ├── hand.tsx             # Step 9: sag/sol
│   │   ├── availability.tsx     # Step 10: 6 windows checkbox
│   │   └── avatar.tsx           # Step 11: avatar (optional) + finish
│   └── (app)/
│       ├── _layout.tsx          # Tab bar (Home, Profile)
│       ├── home.tsx             # Placeholder home
│       └── profile.tsx          # Placeholder profile
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── TextField.tsx
│   │   ├── RadioGroup.tsx
│   │   ├── CheckboxGroup.tsx
│   │   ├── Toggle.tsx
│   │   └── ScreenContainer.tsx
│   └── onboarding/
│       ├── StepLayout.tsx
│       └── ProgressBar.tsx
├── lib/
│   ├── env.ts                   # Validates env vars
│   ├── supabase.ts              # Supabase client (singleton)
│   └── functions.ts             # Edge Function caller
├── stores/
│   ├── auth-store.ts            # Zustand: session, user, profile
│   └── onboarding-store.ts      # Zustand: wizard state + persistence
├── hooks/
│   ├── use-departments.ts       # TanStack Query: departments list
│   └── use-submit-onboarding.ts # Mutation to create profile
├── app.json                     # Expo config
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── global.css                   # NativeWind imports
├── tsconfig.json
├── package.json
└── tests/
    ├── stores/
    │   ├── auth-store.test.ts
    │   └── onboarding-store.test.ts
    └── lib/
        └── env.test.ts
```

**Phase outline:**
- **Phase A — Expo app bootstrap (Tasks 1-5):** Initialize Expo, NativeWind, providers, env, Supabase client
- **Phase B — Auth flow (Tasks 6-9):** Auth store, sign-in screen, OTP verification, session persistence
- **Phase C — Navigation + routing (Tasks 10-11):** Root layout redirect logic, tab navigation
- **Phase D — Onboarding wizard (Tasks 12-22):** Store, layout, 11 step screens
- **Phase E — Profile + settings (Tasks 23-25):** Profile placeholder, settings (logout, delete account)
- **Phase F — Integration test + manual verification (Tasks 26-27):** End-to-end via Expo Go on the user's iPhone

---

## Phase A — Expo App Bootstrap

### Task 1: Initialize Expo app in monorepo

**Files:**
- Create: `apps/mobile/` (directory tree)
- Modify: `package.json` (root) — workspaces already include `apps/*`

- [ ] **Step 1: Create Expo app**

Run from monorepo root:

```bash
cd "/Users/hazarustun/Desktop/VIBE CODING/tennis-challenger/apps"
bunx create-expo-app@latest mobile --template blank-typescript
cd mobile
```

This creates `apps/mobile/` with Expo SDK + TypeScript template.

- [ ] **Step 2: Update package.json scripts and name**

Edit `apps/mobile/package.json`. Set `name` to `@tennis/mobile`, ensure `private: true`. Replace `scripts`:

```json
  "scripts": {
    "start": "expo start",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  }
```

- [ ] **Step 3: Add Expo Router and dependencies**

```bash
cd apps/mobile
bunx expo install expo-router react-native-screens react-native-safe-area-context expo-linking expo-constants expo-status-bar
bun add @tanstack/react-query zustand @supabase/supabase-js expo-secure-store
bun add react-hook-form @hookform/resolvers zod
bun add @tennis/shared@workspace:*
bun add -D @types/react
```

Note: `bunx expo install` uses Expo's compatible-version resolver. Don't replace with `bun add` for expo-* packages.

- [ ] **Step 4: Update app.json for Expo Router**

Edit `apps/mobile/app.json`:

```json
{
  "expo": {
    "name": "Tennis Challenger",
    "slug": "tennis-challenger",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "scheme": "tennischallenger",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "tr.edu.boun.tennischallenger"
    },
    "android": {
      "package": "tr.edu.boun.tennischallenger",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "web": { "favicon": "./assets/favicon.png" },
    "plugins": ["expo-router", "expo-secure-store"],
    "experiments": { "typedRoutes": true }
  }
}
```

- [ ] **Step 5: Replace default entry**

Edit `apps/mobile/package.json`, add:
```json
  "main": "expo-router/entry"
```

Delete `apps/mobile/App.tsx` if it exists.

- [ ] **Step 6: Create app/ directory with placeholder index**

```bash
mkdir -p apps/mobile/app
```

Create `apps/mobile/app/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

Create `apps/mobile/app/index.tsx`:

```typescript
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Tennis Challenger</Text>
    </View>
  );
}
```

- [ ] **Step 7: Smoke test**

```bash
cd apps/mobile
bunx expo start --no-dev --minify --offline 2>&1 | head -20
```

Expected: Metro bundler starts without error. Output mentions "Logs for your project will appear below."

Press `q` to quit (or send SIGINT).

- [ ] **Step 8: Commit**

```bash
cd "/Users/hazarustun/Desktop/VIBE CODING/tennis-challenger"
git add apps/mobile/ bun.lock
git commit -m "feat(mobile): initialize Expo app with Expo Router"
```

---

### Task 2: Add NativeWind (Tailwind for React Native)

**Files:**
- Create: `apps/mobile/tailwind.config.js`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/global.css`
- Create: `apps/mobile/nativewind-env.d.ts`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Install NativeWind**

```bash
cd apps/mobile
bun add nativewind@^4.1.0 react-native-reanimated@~3.16.0
bun add -D tailwindcss@^3.4.0
```

- [ ] **Step 2: tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a8a',
        secondary: '#10b981',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: babel.config.js**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 4: metro.config.js**

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: watch workspace + resolve from both node_modules
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 5: global.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: nativewind-env.d.ts**

```typescript
/// <reference types="nativewind/types" />
```

- [ ] **Step 7: Import global.css in root layout**

Edit `apps/mobile/app/_layout.tsx`:

```typescript
import '../global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

Edit `apps/mobile/app/index.tsx` to use Tailwind classes:

```typescript
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-primary">Tennis Challenger</Text>
    </View>
  );
}
```

- [ ] **Step 8: Smoke test**

```bash
bunx expo start --no-dev --minify --offline 2>&1 | head -20
```

Expected: no Tailwind errors.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/ bun.lock
git commit -m "feat(mobile): add NativeWind (Tailwind for RN) styling"
```

---

### Task 3: Environment variables + Supabase client

**Files:**
- Create: `apps/mobile/.env.example`
- Create: `apps/mobile/.env.local` (gitignored)
- Create: `apps/mobile/lib/env.ts`
- Create: `apps/mobile/lib/supabase.ts`
- Create: `apps/mobile/tests/lib/env.test.ts`
- Modify: `apps/mobile/.gitignore`

- [ ] **Step 1: .env.example**

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=replace-with-local-anon-key
```

- [ ] **Step 2: .gitignore (root) already covers .env.*local; verify**

Run: `cat .gitignore | grep -A 3 "Environment"`
Expected: `.env`, `.env.local`, `.env.*.local` listed.

- [ ] **Step 3: Get local Supabase keys**

```bash
cd packages/supabase
supabase start
supabase status --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print('EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321'); print(f'EXPO_PUBLIC_SUPABASE_ANON_KEY={d[\"ANON_KEY\"]}')"
```

Copy the output into `apps/mobile/.env.local`.

- [ ] **Step 4: env.ts**

```typescript
import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

function loadEnv() {
  const parsed = schema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Invalid env: ${JSON.stringify(parsed.error.format())}`);
  }
  return parsed.data;
}

export const env = loadEnv();
```

- [ ] **Step 5: supabase.ts**

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { env } from './env';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

Install the polyfill:
```bash
cd apps/mobile
bun add react-native-url-polyfill
```

- [ ] **Step 6: env.test.ts**

```typescript
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
```

- [ ] **Step 7: Run test**

```bash
cd apps/mobile
/Users/hazarustun/.bun/bin/bun test tests/lib/env.test.ts
```

Expected: 1 pass.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/lib/ apps/mobile/.env.example apps/mobile/tests/ bun.lock
git commit -m "feat(mobile): add env validation and Supabase client"
```

---

### Task 4: Providers (Query + Auth init)

**Files:**
- Create: `apps/mobile/lib/query-client.ts`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: query-client.ts**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
```

- [ ] **Step 2: _layout.tsx wraps with QueryClientProvider**

```typescript
import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '../lib/query-client';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: Smoke test**

```bash
bunx expo start --no-dev --minify --offline 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/ apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add TanStack Query provider"
```

---

### Task 5: Base UI components

**Files:**
- Create: `apps/mobile/components/ui/Button.tsx`
- Create: `apps/mobile/components/ui/TextField.tsx`
- Create: `apps/mobile/components/ui/ScreenContainer.tsx`
- Create: `apps/mobile/components/ui/RadioGroup.tsx`
- Create: `apps/mobile/components/ui/CheckboxGroup.tsx`
- Create: `apps/mobile/components/ui/Toggle.tsx`

These are placeholder components — functional but unstyled beyond basic Tailwind. Real design lands in Plan 8.

- [ ] **Step 1: Button.tsx**

```typescript
import { Pressable, Text, ActivityIndicator } from 'react-native';

interface Props {
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ onPress, children, disabled, loading, variant = 'primary' }: Props) {
  const bg = variant === 'primary' ? 'bg-primary' : variant === 'secondary' ? 'bg-secondary' : 'bg-transparent';
  const text = variant === 'ghost' ? 'text-primary' : 'text-white';
  const disabledClass = disabled || loading ? 'opacity-50' : '';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${bg} ${disabledClass} h-12 items-center justify-center rounded-lg px-4 active:opacity-80`}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className={`${text} text-base font-semibold`}>{children}</Text>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 2: TextField.tsx**

```typescript
import { TextInput, Text, View, type TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...inputProps }: Props) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        className={`h-12 rounded-lg border bg-white px-3 text-base ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholderTextColor="#9ca3af"
        {...inputProps}
      />
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
```

- [ ] **Step 3: ScreenContainer.tsx**

```typescript
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
  scrollable?: boolean;
}

export function ScreenContainer({ children, scrollable = false }: Props) {
  const Inner = (
    <View className="flex-1 bg-white px-6 py-4">{children}</View>
  );
  if (scrollable) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {Inner}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return <SafeAreaView className="flex-1 bg-white">{Inner}</SafeAreaView>;
}
```

- [ ] **Step 4: RadioGroup.tsx**

```typescript
import { Pressable, Text, View } from 'react-native';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: Option<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  error?: string;
}

export function RadioGroup<T extends string>({ label, options, value, onChange, error }: Props<T>) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      <View className="gap-2">
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-row items-center rounded-lg border p-3 ${
              value === opt.value ? 'border-primary bg-blue-50' : 'border-gray-300 bg-white'
            }`}
          >
            <View
              className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                value === opt.value ? 'border-primary' : 'border-gray-400'
              }`}
            >
              {value === opt.value && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </View>
            <Text className="text-base text-gray-800">{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
```

- [ ] **Step 5: CheckboxGroup.tsx**

```typescript
import { Pressable, Text, View } from 'react-native';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: Option<T>[];
  value: T[];
  onChange: (v: T[]) => void;
  error?: string;
}

export function CheckboxGroup<T extends string>({ label, options, value, onChange, error }: Props<T>) {
  const toggle = (v: T) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      <View className="gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => toggle(opt.value)}
              className={`flex-row items-center rounded-lg border p-3 ${
                selected ? 'border-primary bg-blue-50' : 'border-gray-300 bg-white'
              }`}
            >
              <View
                className={`mr-3 h-5 w-5 items-center justify-center rounded border-2 ${
                  selected ? 'border-primary bg-primary' : 'border-gray-400'
                }`}
              >
                {selected && <Text className="text-xs font-bold text-white">✓</Text>}
              </View>
              <Text className="text-base text-gray-800">{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
```

- [ ] **Step 6: Toggle.tsx**

```typescript
import { Switch, Text, View } from 'react-native';

interface Props {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export function Toggle({ label, value, onValueChange }: Props) {
  return (
    <View className="mb-3 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-3">
      <Text className="flex-1 text-base text-gray-800">{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/components/
git commit -m "feat(mobile): add base UI components (Button, TextField, RadioGroup, CheckboxGroup, Toggle, ScreenContainer)"
```

---

## Phase B — Auth Flow

### Task 6: Auth store (Zustand)

**Files:**
- Create: `apps/mobile/stores/auth-store.ts`
- Create: `apps/mobile/tests/stores/auth-store.test.ts`

- [ ] **Step 1: auth-store.ts**

```typescript
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface ProfileSummary {
  userId: string;
  firstName: string;
  lastName: string;
  role: 'player' | 'admin';
  onboardingComplete: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ProfileSummary | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: ProfileSummary | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  signOut: () => set({ session: null, user: null, profile: null }),
}));
```

- [ ] **Step 2: auth-store.test.ts**

```typescript
import { describe, expect, test, beforeEach } from 'bun:test';
import { useAuthStore } from '../../stores/auth-store';

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, user: null, profile: null, loading: true });
  });

  test('initial state', () => {
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().loading).toBe(true);
  });

  test('setSession updates session and user', () => {
    const fakeSession = { access_token: 'x', user: { id: 'u1', email: 'a@b.c' } } as any;
    useAuthStore.getState().setSession(fakeSession);
    expect(useAuthStore.getState().session).toBe(fakeSession);
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });

  test('signOut clears state', () => {
    useAuthStore.setState({ session: { access_token: 'x' } as any, user: { id: 'u1' } as any });
    useAuthStore.getState().signOut();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
```

- [ ] **Step 3: Run test**

```bash
cd apps/mobile
/Users/hazarustun/.bun/bin/bun test tests/stores/auth-store.test.ts
```

Expected: 3 pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/stores/ apps/mobile/tests/stores/
git commit -m "feat(mobile): add auth store with session and profile state"
```

---

### Task 7: Sign-in screen (email → OTP request)

**Files:**
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/sign-in.tsx`

- [ ] **Step 1: (auth)/_layout.tsx**

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: sign-in.tsx**

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { supabase } from '../../lib/supabase';

const schema = z.object({
  email: z
    .string()
    .email('Geçerli bir e-posta gir')
    .refine(
      (e) => e.endsWith('@boun.edu.tr') || e.endsWith('@std.bogazici.edu.tr'),
      'Sadece BÜ e-postası kabul edilir (@boun.edu.tr veya @std.bogazici.edu.tr)',
    ),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Hata', error.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify-otp', params: { email: data.email } });
  };

  return (
    <ScreenContainer scrollable>
      <View className="flex-1 justify-center">
        <Text className="mb-2 text-3xl font-bold text-gray-900">Hoş geldin</Text>
        <Text className="mb-8 text-base text-gray-600">
          BÜ e-postanı gir, sana 6 haneli giriş kodu yollayalım.
        </Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="E-posta"
              placeholder="ad.soyad@boun.edu.tr"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
              error={errors.email?.message}
            />
          )}
        />

        <Button onPress={handleSubmit(onSubmit)} loading={loading}>
          Kod gönder
        </Button>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(auth\)/
git commit -m "feat(mobile): add sign-in screen with BÜ email validation"
```

---

### Task 8: OTP verification screen

**Files:**
- Create: `apps/mobile/app/(auth)/verify-otp.tsx`

- [ ] **Step 1: verify-otp.tsx**

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { TextField } from '../../components/ui/TextField';
import { useAuthStore } from '../../stores/auth-store';
import { supabase } from '../../lib/supabase';

const schema = z.object({
  code: z.string().length(6, '6 haneli kodu gir'),
});

type FormValues = z.infer<typeof schema>;

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    if (!email) return;
    setLoading(true);
    const { data: result, error } = await supabase.auth.verifyOtp({
      email,
      token: data.code,
      type: 'email',
    });
    setLoading(false);
    if (error || !result.session) {
      Alert.alert('Hata', error?.message ?? 'Kod doğrulanamadı');
      return;
    }
    setSession(result.session);
    router.replace('/');
  };

  return (
    <ScreenContainer scrollable>
      <View className="flex-1 justify-center">
        <Text className="mb-2 text-3xl font-bold text-gray-900">Kodu gir</Text>
        <Text className="mb-8 text-base text-gray-600">
          {email}'a 6 haneli kod yolladık.
        </Text>

        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Kod"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
              error={errors.code?.message}
            />
          )}
        />

        <Button onPress={handleSubmit(onSubmit)} loading={loading}>
          Giriş yap
        </Button>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(auth\)/verify-otp.tsx
git commit -m "feat(mobile): add OTP verification screen"
```

---

### Task 9: Session bootstrap + auth listener

**Files:**
- Create: `apps/mobile/lib/auth-bootstrap.ts`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: auth-bootstrap.ts**

```typescript
import { supabase } from './supabase';
import { useAuthStore } from '../stores/auth-store';

export async function bootstrapAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  useAuthStore.getState().setSession(session);

  if (session?.user) {
    await loadProfile(session.user.id);
  }

  useAuthStore.getState().setLoading(false);

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    useAuthStore.getState().setSession(newSession);
    if (newSession?.user) await loadProfile(newSession.user.id);
    else useAuthStore.getState().setProfile(null);
  });
}

async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, role, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    useAuthStore.getState().setProfile(null);
    return;
  }

  useAuthStore.getState().setProfile({
    userId: data.user_id,
    firstName: data.first_name,
    lastName: data.last_name,
    role: data.role,
    onboardingComplete: data.status !== null && data.first_name?.length > 0,
  });
}
```

- [ ] **Step 2: Call bootstrap in _layout.tsx**

Update `apps/mobile/app/_layout.tsx`:

```typescript
import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrapAuth } from '../lib/auth-bootstrap';
import { queryClient } from '../lib/query-client';

export default function RootLayout() {
  useEffect(() => {
    bootstrapAuth();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/auth-bootstrap.ts apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): bootstrap session on app start and listen for auth changes"
```

---

## Phase C — Navigation + Routing

### Task 10: Index redirect based on auth + profile state

**Files:**
- Modify: `apps/mobile/app/index.tsx`

- [ ] **Step 1: index.tsx — routing logic**

```typescript
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../stores/auth-store';

export default function Index() {
  const { session, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile?.onboardingComplete) {
    return <Redirect href="/(onboarding)/name" />;
  }

  return <Redirect href="/(app)/home" />;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/index.tsx
git commit -m "feat(mobile): redirect based on auth and onboarding state"
```

---

### Task 11: Main app layout (tabs)

**Files:**
- Create: `apps/mobile/app/(app)/_layout.tsx`
- Create: `apps/mobile/app/(app)/home.tsx`
- Create: `apps/mobile/app/(app)/profile.tsx`

- [ ] **Step 1: Install expo-router's tabs**

(Already available via expo-router.)

- [ ] **Step 2: (app)/_layout.tsx**

```typescript
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1e3a8a' }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: (app)/home.tsx (placeholder)**

```typescript
import { Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useAuthStore } from '../../stores/auth-store';

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold text-gray-900">
          Hoş geldin, {profile?.firstName ?? 'oyuncu'}!
        </Text>
        <Text className="mt-4 text-center text-gray-600">
          Maç akışı Plan 4'te gelecek.
        </Text>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 4: (app)/profile.tsx (placeholder — full version in Task 23)**

```typescript
import { Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';

export default function ProfileScreen() {
  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl text-gray-700">Profil ekranı — Task 23'te</Text>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(app\)/
git commit -m "feat(mobile): add main app tab layout with home and profile placeholders"
```

---

## Phase D — Onboarding Wizard

### Task 12: Onboarding store + step machinery

**Files:**
- Create: `apps/mobile/stores/onboarding-store.ts`
- Create: `apps/mobile/tests/stores/onboarding-store.test.ts`

- [ ] **Step 1: onboarding-store.ts**

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export type PronounValue = 'he/him' | 'she/her' | 'they/them' | 'other';
export type GenderCategoryValue = 'erkek' | 'kadin' | 'open_only';
export type ClassYearValue = 'hazirlik' | '1' | '2' | '3' | '4' | 'yl' | 'doktora';
export type SkillValue = 'baslangic' | 'orta' | 'ileri';
export type HandValue = 'sag' | 'sol';
export type AvailabilityValue =
  | 'weekday_morning' | 'weekday_noon' | 'weekday_evening'
  | 'weekend_morning' | 'weekend_noon' | 'weekend_evening';

export interface OnboardingDraft {
  firstName: string;
  lastName: string;
  phone?: string;
  pronoun?: PronounValue;
  pronounCustom?: string;
  genderCategory?: GenderCategoryValue;
  departmentId?: string;
  classYear?: ClassYearValue;
  showDepartment: boolean;
  showClassYear: boolean;
  skillSelfAssessment?: SkillValue;
  dominantHand?: HandValue;
  availabilityWindows: AvailabilityValue[];
  avatarUri?: string;
}

const initialDraft: OnboardingDraft = {
  firstName: '',
  lastName: '',
  showDepartment: true,
  showClassYear: true,
  availabilityWindows: [],
};

interface State {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
}

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const useOnboardingStore = create<State>()(
  persist(
    (set) => ({
      draft: initialDraft,
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      reset: () => set({ draft: initialDraft }),
    }),
    {
      name: 'onboarding-draft',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
```

- [ ] **Step 2: onboarding-store.test.ts**

```typescript
import { describe, expect, test, beforeEach } from 'bun:test';
import { useOnboardingStore } from '../../stores/onboarding-store';

describe('onboarding-store', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  test('initial draft has defaults', () => {
    const d = useOnboardingStore.getState().draft;
    expect(d.firstName).toBe('');
    expect(d.showDepartment).toBe(true);
    expect(d.availabilityWindows).toEqual([]);
  });

  test('update patches draft', () => {
    useOnboardingStore.getState().update({ firstName: 'Ali', genderCategory: 'erkek' });
    const d = useOnboardingStore.getState().draft;
    expect(d.firstName).toBe('Ali');
    expect(d.genderCategory).toBe('erkek');
    // Existing fields preserved
    expect(d.showDepartment).toBe(true);
  });

  test('reset returns to initial', () => {
    useOnboardingStore.getState().update({ firstName: 'X' });
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().draft.firstName).toBe('');
  });
});
```

- [ ] **Step 3: Mock SecureStore for bun test**

Add `apps/mobile/tests/setup.ts`:

```typescript
import { mock } from 'bun:test';

mock.module('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
```

Add to `apps/mobile/bunfig.toml`:

```toml
[test]
preload = ["./tests/setup.ts"]
```

- [ ] **Step 4: Run tests**

```bash
cd apps/mobile
/Users/hazarustun/.bun/bin/bun test tests/stores/onboarding-store.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/stores/ apps/mobile/tests/ apps/mobile/bunfig.toml
git commit -m "feat(mobile): add onboarding wizard store with SecureStore persistence"
```

---

### Task 13: Onboarding layout + progress bar

**Files:**
- Create: `apps/mobile/app/(onboarding)/_layout.tsx`
- Create: `apps/mobile/components/onboarding/StepLayout.tsx`
- Create: `apps/mobile/components/onboarding/ProgressBar.tsx`

- [ ] **Step 1: ProgressBar.tsx**

```typescript
import { View } from 'react-native';

interface Props {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  return (
    <View className="h-1 w-full bg-gray-200">
      <View className="h-full bg-primary" style={{ width: `${pct}%` }} />
    </View>
  );
}
```

- [ ] **Step 2: StepLayout.tsx**

```typescript
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { ScreenContainer } from '../ui/ScreenContainer';
import { ProgressBar } from './ProgressBar';

interface Props {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  nextLabel?: string;
}

export function StepLayout({
  step, total, title, subtitle, children, onNext, nextDisabled, nextLoading, nextLabel = 'Devam',
}: Props) {
  return (
    <ScreenContainer scrollable>
      <ProgressBar current={step} total={total} />
      <View className="mt-4 flex-1">
        <Text className="text-2xl font-bold text-gray-900">{title}</Text>
        {subtitle && <Text className="mt-1 text-base text-gray-600">{subtitle}</Text>}
        <View className="mt-6 flex-1">{children}</View>
        <View className="mt-6">
          <Button onPress={onNext} disabled={nextDisabled} loading={nextLoading}>
            {nextLabel}
          </Button>
        </View>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: (onboarding)/_layout.tsx**

```typescript
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/ apps/mobile/components/onboarding/
git commit -m "feat(mobile): add onboarding layout and progress bar"
```

---

### Task 14: Step 1 — Name (firstName + lastName)

**Files:**
- Create: `apps/mobile/app/(onboarding)/name.tsx`

- [ ] **Step 1: name.tsx**

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { TextField } from '../../components/ui/TextField';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;

export default function NameScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [firstName, setFirstName] = useState(draft.firstName);
  const [lastName, setLastName] = useState(draft.lastName);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});

  const handleNext = () => {
    const errs: { firstName?: string; lastName?: string } = {};
    if (!firstName.trim()) errs.firstName = 'Adın gerekli';
    if (!lastName.trim()) errs.lastName = 'Soyadın gerekli';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    update({ firstName: firstName.trim(), lastName: lastName.trim() });
    router.push('/(onboarding)/phone');
  };

  return (
    <StepLayout step={1} total={TOTAL_STEPS} title="Adın ne?" onNext={handleNext}>
      <TextField
        label="Ad"
        placeholder="Ali"
        value={firstName}
        onChangeText={setFirstName}
        error={errors.firstName}
      />
      <TextField
        label="Soyad"
        placeholder="Yılmaz"
        value={lastName}
        onChangeText={setLastName}
        error={errors.lastName}
      />
    </StepLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/name.tsx
git commit -m "feat(mobile): onboarding step 1 — name"
```

---

### Task 15: Step 2 — Phone (optional)

**Files:**
- Create: `apps/mobile/app/(onboarding)/phone.tsx`

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { TextField } from '../../components/ui/TextField';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const E164 = /^\+\d{10,15}$/;

export default function PhoneScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [phone, setPhone] = useState(draft.phone ?? '');
  const [error, setError] = useState<string>();

  const handleNext = () => {
    const trimmed = phone.trim();
    if (trimmed && !E164.test(trimmed)) {
      setError('E.164 formatında girmelisin (+905551234567)');
      return;
    }
    update({ phone: trimmed || undefined });
    router.push('/(onboarding)/pronoun');
  };

  return (
    <StepLayout step={2} total={TOTAL_STEPS} title="Telefon" subtitle="Opsiyonel" onNext={handleNext}>
      <View className="mb-3 rounded-lg bg-blue-50 p-3">
        <Text className="text-sm text-blue-900">
          Sadece maç koordinasyonu için, kabul ettiğin oyunculara gösterilir.
        </Text>
      </View>
      <TextField
        label="Telefon"
        placeholder="+905551234567"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        error={error}
      />
    </StepLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/phone.tsx
git commit -m "feat(mobile): onboarding step 2 — phone (optional)"
```

---

### Task 16: Step 3 — Pronoun

**Files:**
- Create: `apps/mobile/app/(onboarding)/pronoun.tsx`

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { TextField } from '../../components/ui/TextField';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type PronounValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: PronounValue; label: string }[] = [
  { value: 'he/him', label: 'he/him' },
  { value: 'she/her', label: 'she/her' },
  { value: 'they/them', label: 'they/them' },
  { value: 'other', label: 'Diğer' },
];

export default function PronounScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [pronoun, setPronoun] = useState<PronounValue | undefined>(draft.pronoun);
  const [custom, setCustom] = useState(draft.pronounCustom ?? '');
  const [errors, setErrors] = useState<{ pronoun?: string; custom?: string }>({});

  const handleNext = () => {
    const errs: typeof errors = {};
    if (!pronoun) errs.pronoun = 'Bir seçim yap';
    if (pronoun === 'other' && !custom.trim()) errs.custom = 'Diğer için belirt';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    update({ pronoun, pronounCustom: pronoun === 'other' ? custom.trim() : undefined });
    router.push('/(onboarding)/gender-category');
  };

  return (
    <StepLayout step={3} total={TOTAL_STEPS} title="Pronoun" subtitle="Profilinde görünür" onNext={handleNext}>
      <RadioGroup
        label="Pronoun"
        options={OPTIONS}
        value={pronoun}
        onChange={setPronoun}
        error={errors.pronoun}
      />
      {pronoun === 'other' && (
        <TextField
          label="Diğer (max 30 karakter)"
          placeholder="ze/zir"
          maxLength={30}
          value={custom}
          onChangeText={setCustom}
          error={errors.custom}
        />
      )}
    </StepLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/pronoun.tsx
git commit -m "feat(mobile): onboarding step 3 — pronoun"
```

---

### Task 17: Step 4 — Gender category

**Files:**
- Create: `apps/mobile/app/(onboarding)/gender-category.tsx`

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type GenderCategoryValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: GenderCategoryValue; label: string }[] = [
  { value: 'erkek', label: 'Erkek' },
  { value: 'kadin', label: 'Kadın' },
  { value: 'open_only', label: 'Sadece Open' },
];

export default function GenderCategoryScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [value, setValue] = useState<GenderCategoryValue | undefined>(draft.genderCategory);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (!value) {
      setError('Bir seçim yap');
      return;
    }
    update({ genderCategory: value });
    router.push('/(onboarding)/department');
  };

  return (
    <StepLayout
      step={4}
      total={TOTAL_STEPS}
      title="Yarışma kategorisi"
      onNext={handleNext}
    >
      <View className="mb-3 rounded-lg bg-blue-50 p-3">
        <Text className="text-sm text-blue-900">
          Bu seçim erkek/kadın kategorilerine katılımını belirler. Open kategorisine zaten dahilsin. Sezon başında değiştirebilirsin.
        </Text>
      </View>
      <RadioGroup label="Kategori" options={OPTIONS} value={value} onChange={setValue} error={error} />
    </StepLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/gender-category.tsx
git commit -m "feat(mobile): onboarding step 4 — gender category"
```

---

### Task 18: Step 5 — Department (with show toggle)

**Files:**
- Create: `apps/mobile/hooks/use-departments.ts`
- Create: `apps/mobile/app/(onboarding)/department.tsx`

- [ ] **Step 1: use-departments.ts**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Department {
  id: string;
  name: string;
  faculty: string | null;
}

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, faculty')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60, // 1h
  });
}
```

- [ ] **Step 2: department.tsx**

For department picker, use a simple modal-style scroll list (no external dropdown lib yet). For now, render as a vertical scroll of radio items:

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { Toggle } from '../../components/ui/Toggle';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useDepartments } from '../../hooks/use-departments';
import { useOnboardingStore } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;

export default function DepartmentScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const { data: departments, isLoading } = useDepartments();

  const [departmentId, setDepartmentId] = useState<string | undefined>(draft.departmentId);
  const [showDepartment, setShowDepartment] = useState(draft.showDepartment);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (!departmentId) {
      setError('Bölümünü seç');
      return;
    }
    update({ departmentId, showDepartment });
    router.push('/(onboarding)/class-year');
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  const options = (departments ?? []).map((d) => ({ value: d.id, label: d.name }));

  return (
    <StepLayout step={5} total={TOTAL_STEPS} title="Bölüm" onNext={handleNext}>
      <View className="mb-4 max-h-72">
        <ScrollView>
          <RadioGroup
            label="Bölümünü seç"
            options={options}
            value={departmentId}
            onChange={setDepartmentId}
            error={error}
          />
        </ScrollView>
      </View>
      <Toggle label="Bölümü profilimde göster" value={showDepartment} onValueChange={setShowDepartment} />
    </StepLayout>
  );
}
```

NOTE: For 37 departments, a scrolling RadioGroup is acceptable but not great UX. A proper dropdown/searchable picker lands in Plan 8 design polish.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/ apps/mobile/app/\(onboarding\)/department.tsx
git commit -m "feat(mobile): onboarding step 5 — department picker with show toggle"
```

---

### Task 19: Step 6 — Class year (with show toggle)

**Files:**
- Create: `apps/mobile/app/(onboarding)/class-year.tsx`

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { Toggle } from '../../components/ui/Toggle';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type ClassYearValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: ClassYearValue; label: string }[] = [
  { value: 'hazirlik', label: 'Hazırlık' },
  { value: '1', label: '1. sınıf' },
  { value: '2', label: '2. sınıf' },
  { value: '3', label: '3. sınıf' },
  { value: '4', label: '4. sınıf' },
  { value: 'yl', label: 'Yüksek Lisans' },
  { value: 'doktora', label: 'Doktora' },
];

export default function ClassYearScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [value, setValue] = useState<ClassYearValue | undefined>(draft.classYear);
  const [show, setShow] = useState(draft.showClassYear);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (!value) {
      setError('Bir seçim yap');
      return;
    }
    update({ classYear: value, showClassYear: show });
    router.push('/(onboarding)/skill');
  };

  return (
    <StepLayout step={6} total={TOTAL_STEPS} title="Sınıf" onNext={handleNext}>
      <RadioGroup label="Sınıfını seç" options={OPTIONS} value={value} onChange={setValue} error={error} />
      <Toggle label="Sınıfı profilimde göster" value={show} onValueChange={setShow} />
    </StepLayout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/class-year.tsx
git commit -m "feat(mobile): onboarding step 6 — class year with show toggle"
```

---

### Task 20: Step 7-9 — Skill, Hand, Availability

**Files:**
- Create: `apps/mobile/app/(onboarding)/skill.tsx`
- Create: `apps/mobile/app/(onboarding)/hand.tsx`
- Create: `apps/mobile/app/(onboarding)/availability.tsx`

Three short screens following the same pattern. Implement all three in this task.

- [ ] **Step 1: skill.tsx**

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type SkillValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: SkillValue; label: string }[] = [
  { value: 'baslangic', label: 'Başlangıç' },
  { value: 'orta', label: 'Orta' },
  { value: 'ileri', label: 'İleri' },
];

export default function SkillScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [value, setValue] = useState<SkillValue | undefined>(draft.skillSelfAssessment);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (!value) {
      setError('Bir seçim yap');
      return;
    }
    update({ skillSelfAssessment: value });
    router.push('/(onboarding)/hand');
  };

  return (
    <StepLayout step={7} total={TOTAL_STEPS} title="Tenis seviyen" subtitle="ELO'ya etkisi yok, sadece eşleşme önerisi için" onNext={handleNext}>
      <RadioGroup label="Seviye" options={OPTIONS} value={value} onChange={setValue} error={error} />
    </StepLayout>
  );
}
```

- [ ] **Step 2: hand.tsx**

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type HandValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: HandValue; label: string }[] = [
  { value: 'sag', label: 'Sağ el' },
  { value: 'sol', label: 'Sol el' },
];

export default function HandScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [value, setValue] = useState<HandValue | undefined>(draft.dominantHand);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (!value) {
      setError('Bir seçim yap');
      return;
    }
    update({ dominantHand: value });
    router.push('/(onboarding)/availability');
  };

  return (
    <StepLayout step={8} total={TOTAL_STEPS} title="Dominant el" onNext={handleNext}>
      <RadioGroup label="El" options={OPTIONS} value={value} onChange={setValue} error={error} />
    </StepLayout>
  );
}
```

- [ ] **Step 3: availability.tsx**

```typescript
import { router } from 'expo-router';
import { useState } from 'react';
import { CheckboxGroup } from '../../components/ui/CheckboxGroup';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { useOnboardingStore, type AvailabilityValue } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;
const OPTIONS: { value: AvailabilityValue; label: string }[] = [
  { value: 'weekday_morning', label: 'Hafta içi sabah' },
  { value: 'weekday_noon', label: 'Hafta içi öğle' },
  { value: 'weekday_evening', label: 'Hafta içi akşam' },
  { value: 'weekend_morning', label: 'Hafta sonu sabah' },
  { value: 'weekend_noon', label: 'Hafta sonu öğle' },
  { value: 'weekend_evening', label: 'Hafta sonu akşam' },
];

export default function AvailabilityScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const [value, setValue] = useState<AvailabilityValue[]>(draft.availabilityWindows);
  const [error, setError] = useState<string>();

  const handleNext = () => {
    if (value.length === 0) {
      setError('En az bir zaman dilimi seç');
      return;
    }
    update({ availabilityWindows: value });
    router.push('/(onboarding)/avatar');
  };

  return (
    <StepLayout step={9} total={TOTAL_STEPS} title="Hangi zamanlarda oynayabilirsin?" onNext={handleNext}>
      <CheckboxGroup label="Müsait zamanlar" options={OPTIONS} value={value} onChange={setValue} error={error} />
    </StepLayout>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(onboarding\)/skill.tsx apps/mobile/app/\(onboarding\)/hand.tsx apps/mobile/app/\(onboarding\)/availability.tsx
git commit -m "feat(mobile): onboarding steps 7-9 — skill, hand, availability"
```

---

### Task 21: Step 10 — Avatar (optional) + submit hook

**Files:**
- Create: `apps/mobile/hooks/use-submit-onboarding.ts`
- Create: `apps/mobile/app/(onboarding)/avatar.tsx`

- [ ] **Step 1: Install expo-image-picker**

```bash
cd apps/mobile
bunx expo install expo-image-picker
```

- [ ] **Step 2: use-submit-onboarding.ts**

```typescript
import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';
import type { OnboardingDraft } from '../stores/onboarding-store';

interface Args {
  draft: OnboardingDraft;
}

export function useSubmitOnboarding() {
  return useMutation({
    mutationFn: async ({ draft }: Args) => {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not signed in');

      // 1. Upload avatar if present
      let avatarUrl: string | null = null;
      if (draft.avatarUri) {
        const ext = draft.avatarUri.split('.').pop() ?? 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const fileData = await FileSystem.readAsStringAsync(draft.avatarUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const buffer = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, buffer, {
          contentType: `image/${ext}`,
        });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      // 2. Insert profile
      const { error: profileErr } = await supabase.from('profiles').insert({
        user_id: user.id,
        email: user.email,
        first_name: draft.firstName,
        last_name: draft.lastName,
        phone: draft.phone ?? null,
        pronoun: draft.pronoun!,
        pronoun_custom: draft.pronounCustom ?? null,
        gender_category: draft.genderCategory!,
        department_id: draft.departmentId!,
        class_year: draft.classYear!,
        show_department: draft.showDepartment,
        show_class_year: draft.showClassYear,
        skill_self_assessment: draft.skillSelfAssessment!,
        dominant_hand: draft.dominantHand!,
        availability_windows: draft.availabilityWindows,
        avatar_url: avatarUrl,
      });
      if (profileErr) throw profileErr;

      // 3. Seed ELO ratings (1200) for relevant categories
      const categories = pickCategories(draft.genderCategory!);
      const rows = categories.map((c) => ({
        profile_id: user.id,
        category: c,
        rating: 1200,
        matches_played: 0,
      }));
      await supabase.from('elo_ratings').insert(rows);

      return { profileCreated: true };
    },
  });
}

function pickCategories(genderCategory: 'erkek' | 'kadin' | 'open_only'): string[] {
  if (genderCategory === 'erkek') {
    return ['erkek_tek', 'open_tek', 'erkek_cift', 'karma_cift', 'open_cift'];
  }
  if (genderCategory === 'kadin') {
    return ['kadin_tek', 'open_tek', 'kadin_cift', 'karma_cift', 'open_cift'];
  }
  return ['open_tek', 'open_cift'];
}
```

NOTE: This assumes a `avatars` storage bucket exists. Add bucket creation note: in the Plan 2 cleanup or Plan 8 polish, add a migration creating the `avatars` storage bucket. For now, avatar upload may silently fail if the bucket doesn't exist — that's OK (`avatarUrl` stays null).

- [ ] **Step 3: avatar.tsx**

```typescript
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { StepLayout } from '../../components/onboarding/StepLayout';
import { Button } from '../../components/ui/Button';
import { useSubmitOnboarding } from '../../hooks/use-submit-onboarding';
import { useAuthStore } from '../../stores/auth-store';
import { useOnboardingStore } from '../../stores/onboarding-store';

const TOTAL_STEPS = 11;

export default function AvatarScreen() {
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const reset = useOnboardingStore((s) => s.reset);
  const setProfile = useAuthStore((s) => s.setProfile);
  const user = useAuthStore((s) => s.user);
  const [uri, setUri] = useState(draft.avatarUri);

  const submit = useSubmitOnboarding();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
      update({ avatarUri: result.assets[0].uri });
    }
  };

  const handleFinish = () => {
    submit.mutate(
      { draft: { ...draft, avatarUri: uri } },
      {
        onSuccess: () => {
          if (user) {
            setProfile({
              userId: user.id,
              firstName: draft.firstName,
              lastName: draft.lastName,
              role: 'player',
              onboardingComplete: true,
            });
          }
          reset();
          router.replace('/(app)/home');
        },
        onError: (err) => {
          Alert.alert('Hata', err instanceof Error ? err.message : 'Profil oluşturulamadı');
        },
      },
    );
  };

  return (
    <StepLayout
      step={11}
      total={TOTAL_STEPS}
      title="Profil fotoğrafı"
      subtitle="Opsiyonel — kortta birbirimizi tanıyalım"
      onNext={handleFinish}
      nextLoading={submit.isPending}
      nextLabel="Bitir"
    >
      <View className="items-center">
        {uri ? (
          <Image source={{ uri }} className="h-48 w-48 rounded-full bg-gray-200" />
        ) : (
          <View className="h-48 w-48 items-center justify-center rounded-full bg-gray-200">
            <Text className="text-5xl">📷</Text>
          </View>
        )}
        <View className="mt-6 w-full gap-3">
          <Button onPress={pickImage} variant="secondary">
            Fotoğraf seç
          </Button>
          {uri && (
            <Button onPress={() => { setUri(undefined); update({ avatarUri: undefined }); }} variant="ghost">
              Fotoğrafı kaldır
            </Button>
          )}
        </View>
      </View>
    </StepLayout>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/hooks/use-submit-onboarding.ts apps/mobile/app/\(onboarding\)/avatar.tsx bun.lock
git commit -m "feat(mobile): onboarding step 11 — avatar + submit + ELO seed"
```

---

### Task 22: Onboarding integration smoke check (manual)

This task is verification-only. No new files.

- [ ] **Step 1: Start backend**

```bash
cd packages/supabase
supabase start
supabase functions serve --no-verify-jwt &
```

- [ ] **Step 2: Update env.local with current keys**

(Same as Task 3 step 3.)

- [ ] **Step 3: Start mobile app**

```bash
cd apps/mobile
bunx expo start
```

Open in iOS Simulator (`i`) or Expo Go on iPhone (scan QR).

- [ ] **Step 4: Manual verification checklist**

Walk through:
1. ✅ App opens to sign-in screen
2. ✅ Email validation rejects non-BÜ emails
3. ✅ Submitting BÜ email triggers OTP (check Inbucket: http://127.0.0.1:54324)
4. ✅ Entering correct OTP signs in
5. ✅ Onboarding starts at name screen
6. ✅ All 11 steps work, going back is disabled (intentional)
7. ✅ Department list loads from Supabase
8. ✅ Avatar picker opens (deny if no library access — skip avatar)
9. ✅ Final submit creates profile row in DB
10. ✅ Lands on home with "Hoş geldin, [firstName]"
11. ✅ Restarting app keeps user signed in (session persistence)
12. ✅ Restarting app skips onboarding (profile complete)

If any step fails, note the failure as a follow-up — don't fix here; we fix in Task 23+ or Plan 4.

- [ ] **Step 5: Commit (no code changes — empty commit allowed)**

```bash
cd "/Users/hazarustun/Desktop/VIBE CODING/tennis-challenger"
git commit --allow-empty -m "test(mobile): manual end-to-end onboarding flow verification"
```

---

## Phase E — Profile + Settings

### Task 23: Profile screen (read-only summary)

**Files:**
- Modify: `apps/mobile/app/(app)/profile.tsx`
- Create: `apps/mobile/hooks/use-profile.ts`

- [ ] **Step 1: use-profile.ts**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export function useMyProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('no user');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id, first_name, last_name, email, phone, pronoun, pronoun_custom,
          gender_category, class_year, show_class_year, skill_self_assessment,
          dominant_hand, availability_windows, avatar_url, role, status,
          show_department, departments:departments(name)
        `)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 2: profile.tsx**

```typescript
import { Image, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useMyProfile } from '../../hooks/use-profile';

export default function ProfileScreen() {
  const { data: p, isLoading } = useMyProfile();

  if (isLoading || !p) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Yükleniyor...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const pronounDisplay = p.pronoun === 'other' ? p.pronoun_custom : p.pronoun;
  const departmentName = (p.departments as { name: string } | null)?.name;

  return (
    <ScreenContainer scrollable>
      <View className="items-center pt-6">
        {p.avatar_url ? (
          <Image source={{ uri: p.avatar_url }} className="h-32 w-32 rounded-full bg-gray-200" />
        ) : (
          <View className="h-32 w-32 items-center justify-center rounded-full bg-gray-200">
            <Text className="text-3xl text-gray-500">{p.first_name?.[0]}{p.last_name?.[0]}</Text>
          </View>
        )}
        <Text className="mt-4 text-2xl font-bold text-gray-900">
          {p.first_name} {p.last_name}
        </Text>
        {pronounDisplay && <Text className="mt-1 text-gray-600">({pronounDisplay})</Text>}
      </View>

      <View className="mt-8 gap-3">
        {p.show_department && departmentName && (
          <Row label="Bölüm" value={departmentName} />
        )}
        {p.show_class_year && (
          <Row label="Sınıf" value={classYearLabel(p.class_year)} />
        )}
        <Row label="Seviye (kendi değerlendirmen)" value={skillLabel(p.skill_self_assessment)} />
        <Row label="Dominant el" value={handLabel(p.dominant_hand)} />
        <Row label="Yarışma kategorisi" value={genderCategoryLabel(p.gender_category)} />
      </View>
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="border-b border-gray-200 pb-2">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="mt-1 text-base text-gray-900">{value}</Text>
    </View>
  );
}

function classYearLabel(v: string): string {
  const map: Record<string, string> = {
    hazirlik: 'Hazırlık', '1': '1. sınıf', '2': '2. sınıf', '3': '3. sınıf',
    '4': '4. sınıf', yl: 'Yüksek Lisans', doktora: 'Doktora',
  };
  return map[v] ?? v;
}
function skillLabel(v: string): string {
  return { baslangic: 'Başlangıç', orta: 'Orta', ileri: 'İleri' }[v] ?? v;
}
function handLabel(v: string): string {
  return { sag: 'Sağ el', sol: 'Sol el' }[v] ?? v;
}
function genderCategoryLabel(v: string): string {
  return { erkek: 'Erkek', kadin: 'Kadın', open_only: 'Sadece Open' }[v] ?? v;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/hooks/use-profile.ts apps/mobile/app/\(app\)/profile.tsx
git commit -m "feat(mobile): profile screen showing onboarding data"
```

---

### Task 24: Settings screen (logout + delete account)

**Files:**
- Create: `apps/mobile/app/(app)/settings.tsx`
- Modify: `apps/mobile/app/(app)/_layout.tsx`

- [ ] **Step 1: settings.tsx**

```typescript
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';

export default function SettingsScreen() {
  const signOutStore = useAuthStore((s) => s.signOut);
  const session = useAuthStore((s) => s.session);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOutStore();
    router.replace('/(auth)/sign-in');
  };

  const confirmDelete = () => {
    Alert.alert(
      'Hesabını sil',
      'Bu işlem geri alınamaz. Profilin anonimleştirilir, maç geçmişin "Eski Üye" olarak korunur. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: secondConfirm },
      ],
    );
  };

  const secondConfirm = () => {
    Alert.alert('Son onay', 'Gerçekten silmek istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Evet, sil', style: 'destructive', onPress: doDelete },
    ]);
  };

  const doDelete = async () => {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/anonymize-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error?.message ?? 'Silme başarısız');
      }
      await supabase.auth.signOut();
      signOutStore();
      router.replace('/(auth)/sign-in');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi');
    }
  };

  return (
    <ScreenContainer>
      <View className="flex-1 gap-4 pt-8">
        <Button onPress={handleLogout} variant="secondary">
          Çıkış yap
        </Button>
        <Text className="mt-8 text-sm text-gray-500">Hesabını kalıcı olarak sil:</Text>
        <Button onPress={confirmDelete} variant="ghost">
          Hesabımı sil
        </Button>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Add settings tab in _layout.tsx**

```typescript
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1e3a8a' }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/
git commit -m "feat(mobile): settings screen with logout and anonymize account"
```

---

### Task 25: TypeScript + monorepo wiring verification

**Files:**
- Modify: `apps/mobile/tsconfig.json`

- [ ] **Step 1: Update tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "jsx": "react-native",
    "moduleResolution": "bundler",
    "module": "esnext",
    "target": "esnext",
    "types": ["react-native", "@types/react"],
    "paths": {
      "@tennis/shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["app/**/*", "components/**/*", "lib/**/*", "stores/**/*", "hooks/**/*", "tests/**/*", "nativewind-env.d.ts"],
  "exclude": ["node_modules", "dist", ".expo"]
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/mobile
/Users/hazarustun/.bun/bin/bun run typecheck
```

Expected: 0 errors. If any errors, fix inline before committing.

- [ ] **Step 3: Run all mobile tests**

```bash
/Users/hazarustun/.bun/bin/bun test
```

Expected: All store + lib tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/tsconfig.json
git commit -m "chore(mobile): tighten tsconfig and verify typecheck"
```

---

## Phase F — Integration

### Task 26: Full app smoke test via Expo Go on user's iPhone

This is the moment the user sees the app on their phone. No code changes.

- [ ] **Step 1: Install Expo Go**

User: install "Expo Go" from the App Store on iPhone.

- [ ] **Step 2: Start backend + functions**

```bash
cd packages/supabase
supabase start
supabase functions serve --no-verify-jwt &
```

- [ ] **Step 3: Update .env.local with current keys**

```bash
supabase status --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.xxx:54321'); print(f'EXPO_PUBLIC_SUPABASE_ANON_KEY={d[\"ANON_KEY\"]}')"
```

NOTE: Replace `127.0.0.1` with your Mac's LAN IP (find via `ifconfig en0 | grep inet`). iPhone can't reach `127.0.0.1` on Mac.

Update `apps/mobile/.env.local`.

- [ ] **Step 4: Start Expo with LAN host**

```bash
cd apps/mobile
bunx expo start --host lan
```

QR code appears.

- [ ] **Step 5: Scan QR code with iPhone Camera app**

iPhone opens Expo Go and loads the app. First load takes ~30s.

- [ ] **Step 6: Manual verification on iPhone**

User walks through:
1. Sign-in screen appears
2. Type a BÜ email
3. Open Inbucket on Mac (http://127.0.0.1:54324) to see OTP email
4. Type the 6-digit code on iPhone
5. Onboarding starts
6. Complete all 11 steps
7. Land on home screen
8. Tap Profile tab → see filled profile
9. Tap Settings → see logout/delete options
10. Tap Logout → return to sign-in

If any step fails, capture screenshot + error message, fix as a follow-up before Plan 4.

- [ ] **Step 7: Commit verification record**

```bash
cd "/Users/hazarustun/Desktop/VIBE CODING/tennis-challenger"
git commit --allow-empty -m "test(mobile): verified Expo Go flow on iPhone"
```

---

### Task 27: README + CI hookup for mobile

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `apps/mobile/README.md`

- [ ] **Step 1: Add mobile typecheck/test job to CI**

Edit `.github/workflows/ci.yml`. Find the `shared-tests` job and ADD a new job after it:

```yaml
  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Typecheck (mobile)
        working-directory: apps/mobile
        run: bun run typecheck

      - name: Test (mobile)
        working-directory: apps/mobile
        run: bun test
```

- [ ] **Step 2: apps/mobile/README.md**

```markdown
# Tennis Challenger Mobile

Expo iOS-first app for the Boğaziçi Tennis Challenger ranking system.

## Dev setup

1. Install Expo Go on iPhone (App Store) or use iOS Simulator (Xcode).
2. Start local Supabase: `cd ../../packages/supabase && supabase start`
3. Start Edge Functions: `supabase functions serve --no-verify-jwt`
4. Copy local keys to `.env.local`:
   ```bash
   supabase status --output json | python3 -c "..."
   ```
5. Start Expo: `bunx expo start --host lan`
6. Scan QR with iPhone Camera, or press `i` for Simulator.

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
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml apps/mobile/README.md
git commit -m "ci(mobile): add typecheck + test job and README"
```

---

## Plan 3 Sonu

Bu plan tamamlandığında:

- **Çalışan iOS uygulaması** (Expo Go ile iPhone'da preview)
- **Auth flow**: BÜ e-postası → OTP → session persistence
- **11-step onboarding** wizard (persisted draft, ELO seed, profile creation)
- **Profile + Settings** placeholder ekranları
- **CI** mobile typecheck + test
- Plan 2 backend tüm flow'larıyla entegre

**Bilinen sınırlamalar (sonraki planlara devr):**
- UI placeholder (gerçek tasarım Plan 8'de Claude Design link ile)
- Department picker scroll list (Plan 8'de searchable dropdown)
- Avatar storage bucket Plan 8'de migration ile yaratılır (şu an silently fail edebilir)
- Push token registration mobile tarafında **eklenmedi** — Plan 7'de push integration ile
- Maç akışı ekranları — Plan 4'te

**Sonraki plan: Plan 4 — Maç Akışı** (maç oluştur, kabul, oyna, skor gir, onayla).
