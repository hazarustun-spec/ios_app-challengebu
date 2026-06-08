import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { CelebrationMount } from '../../components/profile/CelebrationMount';

export default function AppLayout() {
  return (
    <View className="flex-1">
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
      <CelebrationMount />
    </View>
  );
}
