import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type ProgramLevel = 'lisans' | 'lisansustu';

export interface Department {
  id: string;
  name: string;
  faculty: string | null;
  program_level: ProgramLevel;
}

export function useDepartments(programLevel?: ProgramLevel) {
  return useQuery<Department[]>({
    queryKey: ['departments', programLevel ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('departments')
        .select('id, name, faculty, program_level')
        .eq('is_active', true)
        .order('display_order');
      if (programLevel) q = q.eq('program_level', programLevel);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Department[];
    },
    staleTime: 1000 * 60 * 60,
  });
}
