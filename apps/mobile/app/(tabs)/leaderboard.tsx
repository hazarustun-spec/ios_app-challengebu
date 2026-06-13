// `leaderboard` tab slot — placeholder, mirrors `new-match.tsx`.
//
// This file only exists so Expo Router includes the slot in the Tabs
// configuration the custom TabBar paints. The screen is never rendered:
// `(tabs)/_layout.tsx` intercepts the tabPress event and pushes the user
// to `/leaderboard` (the actual Sıralama page under app/leaderboard).

import { View } from 'react-native';

export default function LeaderboardTabPlaceholder() {
  return <View />;
}
