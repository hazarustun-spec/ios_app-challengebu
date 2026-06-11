// Notifications tab — Plan 8 Phase E1 placeholder.
//
// Full notification center port lands in Phase G. The existing Plan 7
// implementation lives at `app/notifications.tsx` and is still
// reachable from the GreetHeader bell while we transition; this slot
// just ensures the Tabs navigator has a valid screen + title.

import { Text, View } from 'react-native';
import { NavHeader } from '../../components/ui/NavHeader';

export default function NotificationsTab() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader large title="Bildirimler" />
      <View className="flex-1 items-center justify-center px-6">
        <Text
          className="font-sans font-semibold text-text-3 text-center"
          style={{ fontSize: 13 }}
        >
          Phase G&apos;de buraya gelir.
        </Text>
      </View>
    </View>
  );
}
