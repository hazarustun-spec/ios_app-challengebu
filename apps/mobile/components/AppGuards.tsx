// AppGuards — Plan 8 Phase H4 + H7.
//
// A render-null component mounted inside ToastProvider that runs three
// app-wide effects which need toast + navigation context:
//
//   H4 — Session guard: if the session drops to null while the user is inside
//        the authed area (not already on an auth/onboarding screen), bounce
//        them to sign-in. Covers mid-session token expiry, which the cold-start
//        guard in app/index.tsx cannot catch.
//
//   H7 — Network awareness: surface a toast when connectivity is lost and
//        again when it returns, so failed queries have an explanation.
//
//   Suspended guard (post-audit 2026-09-02 #4): a `suspended`/`banned` profile
//   cannot write anything — every action turned into a generic RLS error toast
//   the user could not act on. Bounce those accounts to the dedicated
//   `/suspended` screen so they see a real explanation and a sign-out CTA.

import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { router, useSegments } from 'expo-router';
import { useToast } from './ui/ToastProvider';
import { useAuthStore } from '../stores/auth-store';

const SUSPENDED_STATUSES = new Set(['suspended', 'banned']);

export function AppGuards() {
  const toast = useToast();
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const profileStatus = useAuthStore((s) => s.profile?.status ?? null);

  // H4 — reactive session guard.
  useEffect(() => {
    if (loading) return;
    const root = segments[0] as string | undefined;
    const inPublicArea =
      root === '(auth)' || root === '(onboarding)' || root === undefined;
    if (!session && !inPublicArea) {
      router.replace('/(auth)/sign-in');
    }
  }, [session, loading, segments]);

  // Suspended / banned guard. Fires whenever `profile.status` becomes one of
  // the terminal states — the redirect is idempotent because `/suspended`
  // sits at the root and the check bails once already there.
  useEffect(() => {
    if (loading) return;
    if (!session) return;
    if (!profileStatus || !SUSPENDED_STATUSES.has(profileStatus)) return;
    const root = segments[0] as string | undefined;
    if (root === 'suspended') return;
    router.replace('/suspended' as never);
  }, [profileStatus, session, loading, segments]);

  // H7 — connectivity toasts (only on transitions, not the initial reading).
  const wasOnline = useRef<boolean | null>(null);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      if (wasOnline.current === null) {
        wasOnline.current = online;
        return;
      }
      if (online === wasOnline.current) return;
      wasOnline.current = online;
      if (online) toast.show('Yeniden bağlandın', 'success');
      else toast.show('İnternet bağlantısı yok', 'error');
    });
    return unsubscribe;
  }, [toast]);

  return null;
}
