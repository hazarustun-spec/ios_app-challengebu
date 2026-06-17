import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export interface BlockUserInput {
  blockedId: string;
}

export interface ReportUserInput {
  reportedId: string;
  reason: string;
  messageId?: string;
}

export function useBlockUser() {
  return useMutation({
    mutationFn: async ({ blockedId }: BlockUserInput) => {
      const myUserId = useAuthStore.getState().user?.id;
      if (!myUserId) throw new Error('Oturum bulunamadı');

      const { error } = await supabase
        .from('user_blocks')
        .insert({ blocker_id: myUserId, blocked_id: blockedId });
      if (error) throw error;
    },
  });
}

export function useReportUser() {
  return useMutation({
    mutationFn: async ({ reportedId, reason, messageId }: ReportUserInput) => {
      const myUserId = useAuthStore.getState().user?.id;
      if (!myUserId) throw new Error('Oturum bulunamadı');

      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: myUserId,
          reported_id: reportedId,
          reason,
          ...(messageId !== undefined ? { message_id: messageId } : {}),
        });
      if (error) throw error;
    },
  });
}
