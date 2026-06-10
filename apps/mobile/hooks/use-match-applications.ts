import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface MatchApplication {
  id: string;
  request_id: string;
  applicant_id: string;
  applicant: { first_name: string; last_name: string };
  note: string | null;
  applied_at: string;
}

/**
 * Plan 8 — Açık ilan (open call) başvuruları.
 *
 * `match_request_applications` tablosu, mevcut `open_call_applications`'tan
 * ayrı yeni bir yüzeydir (not alanı + atomik kabul RPC'si). Eski Edge
 * Function akışı geçiş döneminde bozulmadan kalıyor; yeni Plan 8 UI bu
 * hook'u kullanır.
 */
export function useMatchApplications(requestId: string | undefined) {
  return useQuery<MatchApplication[]>({
    queryKey: requestId
      ? queryKeys.matchApplications.byRequest(requestId)
      : [...queryKeys.matchApplications.all, 'disabled'],
    enabled: !!requestId,
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from('match_request_applications')
        .select(`
          id, request_id, applicant_id, note, applied_at,
          applicant:profiles!applicant_id(first_name, last_name)
        `)
        .eq('request_id', requestId)
        .order('applied_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MatchApplication[];
    },
  });
}

export function useApplyToOpenCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('match_request_applications').insert({
        request_id: input.requestId,
        applicant_id: user.id,
        note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
      qc.invalidateQueries({ queryKey: queryKeys.matchApplications.all });
    },
  });
}

export function useAcceptApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; applicantUserId: string }) => {
      const { error } = await supabase.rpc('accept_match_application', {
        p_request_id: input.requestId,
        p_applicant_user_id: input.applicantUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
      qc.invalidateQueries({ queryKey: queryKeys.openCalls.all });
      qc.invalidateQueries({ queryKey: queryKeys.matchApplications.all });
    },
  });
}
