// Sentry — crash + error reporting.
//
// The DSN comes from the EXPO_PUBLIC_SENTRY_DSN environment variable so
// per-environment (.env.production, .env.local) config decides what gets
// tracked and where. Leaving the DSN empty in a dev build means Sentry is
// effectively a no-op — nothing is sent, no keys are baked into the local
// bundle.
//
// Source-map upload runs during EAS Build (`@sentry/expo-upload-sourcemaps`
// is picked up by the config plugin registered in app.json). That step
// needs SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT set as EAS Secrets;
// it is a build-time concern and never ships in the bundle.

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Wrap the root App component so Sentry captures navigation + native crashes. */
export const wrap = Sentry.wrap;

/** Call once, from the root layout, before the first render. */
export function initSentry() {
  if (!DSN) {
    // Dev / preview / any build that has not opted in yet.
    if (__DEV__) console.info('[sentry] EXPO_PUBLIC_SENTRY_DSN empty — Sentry disabled');
    return;
  }

  const release =
    Constants.expoConfig?.version ??
    (Constants as unknown as { manifest?: { version?: string } }).manifest?.version ??
    'unknown';
  const dist =
    Constants.expoConfig?.ios?.buildNumber ??
    (Constants as unknown as { manifest?: { ios?: { buildNumber?: string } } }).manifest?.ios
      ?.buildNumber ??
    'unknown';

  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? 'development' : 'production',
    release: `challengebu@${release}+${dist}`,
    dist,
    // Sampling: 100% of errors, 10% of transactions. Free tier is 5K events /
    // month; a small user base means 100% error capture is fine. If we ever
    // spike, drop `sampleRate` first.
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    // Don't leak the user's e-mail into every event. We attach a hashed
    // userId later via `Sentry.setUser({ id })` from `bootstrapAuth`.
    sendDefaultPii: false,
    // Keep the last 100 breadcrumbs — plenty of context for a crash without
    // eating the payload budget.
    maxBreadcrumbs: 100,
    debug: __DEV__,
  });
}

/** Attach the signed-in user id to future events. Call from `bootstrapAuth`
 *  after the profile row is loaded. Passing `null` clears the association
 *  on sign-out. */
export function setSentryUser(userId: string | null) {
  if (!DSN) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

/** Explicit capture surface for handled-but-notable errors. Prefer this to
 *  a bare `console.error` in code paths that already know something went
 *  wrong (a mutation error the UI swallowed, for example). */
export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!DSN) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
