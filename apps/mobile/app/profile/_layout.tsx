// Profile stack — Plan 8 Phase F (F1-F5).
//
// Sub-screens reached from the (tabs)/profile tab landing: edit, ELO history,
// badges grid, full stats.

import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
