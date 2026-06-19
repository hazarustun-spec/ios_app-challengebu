import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface MatchApplication {
  id: string;
  request_id: string;
  applicant_id: string;
  applicant_partner_id: string | null;
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
          id, request_id, applicant_id, applicant_partner_id, note, applied_at,
          applicant:profiles!applicant_id(first_name, last_name)
        `)
        .eq('request_id', requestId)
        .order('applied_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MatchApplication[];
    },
  });
}

/**
 * Apply to a Plan 8 open-call `match_request`. The new hook name avoids the
 * collision with the legacy `useApplyToOpenCall` (which targets the legacy
 * `open_call_applications` table + Edge Function flow).
 */
export function useApplyToMatchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; note?: string; partnerId?: string }) => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase.from('match_request_applications').insert({
        request_id: input.requestId,
        applicant_id: userId,
        applicant_partner_id: input.partnerId ?? null,
        note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Refresh both the per-request applicant list and the caller's own
      // "applied" set used by the İlanlar feed.
      qc.invalidateQueries({ queryKey: queryKeys.matchApplications.all });
    },
  });
}

/** The current user's own open-call applications (new `match_request_applications`). */
export function useMyMatchApplications() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<{ request_id: string }[]>({
    queryKey: queryKeys.matchApplications.mine(),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('match_request_applications')
        .select('request_id')
        .eq('applicant_id', userId);
      if (error) throw error;
      return (data ?? []) as { request_id: string }[];
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
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.matchApplications.byRequest(variables.requestId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.matchRequests.all });
    },
  });
}
