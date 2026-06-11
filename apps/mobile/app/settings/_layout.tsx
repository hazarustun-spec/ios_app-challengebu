// Settings stack — Plan 8 Phase G2-G4.
//
// Groups the user-facing settings screens behind a common Stack so they
// share the slide-from-right navigation transition. The Plan 7-era
// settings screen (`(app)/settings.tsx`) still ships as a fallback until
// Phase G migration is complete, but the Plan 8 entry point is
// `/settings` — see `(tabs)/profile.tsx`.

import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
