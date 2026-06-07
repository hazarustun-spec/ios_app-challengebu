import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Department {
  id: string;
  name: string;
  faculty: string | null;
}

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, faculty')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
