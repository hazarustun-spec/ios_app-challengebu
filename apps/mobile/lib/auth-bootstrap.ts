import { supabase } from './supabase';
import { useAuthStore } from '../stores/auth-store';

export async function bootstrapAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  useAuthStore.getState().setSession(session);

  if (session?.user) {
    await loadProfile(session.user.id);
  }

  useAuthStore.getState().setLoading(false);

  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    useAuthStore.getState().setSession(newSession);
    if (newSession?.user) await loadProfile(newSession.user.id);
    else useAuthStore.getState().setProfile(null);
  });
}

export async function loadProfile(_userId?: string) {
  // Use the SECURITY DEFINER RPC so we can read the owner's `role` field
  // even though SELECT(role) is revoked from authenticated.
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error || !data) {
    useAuthStore.getState().setProfile(null);
    return;
  }
  const row = data as {
    user_id: string;
    first_name: string;
    last_name: string;
    role: 'player' | 'admin';
    status: string | null;
  };
  useAuthStore.getState().setProfile({
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    onboardingComplete: row.status !== null && row.first_name?.length > 0,
  });
}
