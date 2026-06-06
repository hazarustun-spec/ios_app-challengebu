import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface ProfileSummary {
  userId: string;
  firstName: string;
  lastName: string;
  role: 'player' | 'admin';
  onboardingComplete: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ProfileSummary | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: ProfileSummary | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  signOut: () => set({ session: null, user: null, profile: null }),
}));
