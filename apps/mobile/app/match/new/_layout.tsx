// apps/mobile/app/match/new/_layout.tsx — Plan 8 Phase E10-E15.
//
// Wraps the new-match wizard (type → path → detail → opponent → preview →
// format-rules) in a header-less Stack so each step renders its own
// `NavHeader` and pushes left-to-right.

import { Stack } from 'expo-router';

export default function NewMatchLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    />
  );
}
