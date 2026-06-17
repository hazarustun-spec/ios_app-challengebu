// Doubles bracket — Plan 8 Phase F10, coming-soon screen.
//
// Doubles is deferred to v2 by product decision. No live data is wired here.
// The screen keeps the NavHeader and shows a clean EmptyState message
// indicating that doubles brackets will arrive in a future update.

import { View } from 'react-native';
import { router } from 'expo-router';
import { NavHeader } from '../../components/ui/NavHeader';
import { EmptyState } from '../../components/ui/EmptyState';

export default function DoublesBracket() {
  return (
    <View className="flex-1 bg-bg">
      <NavHeader
        title="Sezon Finali"
        subtitle="Çiftler Turnuvası"
        onBack={() => router.back()}
      />
      <EmptyState
        icon="people"
        title="Çiftler turnuvası yakında"
        body="Çiftler kategori braketleri ilerleyen bir güncellemede eklenecek."
      />
    </View>
  );
}
