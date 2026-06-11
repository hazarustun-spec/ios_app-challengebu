// `new-match` tab slot — Plan 8 Phase E1.
//
// This file exists ONLY so Expo Router includes the central "+" slot in
// the Tabs configuration that the custom `TabBar` paints. The screen is
// never actually rendered: a `tabPress` listener in
// `(tabs)/_layout.tsx` calls `e.preventDefault()` and redirects to the
// modal "Yeni Maç" wizard before navigation settles.
//
// The empty `<View />` keeps the bundle cost ~0 and the TS surface
// boring — no props, no state, no hooks.

import { View } from 'react-native';

export default function NewMatchPlaceholder() {
  return <View />;
}
