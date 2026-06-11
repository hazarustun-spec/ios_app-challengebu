// Season stack — Plan 8 Phase F (F8-F12).
//
// Sub-screens reached from the dashboard / season callouts:
//   - index (F8 active season)
//   - bracket (F9 singles Top 8)
//   - bracket-doubles (F10 doubles Top 4)
//   - annual-champion (F11)
//   - archive (F12 past seasons)

import { Stack } from 'expo-router';

export default function SeasonLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
