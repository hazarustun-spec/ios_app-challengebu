import type { Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { useAuthStore } from '../stores/auth-store';
import { writeLiveActivityAuthContext } from './live-match-activity';
import { isOnboardingComplete } from './onboarding-status';
import { setSentryUser } from './sentry';
import { classifySessionRead, signInAgeExceeded } from './session-policy';
import { supabase } from './supabase';

/**
 * Reads the stored session. `undefined` means we do not know yet — the
 * keychain refused (phone locked, iOS launched us in the background), or the
 * launch-time token refresh hit a network that was not up yet. Neither is
 * "signed out", and treating them as such is what kept sending people back to
 * the e-mail screen. See session-policy.ts for the evidence.
 */
async function readStoredSession(): Promise<Session | null | undefined> {
  try {
    const { data, error } = await supabase.auth.getSession();
    const verdict = classifySessionRead(data.session, error);
    if (verdict === 'unknown') {
      console.warn('[auth-bootstrap] session not readable yet, retrying:', error);
      return undefined;
    }
    return verdict === 'signed-in' ? data.session : null;
  } catch (err) {
    console.warn('[auth-bootstrap] session read threw, retrying:', err);
    return undefined;
  }
}

/** Returns false when the session was too old to keep and got signed out. */
async function enforceSignInAge(session: Session | null): Promise<boolean> {
  if (!session || !signInAgeExceeded(session.access_token)) return true;
  // 60 days since the code was entered: ask for a new one. Local scope — the
  // point is this phone asking again, not killing sessions elsewhere.
  await supabase.auth.signOut({ scope: 'local' });
  useAuthStore.getState().signOut();
  return false;
}

async function adoptSession(session: Session | null) {
  if (!(await enforceSignInAge(session))) return;
  useAuthStore.getState().setSession(session);
  // Keep the App Group user-level auth context fresh so the lock-screen
  // AwardPointIntent can authenticate (iOS-guarded inside the helper).
  writeLiveActivityAuthContext(session?.access_token, session?.refresh_token);
  if (session?.user) await loadProfile(session.user.id);
}

// Only one retry loop at a time, however many foregrounds and failures pile up.
let settling = false;

/**
 * Reads until storage gives a real answer, then ends the loading state. While
 * it has no answer the root screen keeps its spinner rather than guessing
 * "signed out". Stops while the app is in the background (the foreground
 * listener restarts it) so a phone left offline is not polled forever.
 */
async function settleSession() {
  if (settling) return;
  settling = true;
  try {
    for (let attempt = 0; ; attempt++) {
      const stored = await readStoredSession();
      if (stored !== undefined) {
        await adoptSession(stored);
        useAuthStore.getState().setLoading(false);
        return;
      }
      if (AppState.currentState !== 'active' && attempt > 0) return;
      await delay(Math.min(SETTLE_BASE_DELAY_MS * 2 ** attempt, SETTLE_MAX_DELAY_MS));
    }
  } finally {
    settling = false;
  }
}

export async function bootstrapAuth() {
  // Subscribe FIRST, so a refresh that completes while the initial read is
  // still retrying (TOKEN_REFRESHED) is not missed.
  supabase.auth.onAuthStateChange((event, newSession) => {
    // The initial session is settleSession's job. INITIAL_SESSION runs its own
    // read, and a transient `null` from it landing after a successful adopt
    // would bounce a signed-in person to sign-in.
    if (event === 'INITIAL_SESSION') return;
    if (newSession) {
      // Deferred on purpose. This callback runs while supabase-js holds its
      // auth lock; awaiting another supabase call in here (loadProfile's RPC,
      // the 60-day signOut) waits for that same lock and can hang the client.
      // Supabase's docs say to hand the work off like this.
      setTimeout(async () => {
        await adoptSession(newSession);
        useAuthStore.getState().setLoading(false);
      }, 0);
      return;
    }
    // Only SIGNED_OUT carries a null session: a real sign-out, or the auth
    // server definitively rejecting the refresh token.
    useAuthStore.getState().setSession(null);
    writeLiveActivityAuthContext(undefined, undefined);
    useAuthStore.getState().setProfile(null);
    useAuthStore.getState().setProfileError(false);
    setSentryUser(null);
  });

  // Whenever the app comes to the foreground without a session in memory, look
  // again. Covers a background launch on a locked phone, a retry loop that
  // paused in the background, and any other path that left memory empty while
  // storage still holds a valid session. A real sign-out cleared storage too,
  // so this finds nothing and changes nothing for it.
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    const { session } = useAuthStore.getState();
    if (!session) {
      void settleSession();
      return;
    }
    // Long-running process: the 60-day cap must bite without a cold start.
    void enforceSignInAge(session);
  });

  await settleSession();
}

// 3 attempts with exponential backoff (500ms → 1000ms → 2000ms). A single
// flaky network read used to null out the profile, and the root redirect then
// dropped an existing user into the onboarding wizard — where the "next"
// buttons overwrite whatever profile fields did exist on the server. Retrying
// keeps that first-render race from becoming data loss.
const LOAD_PROFILE_ATTEMPTS = 3;
const LOAD_PROFILE_BASE_DELAY_MS = 500;
const SETTLE_BASE_DELAY_MS = 1000;
const SETTLE_MAX_DELAY_MS = 15_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loadProfile(_userId?: string) {
  // Use the SECURITY DEFINER RPC so we can read the owner's `role` field
  // even though SELECT(role) is revoked from authenticated.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < LOAD_PROFILE_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.rpc('get_my_profile');
    if (!error && data) {
      const row = data as {
        user_id: string;
        first_name: string;
        last_name: string;
        role: 'player' | 'admin';
        status: string | null;
      };
      useAuthStore.getState().setProfile({
        userId: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
        status: row.status,
        onboardingComplete: isOnboardingComplete(row),
      });
      useAuthStore.getState().setProfileError(false);
      setSentryUser(row.user_id);
      return;
    }
    lastError = error;
    if (attempt < LOAD_PROFILE_ATTEMPTS - 1) {
      await delay(LOAD_PROFILE_BASE_DELAY_MS * 2 ** attempt);
    }
  }
  // Retries exhausted — flag the error but leave any previously loaded
  // profile in place so a mid-session hiccup does not evict the user.
  if (lastError) console.warn('[auth-bootstrap] loadProfile failed:', lastError);
  useAuthStore.getState().setProfileError(true);
}
