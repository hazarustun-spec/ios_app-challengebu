import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../stores/auth-store';

export default function Index() {
  const { session, profile, loading } = useAuthStore();

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

  if (!profile?.onboardingComplete) {
    return <Redirect href="/(onboarding)/name" />;
  }

  // Cast: Expo Router's typed-routes generator (`.expo/types/router.d.ts`)
  // only regenerates on `expo start`. Until the next dev launch, `/(tabs)`
  // is not in the union; the cast unblocks typecheck while the path is
  // still validated at runtime by Expo Router itself.
  return <Redirect href={'/(tabs)' as Href} />;
}
