import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { invokeFunction } from '../lib/invoke-function';
import { useAuthStore } from '../stores/auth-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushRegistration() {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const registered = useRef<string | null>(null);

  useEffect(() => {
    if (!profile?.userId || !session?.access_token) return;
    if (registered.current === profile.userId) return;
    const uid = profile.userId;
    registerForPushAsync(session.access_token)
      .then((ok) => {
        // Latch only on success, so a transient failure (permission prompt
        // dismissed, token error) retries on the next render instead of being
        // skipped forever.
        if (ok) registered.current = uid;
      })
      .catch((err) => console.warn('[push] registration failed', err));
  }, [profile?.userId, session?.access_token]);

  // Handle notification taps — route by payload category.
  useEffect(() => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;

        // Message deep-link: navigate to the specific conversation thread.
        if (typeof data.conversationId === 'string' && UUID_RE.test(data.conversationId)) {
          router.push({
            pathname: '/messages/[conversationId]',
            params: {
              conversationId: data.conversationId,
              otherUserId: typeof data.otherUserId === 'string' && UUID_RE.test(data.otherUserId) ? data.otherUserId : '',
              name: typeof data.name === 'string' ? data.name : '',
            },
          } as never);
          return;
        }

        // Match-related deep-links.
        if (typeof data.matchId === 'string' && UUID_RE.test(data.matchId)) {
          router.push(`/match/${data.matchId}` as never);
          return;
        }
        if (typeof data.tournamentId === 'string' && UUID_RE.test(data.tournamentId)) {
          router.push(`/tournament/${data.tournamentId}` as never);
          return;
        }
      },
    );
    return () => sub.remove();
  }, []);
}

/**
 * Requests notification permission (shows the OS prompt when undetermined),
 * mints an Expo push token, and registers it for the signed-in user. Returns
 * true only when a token was registered. Safe to call directly from a UI
 * action (e.g. an "enable notifications" button), which is the most reliable
 * way to surface the OS permission prompt.
 */
export async function registerForPushAsync(accessToken: string): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return false;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig
      ?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenResponse.data;
  if (!token) return false;

  await invokeFunction(
    'register-push-token',
    { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
    accessToken,
  );
  return true;
}
