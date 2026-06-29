// Catch-all for unresolvable routes / malformed deep links. Instead of dumping
// the user on sign-in (the previous default), route by auth state — same logic
// as index.tsx — so a logged-in user lands on Home, not a login screen.

import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../stores/auth-store';
import { useOnboardingStore, firstIncompleteStep } from '../stores/onboarding-store';

export default function NotFound() {
  const { session, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!profile?.onboardingComplete) {
    const step = firstIncompleteStep(useOnboardingStore.getState());
    return <Redirect href={step as Href} />;
  }

  return <Redirect href={'/(tabs)' as Href} />;
}
