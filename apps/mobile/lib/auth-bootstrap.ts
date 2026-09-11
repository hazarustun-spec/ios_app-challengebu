import type { Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { useAuthStore } from '../stores/auth-store';
import { writeLiveActivityAuthContext } from './live-match-activity';
import { isOnboardingComplete } from './onboarding-status';
import { setSentryUser } from './sentry';
import { supabase } from './supabase';

/**
 * Reads the stored session. `undefined` means the read itself FAILED — almost
 * always the keychain refusing because the phone is locked and iOS launched us
 * in the background. That is not the same as `null` (nobody signed in), and
 * treating it the same is what kept sending people back to the e-mail screen.
 */
async function readStoredSession(): Promise<Session | null | undefined> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (err) {
    console.warn('[auth-bootstrap] session read failed, will retry on foreground:', err);
    return undefined;
  }
}

async function adoptSession(session: Session | null) {
  useAuthStore.getState().setSession(session);
  // Keep the App Group user-level auth context fresh so the lock-screen
  // AwardPointIntent can authenticate (iOS-guarded inside the helper).
  writeLiveActivityAuthContext(session?.access_token, session?.refresh_token);
  if (session?.user) await loadProfile(session.user.id);
}

export async function bootstrapAuth() {
  const session = await readStoredSession();
  if (session !== undefined) {
    await adoptSession(session);
    // Only a read that actually answered may end the loading state. After a
    // failed read the root screen keeps its spinner instead of redirecting to
    // sign-in, and the foreground handler below finishes the job.
    useAuthStore.getState().setLoading(false);
  }

  // Whenever the app comes to the foreground without a session in memory, look
  // in storage again. Covers the background launch above, and any other path
  // that left memory empty while the keychain still holds a valid session. A
  // real sign-out cleared storage too, so this finds nothing and changes
  // nothing for it.
  AppState.addEventListener('change', async (state) => {
    if (state !== 'active' || useAuthStore.getState().session) return;
    let stored = await readStoredSession();
    if (stored === undefined) {
      // In the foreground the keychain is open, so a failure here is not the
      // lock. Try once more, then give up to the sign-in screen rather than
      // leave the person staring at a spinner forever.
      await delay(FOREGROUND_RETRY_MS);
      stored = await readStoredSession();
    }
    if (stored) await adoptSession(stored);
    useAuthStore.getState().setLoading(false);
  });

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    useAuthStore.getState().setSession(newSession);
    // Refresh on every auth change (covers TOKEN_REFRESHED + SIGNED_IN).
    writeLiveActivityAuthContext(newSession?.access_token, newSession?.refresh_token);
    if (newSession?.user) await loadProfile(newSession.user.id);
    else {
      useAuthStore.getState().setProfile(null);
      useAuthStore.getState().setProfileError(false);
      setSentryUser(null);
    }
  });
}

// 3 attempts with exponential backoff (500ms → 1000ms → 2000ms). A single
// flaky network read used to null out the profile, and the root redirect then
// dropped an existing user into the onboarding wizard — where the "next"
// buttons overwrite whatever profile fields did exist on the server. Retrying
// keeps that first-render race from becoming data loss.
const LOAD_PROFILE_ATTEMPTS = 3;
const LOAD_PROFILE_BASE_DELAY_MS = 500;
const FOREGROUND_RETRY_MS = 500;

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
