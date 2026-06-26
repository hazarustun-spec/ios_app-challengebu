import { Platform } from 'react-native';
import Native, { type LiveMatchSubscription } from '../modules/live-match-activity';
import { useAuthStore } from '../stores/auth-store';
import { env } from './env';
import { invokeFunction } from './invoke-function';

export type LiveMatchAttrs = {
  matchId: string;
  youSide: 'a' | 'b';
  nameA: string;
  nameB: string;
  categoryLabel?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  accessToken?: string;
  refreshToken?: string;
};

export type LiveMatchState = {
  gamesA: number;
  gamesB: number;
  pointsA: number;
  pointsB: number;
  phase: 'ongoing' | 'void' | 'finished';
  winner?: 'a' | 'b' | null;
};

export function isSupported(): boolean {
  if (Platform.OS !== 'ios' || !Native) return false;
  try {
    return Native.isSupported();
  } catch {
    return false;
  }
}

export async function startMatchActivity(a: LiveMatchAttrs): Promise<void> {
  if (!Native || !isSupported()) return;
  try {
    await Native.start(a);
  } catch {
    // A Live Activity failure must never break the scoring flow.
  }
}

export async function updateMatchActivity(s: LiveMatchState): Promise<void> {
  if (!Native) return;
  try {
    await Native.update(s);
  } catch {
    // never break scoring
  }
}

export async function endMatchActivity(s: LiveMatchState): Promise<void> {
  if (!Native) return;
  try {
    await Native.end(s);
  } catch {
    // never break scoring
  }
}

// Subscribe to the activity's APNs push token and register it with the backend
// so the server can push score updates to the Live Activity (cross-device sync).
// Returns an EventSubscription whose `.remove()` should be called on cleanup, or
// null when the native module isn't available. A registration failure must never
// break the scoring flow.
export function registerActivityPushToken(
  matchId: string,
): LiveMatchSubscription | null {
  if (!Native || Platform.OS !== 'ios') return null;
  try {
    return Native.addListener('onPushToken', ({ token }) => {
      // Read the access token FRESH at event time — the subscription is
      // attached before start() and outlives token refreshes, so a captured
      // token could be stale or absent when the listener is first wired up.
      const accessToken = useAuthStore.getState().session?.access_token;
      if (!accessToken) return;
      invokeFunction('register-activity-token', { matchId, token }, accessToken).catch(() => {
        // never break scoring
      });
    });
  } catch {
    // never break scoring
    return null;
  }
}

// Subscribe to the DEVICE/USER-level push-to-start token and register it with
// the backend so the server can auto-start this user's Live Activity when an
// opponent begins a match (iOS 17.2+ push-to-start). Captured once at app
// startup after auth — independent of any match. Returns an EventSubscription
// whose `.remove()` should be called on cleanup, or null when unavailable.
// A registration failure must never crash the app.
export function registerPushToStartToken(): LiveMatchSubscription | null {
  if (!Native || Platform.OS !== 'ios') return null;
  try {
    // Attach the listener BEFORE starting the observer so we can't miss an
    // emission that fires between observe() and addListener().
    const sub = Native.addListener('onPushToStartToken', ({ token }) => {
      // Read the access token FRESH at event time — the subscription outlives
      // token refreshes, so a captured token could be stale.
      const accessToken = useAuthStore.getState().session?.access_token;
      if (!accessToken) return;
      invokeFunction('register-push-to-start-token', { token }, accessToken).catch(() => {
        // never crash the app
      });
    });
    // Fire-and-forget: starts the native async observer (no-op on iOS < 17.2).
    Native.observePushToStartToken().catch(() => {
      // never crash the app
    });
    return sub;
  } catch {
    return null;
  }
}

// Register the APNs push token of EVERY existing + future Live Activity (incl.
// server push-started ones that never went through start()), so the server can
// push score updates to them. Attaches the listener BEFORE kicking off native
// enumeration (race-safe) and reads a FRESH access token per event. Returns an
// EventSubscription whose `.remove()` should be called on cleanup, or null when
// unavailable. A registration failure must never crash the app.
export function registerActivityTokensOnStartup(): LiveMatchSubscription | null {
  if (!Native || Platform.OS !== 'ios') return null;
  try {
    const sub = Native.addListener('onActivityPushToken', ({ matchId, token }) => {
      const accessToken = useAuthStore.getState().session?.access_token;
      if (!accessToken) return;
      invokeFunction('register-activity-token', { matchId, token }, accessToken).catch(() => {
        // never crash the app
      });
    });
    Native.registerExistingActivityTokens().catch(() => {
      // never crash the app
    });
    return sub;
  } catch {
    return null;
  }
}

// Push user-level auth context (no matchId) to the App Group so the lock-screen
// AwardPointIntent can authenticate even if start() never ran this session.
// Also writes the refresh token so the intent can self-refresh an expired
// access token (the app only refreshes the JWT while running).
// Called on auth changes; iOS-guarded internally. Never throws.
export function writeLiveActivityAuthContext(
  accessToken: string | undefined,
  refreshToken: string | undefined,
): void {
  if (!Native || Platform.OS !== 'ios' || !accessToken) return;
  Native.writeAuthContext({
    supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    accessToken,
    refreshToken: refreshToken ?? '',
  }).catch(() => {
    // never crash the app
  });
}
