// AppGuards — Plan 8 Phase H4 + H7.
//
// A render-null component mounted inside ToastProvider that runs two
// app-wide effects which need toast + navigation context:
//
//   H4 — Session guard: if the session drops to null while the user is inside
//        the authed area (not already on an auth/onboarding screen), bounce
//        them to sign-in. Covers mid-session token expiry, which the cold-start
//        guard in app/index.tsx cannot catch.
//
//   H7 — Network awareness: surface a toast when connectivity is lost and
//        again when it returns, so failed queries have an explanation.

import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { router, useSegments } from 'expo-router';
import { useToast } from './ui/ToastProvider';
import { useAuthStore } from '../stores/auth-store';

export function AppGuards() {
  const toast = useToast();
  const segments = useSegments();
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);

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
