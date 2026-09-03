import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { useCelebrationStore } from './post-match-celebration-store';

interface ProfileSummary {
  userId: string;
  firstName: string;
  lastName: string;
  role: 'player' | 'admin';
  onboardingComplete: boolean;
  /**
   * `profiles.status` — `active` for the normal path. When the admin flips a
   * user to `suspended` or `banned`, RLS starts refusing writes on their
   * behalf and every action turns into a generic "Bunu yapma yetkin yok".
   * Surfacing the status here lets `AppGuards` bounce those accounts to a
   * dedicated screen instead of leaking RLS errors screen by screen.
   */
  status: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ProfileSummary | null;
  loading: boolean;
  /**
   * `true` when `get_my_profile` failed after every retry — the session is
   * valid but we could not load the row (typically offline at cold start).
   * The root redirect uses this to show a "Tekrar dene" fallback instead of
   * bouncing the user into onboarding on a null profile.
   */
  profileError: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: ProfileSummary | null) => void;
  setProfileError: (profileError: boolean) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileError: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setProfileError: (profileError) => set({ profileError }),
  setLoading: (loading) => set({ loading }),
  signOut: () => {
    useCelebrationStore.getState().clear();
    set({ session: null, user: null, profile: null, profileError: false });
  },
}));
