// `new-match` tab slot — Plan 8 Phase E1.
//
// This file exists so Expo Router includes the central "+" slot in the Tabs
// configuration that the custom `TabBar` paints. Normally a `tabPress`
// listener in `(tabs)/_layout.tsx` calls `e.preventDefault()` and pushes the
// "Yeni Maç" wizard before this renders.
//
// Fallback: if the slot is ever reached directly (listener miss / deep link),
// redirect into the wizard instead of showing a blank screen.

import { Redirect } from 'expo-router';

export default function NewMatchSlot() {
  return <Redirect href="/match/new/type" />;
}
