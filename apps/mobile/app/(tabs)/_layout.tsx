// Tabs layout — Plan 8 Phase E1.
//
// Wires the Plan 8 custom `TabBar` (see components/ui/TabBar.tsx) into
// Expo Router's `<Tabs />` navigator. The five tab slots must appear in
// the same order the design source declares them:
//
//   index (Sıralama) · matches · new-match (+) · notifications · profile
//
// The central "+" slot is a sentinel — its underlying screen
// (`(tabs)/new-match.tsx`) is never displayed. A `tabPress` listener
// intercepts the navigation event and routes the user to the modal
// "Yeni Maç" wizard (`/match/new/type`, wired in a later Phase E
// dispatch). For now the listener still fires and the modal route is
// declared via `router.push`; the wizard files arrive in Phase E10+.
//
// The notification badge count is sourced from `useUnreadCount` — the
// hook Plan 7 shipped (`hooks/use-unread-count.ts`). It already keys off
// the auth store + Supabase `notifications` table; reusing it here keeps
// the badge in sync with the dedicated notifications screen.
//
// `NotificationListener` is mounted at the layout root so realtime
// `INSERT`s on `notifications` invalidate the unread-count + list
// queries while the user is inside the tab shell. This mirrors what
// `(app)/_layout.tsx` did under the Plan 4-7 chrome.

import { router, Tabs } from 'expo-router';
import { View } from 'react-native';
import { NotificationListener } from '../../components/notifications/NotificationListener';
import { TabBar } from '../../components/ui/TabBar';

export default function TabsLayout() {
  return (
    <View className="flex-1">
      <NotificationListener />
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Anasayfa' }} />
        <Tabs.Screen name="matches" options={{ title: 'Maçlar' }} />
        <Tabs.Screen
          name="new-match"
          options={{ title: '' }}
          listeners={{
            tabPress: (e) => {
              // Never settle on the empty "+" tab — bounce to the modal wizard.
              e.preventDefault();
              router.push('/match/new/type' as never);
            },
          }}
        />
        <Tabs.Screen name="leaderboard" options={{ title: 'Sıralama' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
      </Tabs>
    </View>
  );
}
