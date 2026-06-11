// apps/mobile/app/match/[id]/_layout.tsx — Plan 8 Phase E5-E9.
//
// Wraps the match detail flow (detail → score → confirm → result → dispute)
// in a header-less Stack so each step renders its own `NavHeader` and pushes
// left-to-right.

import { Stack } from 'expo-router';

export default function MatchIdLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    />
  );
}
