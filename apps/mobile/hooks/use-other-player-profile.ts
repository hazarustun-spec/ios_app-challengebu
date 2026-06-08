import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface OtherPlayerProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  pronoun: 'he/him' | 'she/her' | 'they/them' | 'other';
  pronoun_custom: string | null;
  gender_category: 'erkek' | 'kadin' | 'open_only';
  avatar_url: string | null;
  status: string;
  show_department: boolean;
  show_class_year: boolean;
  class_year: string | null;
  departments: { name: string } | { name: string }[] | null;
}

export function useOtherPlayerProfile(userId: string | undefined) {
  return useQuery<OtherPlayerProfile | null>({
    queryKey: userId ? queryKeys.players.detail(userId) : ['players', 'detail', ''],
    queryFn: async () => {
      if (!userId) return null;
      // Reads via the public_profiles view so the privacy boundary is
      // explicit in code, not implicit through column grants. The view
      // never exposes phone/email/role even if a future migration
      // accidentally regrants them on the base table.
      const { data, error } = await supabase
        .from('public_profiles')
        .select(`
          user_id, first_name, last_name, pronoun, pronoun_custom,
          gender_category, avatar_url, status,
          show_department, show_class_year, class_year,
          departments:departments(name)
        `)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OtherPlayerProfile | null;
    },
    enabled: !!userId,
  });
}
