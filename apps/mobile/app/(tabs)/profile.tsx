// Profile tab — Plan 8 Phase E1 placeholder.
//
// Full profile port (hero, badges, stats, history) lands in Phase F.
// Until then this slot keeps the Tabs navigator's profile route valid.

import { Text, View } from 'react-native';
import { NavHeader } from '../../components/ui/NavHeader';

export default function ProfileTab() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader large title="Profil" />
      <View className="flex-1 items-center justify-center px-6">
        <Text
          className="font-sans font-semibold text-text-3 text-center"
          style={{ fontSize: 13 }}
        >
          Phase F&apos;de buraya gelir.
        </Text>
      </View>
    </View>
  );
}
