import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  registerActivityTokensOnStartup,
  registerPushToStartToken,
} from '../lib/live-match-activity';
import { useAuthStore } from '../stores/auth-store';

// Captures the device/user-level Live Activity push-to-start token once per
// signed-in user (after auth) and registers it with the backend, so the server
// can auto-start this user's Live Activity when an opponent begins a match
// (iOS 17.2+). iOS-only; a no-op everywhere else. Mirrors usePushRegistration's
// session-gating + run-once-per-user latch.
export function usePushToStartRegistration() {
  const profile = useAuthStore((s) => s.profile);
  const registered = useRef<string | null>(null);

  // Gate on the stable user identity ONLY — never on the access token. A token
  // refresh must not tear down the live native subscription (the listener reads
  // a fresh token at event time). Re-run only when the user actually changes.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const uid = profile?.userId;
    if (!uid) return;
    if (registered.current === uid) return;
    registered.current = uid;

    const sub = registerPushToStartToken();
    // Also register tokens for any already-running activities (incl. server
    // push-started ones) plus any that appear later this session.
    const activitySub = registerActivityTokensOnStartup();
    return () => {
      sub?.remove();
      activitySub?.remove();
    };
  }, [profile?.userId]);
}
