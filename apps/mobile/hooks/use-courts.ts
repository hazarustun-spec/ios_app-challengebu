import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface Court {
  id: string;
  name: string;
  display_order: number;
}

export function useCourts() {
  return useQuery<Court[]>({
    queryKey: queryKeys.courts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courts')
        .select('id, name, display_order')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}
