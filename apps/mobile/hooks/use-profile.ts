import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export interface MyProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  pronoun: 'he/him' | 'she/her' | 'they/them' | 'other';
  pronoun_custom: string | null;
  gender_category: 'erkek' | 'kadin' | 'open_only';
  department_id: string | null;
  class_year: 'hazirlik' | '1' | '2' | '3' | '4' | 'yl' | 'doktora';
  show_class_year: boolean;
  show_department: boolean;
  skill_self_assessment: 'baslangic' | 'orta' | 'ileri';
  dominant_hand: 'sag' | 'sol';
  availability_windows: string[];
  avatar_url: string | null;
  role: 'player' | 'admin';
  status: string | null;
  departments: { name: string } | null;
}

export function useMyProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<MyProfile | null>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('no user');
      // Read via SECURITY DEFINER RPC so the caller sees their own
      // phone/email/role even though those columns are revoked from
      // the broad authenticated grant. Returns jsonb with the
      // departments join already merged in.
      const { data, error } = await supabase.rpc('get_my_profile');
      if (error) throw error;
      return (data ?? null) as MyProfile | null;
    },
    enabled: !!userId,
  });
}
