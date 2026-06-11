// apps/mobile/app/leaderboard/_layout.tsx — Plan 8 Phase F (F13 + F7).
//
// Wraps the leaderboard ladder + filter panel in a header-less Stack so each
// step renders its own `NavHeader` and pushes left-to-right.

import { Stack } from 'expo-router';

export default function LeaderboardLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    />
  );
}
