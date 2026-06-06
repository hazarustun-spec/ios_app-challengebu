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

async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, role, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    useAuthStore.getState().setProfile(null);
    return;
  }

  useAuthStore.getState().setProfile({
    userId: data.user_id,
    firstName: data.first_name,
    lastName: data.last_name,
    role: data.role,
    onboardingComplete: data.status !== null && data.first_name?.length > 0,
  });
}
