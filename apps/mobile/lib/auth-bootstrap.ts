import { supabase } from './supabase';
import { useAuthStore } from '../stores/auth-store';
import { writeLiveActivityAuthContext } from './live-match-activity';
import { isOnboardingComplete } from './onboarding-status';
import { setSentryUser } from './sentry';

export async function bootstrapAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  useAuthStore.getState().setSession(session);
  // Keep the App Group user-level auth context fresh so the lock-screen
  // AwardPointIntent can authenticate (iOS-guarded inside the helper).
  writeLiveActivityAuthContext(session?.access_token, session?.refresh_token);

  if (session?.user) {
    await loadProfile(session.user.id);
  }

  useAuthStore.getState().setLoading(false);

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
      await delay(LOAD_PROFILE_BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }
  // Retries exhausted — flag the error but leave any previously loaded
  // profile in place so a mid-session hiccup does not evict the user.
  if (lastError) console.warn('[auth-bootstrap] loadProfile failed:', lastError);
  useAuthStore.getState().setProfileError(true);
}
