import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface ApplicationRow {
  id: string;
  match_request_id: string;
  applicant_id: string;
  applicant_partner_id: string | null;
  status: 'pending' | 'selected' | 'declined';
  created_at: string;
  applicant?: { first_name: string; last_name: string; avatar_url: string | null };
}

export function useApplicationsForRequest(requestId: string | undefined) {
  return useQuery<ApplicationRow[]>({
    queryKey: queryKeys.applications.forRequest(requestId ?? ''),
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from('open_call_applications')
        .select(`
          id, match_request_id, applicant_id, applicant_partner_id, status, created_at,
          applicant:profiles!open_call_applications_applicant_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('match_request_id', requestId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ApplicationRow[];
    },
    enabled: !!requestId,
  });
}

export function useMyApplications() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<ApplicationRow[]>({
    queryKey: queryKeys.applications.mine(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('open_call_applications')
        .select('id, match_request_id, applicant_id, applicant_partner_id, status, created_at')
        .eq('applicant_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicationRow[];
    },
    enabled: !!userId,
  });
}
