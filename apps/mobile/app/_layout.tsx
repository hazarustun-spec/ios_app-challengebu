import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CelebrationMount } from '../components/profile/CelebrationMount';
import { ToastProvider } from '../components/ui/ToastProvider';
import { usePushRegistration } from '../hooks/use-push-registration';
import { bootstrapAuth } from '../lib/auth-bootstrap';
import { FONTS_MAP } from '../lib/fonts';
import { queryClient } from '../lib/query-client';

// Keep the native splash visible until our Google Fonts have loaded —
// prevents a flash of system font (FOUC) on first frame.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONTS_MAP);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  usePushRegistration();

  // Block render until fonts are ready so NativeWind font-display / font-sans
  // / font-num utilities resolve correctly on first paint.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="index" />
            <Stack.Screen name="create-match" options={{ headerShown: true, title: 'Maç Oluştur' }} />
            <Stack.Screen name="match/[id]" options={{ headerShown: true, title: 'Maç' }} />
            <Stack.Screen name="match-request/[id]" options={{ headerShown: true, title: 'Maç teklifi' }} />
            <Stack.Screen name="play/[matchId]" options={{ headerShown: true, title: 'Maç oyna' }} />
            <Stack.Screen name="play/confirm/[matchId]" options={{ headerShown: true, title: 'Onayla' }} />
            <Stack.Screen name="dispute/[matchId]" options={{ headerShown: true, title: 'İtiraz et' }} />
            <Stack.Screen name="applications/[requestId]" options={{ headerShown: true, title: 'Başvurular' }} />
            <Stack.Screen name="profile" />
            <Stack.Screen name="user/[userId]" options={{ headerShown: false }} />
            <Stack.Screen name="tournament/[id]" options={{ headerShown: true, title: 'Sezon Finali' }} />
            <Stack.Screen
              name="notification-preferences"
              options={{ headerShown: true, title: 'Bildirim Tercihleri' }}
            />
            <Stack.Screen
              name="notifications"
              options={{ headerShown: true, title: 'Bildirimler' }}
            />
            <Stack.Screen name="settings" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="(dev)" />
          </Stack>
          <CelebrationMount />
          <StatusBar style="dark" />
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
