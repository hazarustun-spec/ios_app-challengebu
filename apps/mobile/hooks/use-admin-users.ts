import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface AdminUserRow {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: 'player' | 'admin';
  status: string | null;
}

// `profiles.email` / `profiles.role` are revoked from `authenticated` at the
// column-grant level (migration 20260608000006_profiles_column_rls.sql), so
// admins must go through a SECURITY DEFINER RPC to read them. The RPC itself
// gates on `public.is_admin()` and raises 42501 for non-admins.
export function useAdminUsers(search: string | null) {
  return useQuery<AdminUserRow[]>({
    queryKey: queryKeys.admin.users(search),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_profiles', {
        search: search ?? null,
        lim: 50,
      });
      if (error) throw error;
      return ((data ?? []) as unknown) as AdminUserRow[];
    },
  });
}
