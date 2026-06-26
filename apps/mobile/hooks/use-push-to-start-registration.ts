import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { registerPushToStartToken } from '../lib/live-match-activity';
import { useAuthStore } from '../stores/auth-store';

// Captures the device/user-level Live Activity push-to-start token once per
// signed-in user (after auth) and registers it with the backend, so the server
// can auto-start this user's Live Activity when an opponent begins a match
// (iOS 17.2+). iOS-only; a no-op everywhere else. Mirrors usePushRegistration's
// session-gating + run-once-per-user latch.
export function usePushToStartRegistration() {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const registered = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const accessToken = session?.access_token;
    const uid = profile?.userId;
    if (!uid || !accessToken) return;
    if (registered.current === uid) return;
    registered.current = uid;

    const sub = registerPushToStartToken(accessToken);
    return () => sub?.remove();
  }, [profile?.userId, session?.access_token]);
}
