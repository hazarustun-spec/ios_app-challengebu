import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface BadgeCatalogRow {
  id: string;
  code: string;
  name_tr: string;
  description_tr: string;
  icon: string;
  category: 'milestone' | 'win' | 'social' | 'season' | 'fun' | 'loyalty' | 'yearly';
  is_seasonal: boolean;
  display_order: number;
}

export function useAllBadges() {
  return useQuery<BadgeCatalogRow[]>({
    queryKey: queryKeys.badges.catalog(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('id, code, name_tr, description_tr, icon, category, is_seasonal, display_order')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BadgeCatalogRow[];
    },
    staleTime: 1000 * 60 * 60,
  });
}
