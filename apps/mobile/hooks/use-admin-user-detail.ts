import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface AdminUserDetail {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: 'player' | 'admin';
  status: string | null;
  gender_category: string | null;
  last_match_at: string | null;
  created_at: string;
  /**
   * ISO timestamp when an active suspension auto-expires (Plan 8 Phase A4).
   * `null` while `status === 'suspended'` means a permanent ban.
   */
  suspended_until: string | null;
}

// `profiles.email` / `profiles.phone` / `profiles.role` are revoked from
// `authenticated`; the `admin_get_profile_detail` RPC is SECURITY DEFINER and
// gates on `public.is_admin()`. Non-admins hitting this hook get a 42501.
export function useAdminUserDetail(userId: string | undefined) {
  return useQuery<AdminUserDetail | null>({
    // Avoid sharing the umbrella admin.all key when disabled — invalidating
    // admin.all from a sibling hook would otherwise refetch this no-op query.
    queryKey: userId ? queryKeys.admin.userDetail(userId) : [...queryKeys.admin.all, 'userDetail', 'disabled'],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc('admin_get_profile_detail', {
        target_user_id: userId,
      });
      if (error) throw error;
      const rows = (data ?? []) as AdminUserDetail[];
      return rows.length > 0 ? rows[0] : null;
    },
  });
}
