import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { invokeFunction } from '../lib/invoke-function';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

/**
 * Sign out with push token deactivation.
 *
 * Steps:
 * 1. Best-effort: read the current Expo push token (if any) and invoke the
 *    deactivate-push-token Edge Function to delete the matching row.
 *    Must run BEFORE signOut() so the function can authenticate as the user.
 * 2. Call supabase.auth.signOut() — clears the persisted session.
 * 3. Clear the auth store + React Query cache so no stale data leaks across
 *    user boundaries.
 * 4. Reset navigation to the /(auth)/welcome landing.
 *
 * Steps 3-4 run in `onSettled` (not `onSuccess`) so a failing server signOut —
 * network down, already-expired session — still tears down local state and
 * navigates away instead of stranding the user on the Settings screen. Settings
 * is its own nested Stack; replacing to the auth group from there works, but
 * only if the redirect actually fires, hence onSettled.
 *
 * Step 1 failures are swallowed — sign-out must succeed even if token cleanup
 * fails (e.g., network down, simulator without device token). The weekly
 * server-side cleanup_push_tokens cron (deletes tokens inactive 60+ days)
 * is the backstop.
 *
 * Pre-TestFlight hardening #9.
 */
export function useSignOut() {
  const qc = useQueryClient();
  const signOutStore = useAuthStore((s) => s.signOut);

  return useMutation({
    mutationFn: async () => {
      // 1. Best-effort token deactivation (must happen BEFORE signOut so the
      //    edge function can authenticate as the still-signed-in user).
      try {
        const session = useAuthStore.getState().session;
        if (session?.access_token && Device.isDevice) {
          const tokenResponse = await Notifications.getExpoPushTokenAsync();
          const expoToken = tokenResponse?.data;
          if (expoToken) {
            await invokeFunction(
              'deactivate-push-token',
              { token: expoToken },
              session.access_token,
            );
          }
        }
      } catch (err) {
        console.warn('[sign-out] push token deactivation failed (continuing)', err);
      }

      // 2. Sign out (clears persisted Supabase session in SecureStore).
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSettled: () => {
      // 3. Clear local state — runs even if the server signOut threw, so the
      //    user is never left signed-in-looking on the Settings screen.
      signOutStore();
      qc.clear();
      // 4. Reset navigation to the auth landing (first-launch page).
      router.replace('/(auth)/welcome');
    },
  });
}
