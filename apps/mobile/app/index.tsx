import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { useOnboardingStore, firstIncompleteStep } from '../stores/onboarding-store';
import { loadProfile } from '../lib/auth-bootstrap';
import { Button } from '../components/ui/Button';
import { colors } from '../theme/colors';

export default function Index() {
  const { session, profile, loading, profileError } = useAuthStore();
  const [retrying, setRetrying] = useState(false);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (!session) {
    // Enter the auth stack at the branded splash, which auto-advances to
    // welcome — otherwise splash is never shown on a normal cold start.
    return <Redirect href="/(auth)/splash" />;
  }

  // Signed in but the profile could not be loaded even after auth-bootstrap's
  // retries. Falling through to `!profile?.onboardingComplete` here would
  // drop an existing user into the onboarding wizard, where the next-button
  // would overwrite their real profile row with wizard defaults. Show a
  // dedicated retry surface instead of guessing.
  if (!profile && profileError) {
    async function onRetry() {
      setRetrying(true);
      try {
        await loadProfile();
      } finally {
        setRetrying(false);
      }
    }
    return (
      <View
        className="flex-1 bg-bg"
        style={{ padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 }}
      >
        <Text
          className="font-display font-extrabold text-text"
          style={{ fontSize: 22, textAlign: 'center' }}
        >
          Profil yüklenemedi
        </Text>
        <Text
          className="font-sans text-text-2"
          style={{ fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 }}
        >
          İnternet bağlantını kontrol edip tekrar dene.
        </Text>
        <Button onPress={onRetry} disabled={retrying} size="lg" variant="dark">
          {retrying ? 'Deneniyor…' : 'Tekrar dene'}
        </Button>
        {retrying && <ActivityIndicator color={colors.clay} />}
      </View>
    );
  }

  if (!profile?.onboardingComplete) {
    // Resume at the first step whose required field is still unset instead of
    // always restarting at step 1. `getState()` is a static read — no hook.
    const step = firstIncompleteStep(useOnboardingStore.getState());
    return <Redirect href={step as Href} />;
  }

  // Cast: Expo Router's typed-routes generator (`.expo/types/router.d.ts`)
  // only regenerates on `expo start`. Until the next dev launch, `/(tabs)`
  // is not in the union; the cast unblocks typecheck while the path is
  // still validated at runtime by Expo Router itself.
  return <Redirect href={'/(tabs)' as Href} />;
}
