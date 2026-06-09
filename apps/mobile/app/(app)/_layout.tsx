import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { NotificationListener } from '../../components/notifications/NotificationListener';
import { useAuthStore } from '../../stores/auth-store';

export default function AppLayout() {
  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  // No-op: keeps `useAuthStore` import live until Task 10 (Plan 7 Faz D) exposes an Admin tab.
  void isAdmin;
  return (
    <View className="flex-1">
      <NotificationListener />
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1e3a8a' }}>
        <Tabs.Screen
          name="matches"
          options={{
            title: 'Maçlar',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎾</Text>,
          }}
        />
        <Tabs.Screen
          name="open-calls"
          options={{
            title: 'İlanlar',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📢</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ayarlar',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>,
          }}
        />
        <Tabs.Screen name="home" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
