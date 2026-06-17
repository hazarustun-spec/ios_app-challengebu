import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';
import { invokeFunction } from '../lib/invoke-function';
import { useRealtimeChannel } from './use-realtime-channel';

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface SendMessageResponse {
  id: string;
  createdAt: string;
}

export function useMessages(conversationId: string | undefined) {
  const myUserId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();

  // Realtime subscription — only when we have a valid conversationId and user
  useRealtimeChannel({
    channelName: conversationId
      ? `messages:thread:${conversationId}`
      : 'messages:thread:none',
    enabled: !!conversationId && !!myUserId,
    configs: [
      {
        event: 'INSERT',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId ?? ''}`,
      },
    ],
    invalidateKeys: [
      queryKeys.conversations.messages(conversationId ?? ''),
      queryKeys.conversations.list(),
      queryKeys.conversations.unreadCount(),
    ] as const,
  });

  return useQuery<MessageRow[]>({
    queryKey: queryKeys.conversations.messages(conversationId ?? ''),
    enabled: !!conversationId && !!myUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, created_at, read_at')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      body,
    }: {
      conversationId: string;
      body: string;
    }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<SendMessageResponse>(
        'send-message',
        { conversationId, body },
        token,
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.conversations.messages(variables.conversationId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.conversations.list() });
      qc.invalidateQueries({ queryKey: queryKeys.conversations.unreadCount() });
    },
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.conversations.list() });
      qc.invalidateQueries({ queryKey: queryKeys.conversations.unreadCount() });
    },
  });
}
