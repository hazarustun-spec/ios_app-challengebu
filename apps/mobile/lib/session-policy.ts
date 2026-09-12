// When is someone signed in, signed out — or do we simply not know yet?
//
// THE BUG this answers: people typed their e-mail and waited for an OTP every
// couple of days although their session was perfectly valid. The server's own
// records showed it plainly: each new OTP sign-in came 1-5 minutes AFTER the
// previous session had refreshed successfully, and the refreshed token was
// never used again.
//
// What happened on the phone: the app opens with an expired access token
// (normal after an hour away) and refreshes it. The first attempt often fails
// for a boring reason — the network is not up yet right after launch.
// supabase-js reports that as `session: null` WITH a retryable error, keeps the
// refresh token in storage, and succeeds a few seconds later. But the app read
// `null` as "signed out" and sent the person to the welcome screen — and nothing
// ever brought them back when the session returned seconds later.
//
// So a read has THREE outcomes, not two.

import {
  type AuthError,
  type Session,
  isAuthRefreshDiscardedError,
  isAuthRetryableFetchError,
} from '@supabase/supabase-js';

export type SessionRead = 'signed-in' | 'signed-out' | 'unknown';

export function classifySessionRead(session: Session | null, error: AuthError | null): SessionRead {
  if (session) return 'signed-in';
  // Transient: the network, or a refresh that raced something else. The refresh
  // token is still in storage; asking again shortly will answer.
  if (error && (isAuthRetryableFetchError(error) || isAuthRefreshDiscardedError(error))) {
    return 'unknown';
  }
  // No session and no error: nobody signed in. Or a definitive rejection from
  // the auth server (token revoked, user deleted) — supabase-js has already
  // cleared storage for those, so signed out is the truth.
  return 'signed-out';
}

/**
 * "Once signed in on a phone, the next OTP should be 60 days later."
 *
 * Sessions on this project never expire on the server (no time-box, no
 * inactivity timeout), so without this a sign-in would last forever. The cap is
 * measured from the moment the person actually entered the code, which the
 * access token carries in its `amr` claim — and keeps carrying across every
 * refresh, so the clock does not restart each time the token renews.
 */
export const SIGN_IN_MAX_AGE_DAYS = 60;

export function signInAgeExceeded(
  accessToken: string | undefined,
  nowMs: number = Date.now(),
  maxDays: number = SIGN_IN_MAX_AGE_DAYS,
): boolean {
  const signedInAt = signedInAtSeconds(accessToken);
  // Unreadable token: never force a sign-out on a guess.
  if (signedInAt === null) return false;
  return nowMs - signedInAt * 1000 > maxDays * 86_400_000;
}

function signedInAtSeconds(accessToken: string | undefined): number | null {
  if (!accessToken) return null;
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    const stamps = Array.isArray(json.amr)
      ? json.amr.map((m: { timestamp?: unknown }) => m.timestamp).filter(Number.isFinite)
      : [];
    // The earliest method is the original sign-in; anything later (e.g. a
    // step-up) must not extend it.
    return stamps.length > 0 ? Math.min(...stamps) : null;
  } catch {
    return null;
  }
}
