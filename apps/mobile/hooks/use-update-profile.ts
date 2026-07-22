import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export interface UpdateProfileInput {
  first_name: string;
  last_name: string;
  pronoun: 'he/him' | 'she/her' | 'they/them' | 'other';
  pronoun_custom?: string | null;
  department_id?: string | null;
  show_department: boolean;
  class_year: 'hazirlik' | '1' | '2' | '3' | '4' | 'yl' | 'doktora' | 'mezun';
  show_class_year: boolean;
  skill_self_assessment: 'baslangic' | 'orta' | 'ileri';
  dominant_hand: 'sag' | 'sol';
  availability_windows: string[];
  gender_category?: 'erkek' | 'kadin' | 'open_only';
}

export function useUpdateProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!userId) throw new Error('Oturum bulunamadı');
      const { error } = await supabase.from('profiles').update(input).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
