// Matches tab — Plan 8 Phase E1 placeholder.
//
// The real Matches Hub (Maçlar Listesi · Aktif / Geçmiş tabs) ships in
// Phase E3. Until then this slot renders a minimal "coming soon" panel
// so the Tabs navigator has a valid screen at the route.

import { Text, View } from 'react-native';
import { NavHeader } from '../../components/ui/NavHeader';

export default function MatchesTab() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader large title="Maçlar" />
      <View className="flex-1 items-center justify-center px-6">
        <Text
          className="font-sans font-semibold text-text-3 text-center"
          style={{ fontSize: 13 }}
        >
          Phase E3&apos;te buraya gelir.
        </Text>
      </View>
    </View>
  );
}
