import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  // Drop `gestureEnabled: false` — the wizard's Atla/Devam buttons remain the
  // primary flow controls, but gesture-back and the OBFrame back chip are a
  // valid secondary path between steps. (Plan 8 Phase D polish.)
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    />
  );
}
