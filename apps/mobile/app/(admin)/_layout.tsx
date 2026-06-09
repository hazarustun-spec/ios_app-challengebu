import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../stores/auth-store';

export default function AdminLayout() {
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  if (loading) return null;
  if (!profile || profile.role !== 'admin') {
    return <Redirect href="/" />;
  }
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Admin Paneli' }} />
      <Stack.Screen name="disputes" options={{ title: 'Bekleyen İtirazlar' }} />
      <Stack.Screen name="disputes/[id]" options={{ title: 'İtiraz' }} />
      <Stack.Screen name="seasons" options={{ title: 'Sezon Yönetimi' }} />
      <Stack.Screen name="tournaments" options={{ title: 'Finale Bracket Yönetimi' }} />
    </Stack>
  );
}
