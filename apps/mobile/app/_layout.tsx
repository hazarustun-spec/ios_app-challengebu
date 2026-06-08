import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrapAuth } from '../lib/auth-bootstrap';
import { queryClient } from '../lib/query-client';

export default function RootLayout() {
  useEffect(() => {
    bootstrapAuth();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
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
        </Stack>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
