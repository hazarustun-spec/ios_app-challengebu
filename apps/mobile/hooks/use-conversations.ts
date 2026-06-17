import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface ConversationListItem {
  id: string;
  otherUserId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  lastPreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface ConversationRow {
  id: string;
  request_id: string | null;
  participant_low: string;
  participant_high: string;
  last_message_at: string | null;
  last_message_preview: string | null;
}

interface ProfileRow {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

interface UnreadRow {
  conversation_id: string;
}

export function useConversations() {
  const myUserId = useAuthStore((s) => s.user?.id);

  return useQuery<ConversationListItem[]>({
    queryKey: queryKeys.conversations.list(),
    enabled: !!myUserId,
    queryFn: async () => {
      if (!myUserId) return [];

      // 1. Fetch all conversations where I am a participant
      const { data: convRows, error: convError } = await supabase
        .from('conversations')
        .select('id, request_id, participant_low, participant_high, last_message_at, last_message_preview')
        .or(`participant_low.eq.${myUserId},participant_high.eq.${myUserId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (convError) throw convError;
      const conversations = (convRows ?? []) as ConversationRow[];

      if (conversations.length === 0) return [];

      // 2. Determine the other participant for each conversation
      const otherUserIds = conversations.map((c) =>
        c.participant_low === myUserId ? c.participant_high : c.participant_low,
      );
      const uniqueOtherIds = [...new Set(otherUserIds)];

      // 3. Batch-fetch public_profiles for all other participants
      const { data: profileRows, error: profileError } = await supabase
        .from('public_profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', uniqueOtherIds);

      if (profileError) throw profileError;
      const profileMap = new Map<string, ProfileRow>();
      for (const p of (profileRows ?? []) as ProfileRow[]) {
        profileMap.set(p.user_id, p);
      }

      // 4. Batch-fetch all unread messages across these conversations in one query
      const convIds = conversations.map((c) => c.id);
      const { data: unreadRows, error: unreadError } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .neq('sender_id', myUserId)
        .is('read_at', null);

      if (unreadError) throw unreadError;

      // 5. Group unread counts client-side
      const unreadCountMap = new Map<string, number>();
      for (const row of (unreadRows ?? []) as UnreadRow[]) {
        unreadCountMap.set(row.conversation_id, (unreadCountMap.get(row.conversation_id) ?? 0) + 1);
      }

      // 6. Assemble the result
      return conversations.map((c, idx) => {
        const otherId = otherUserIds[idx];
        const profile = profileMap.get(otherId);
        const otherName = profile
          ? `${profile.first_name} ${profile.last_name}`.trim()
          : otherId;
        return {
          id: c.id,
          otherUserId: otherId,
          otherName,
          otherAvatarUrl: profile?.avatar_url ?? null,
          lastPreview: c.last_message_preview ?? null,
          lastMessageAt: c.last_message_at ?? null,
          unreadCount: unreadCountMap.get(c.id) ?? 0,
        } satisfies ConversationListItem;
      });
    },
  });
}

export function useUnreadMessageCount() {
  const myUserId = useAuthStore((s) => s.user?.id);

  return useQuery<number>({
    queryKey: queryKeys.conversations.unreadCount(),
    enabled: !!myUserId,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('unread_message_count');
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });
}
