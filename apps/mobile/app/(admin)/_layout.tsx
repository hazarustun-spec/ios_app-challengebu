// Admin route group — Plan 8 Phase G.
//
// Gate logic ports verbatim from Plan 7 Faz D: only profiles with
// `role === 'admin'` get through; everyone else (including unauthenticated
// users) gets redirected back to the app root, which itself reroutes
// non-onboarded users to the sign-in flow.
//
// Plan 8 swaps the native Stack header for our `NavHeader` primitive on
// every admin screen, so `headerShown: false` is the new default here. Each
// screen renders its own `<NavHeader title="..." onBack={...} />` to match
// the design source (see screens-admin.jsx).

import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../stores/auth-store';

export default function AdminLayout() {
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  if (loading) return null;
  if (!profile || profile.role !== 'admin') {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
