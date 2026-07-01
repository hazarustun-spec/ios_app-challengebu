import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export interface BlockedUser {
  blockedId: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

const BLOCKED_KEY = ['moderation', 'blocked-users'] as const;

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ blockedId }: BlockUserInput) => {
      const myUserId = useAuthStore.getState().user?.id;
      if (!myUserId) throw new Error('Oturum bulunamadı');

      const { error } = await supabase
        .from('user_blocks')
        .insert({ blocker_id: myUserId, blocked_id: blockedId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BLOCKED_KEY }),
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

/** The current user's blocked list (RLS scopes user_blocks to blocker_id = me). */
export function useBlockedUsers() {
  const myUserId = useAuthStore((s) => s.user?.id);
  return useQuery<BlockedUser[]>({
    queryKey: [...BLOCKED_KEY, myUserId],
    enabled: !!myUserId,
    queryFn: async () => {
      const { data: blocks, error } = await supabase
        .from('user_blocks')
        .select('blocked_id, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = (blocks ?? []).map((b) => b.blocked_id as string);
      if (ids.length === 0) return [];

      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', ids);
      if (pErr) throw pErr;

      const byId = new Map(
        (profs ?? []).map((p) => [p.user_id as string, p]),
      );
      return (blocks ?? []).map((b) => {
        const p = byId.get(b.blocked_id as string);
        const name = p
          ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Kullanıcı'
          : 'Kullanıcı';
        return {
          blockedId: b.blocked_id as string,
          name,
          avatarUrl: (p?.avatar_url as string | null) ?? null,
          createdAt: b.created_at as string,
        };
      });
    },
  });
}

/** Remove a block (unblock). */
export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ blockedId }: BlockUserInput) => {
      const myUserId = useAuthStore.getState().user?.id;
      if (!myUserId) throw new Error('Oturum bulunamadı');

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', myUserId)
        .eq('blocked_id', blockedId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BLOCKED_KEY }),
  });
}
