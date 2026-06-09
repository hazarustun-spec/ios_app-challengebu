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
    </Stack>
  );
}
