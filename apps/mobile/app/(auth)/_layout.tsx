// Auth route group — Plan 8 Phase D.
//
// All auth screens hide the native header (the design ships its own NavHeader
// component) and join a single stack. Splash + welcome are headless intro
// surfaces; sign-in + otp host real form chrome.

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
