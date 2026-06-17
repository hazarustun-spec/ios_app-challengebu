import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
    registered.current = profile.userId;
    void registerForPushAsync(session.access_token);
  }, [profile?.userId, session?.access_token]);

  // Handle notification taps — route by payload category.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;

        // Message deep-link: navigate to the specific conversation thread.
        if (typeof data.conversationId === 'string') {
          router.push({
            pathname: '/messages/[conversationId]',
            params: {
              conversationId: data.conversationId,
              otherUserId: typeof data.otherUserId === 'string' ? data.otherUserId : '',
              name: typeof data.name === 'string' ? data.name : '',
            },
          } as never);
          return;
        }

        // Match-related deep-links.
        if (typeof data.matchId === 'string') {
          router.push(`/match/${data.matchId}` as never);
          return;
        }
        if (typeof data.tournamentId === 'string') {
          router.push(`/tournament/${data.tournamentId}` as never);
          return;
        }
      },
    );
    return () => sub.remove();
  }, []);
}

async function registerForPushAsync(accessToken: string): Promise<void> {
  try {
    if (!Device.isDevice) return;
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
    if (!granted) return;
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;
    if (!token) return;
    await invokeFunction(
      'register-push-token',
      { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
      accessToken,
    );
  } catch (err) {
    console.warn('[push] registration failed', err);
  }
}
