// Dev-only route group — gallery + future tooling screens.
// Not shipped to production users; gated by `__DEV__` in entry points.

import { Stack } from 'expo-router';

export default function DevLayout() {
  return <Stack screenOptions={{ headerShown: true, title: 'Gallery' }} />;
}
