import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export function useMyProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('no user');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id, first_name, last_name, email, phone, pronoun, pronoun_custom,
          gender_category, department_id, class_year, show_class_year, skill_self_assessment,
          dominant_hand, availability_windows, avatar_url, role, status,
          show_department,
          departments:departments(name)
        `)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
