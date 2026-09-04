import { useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
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
  deleted_at: string | null;
  /**
   * Client-only flag. `true` while an optimistic row is still in flight —
   * never present on rows that came back from the server.
   */
  pending?: boolean;
}

interface SendMessageResponse {
  id: string;
  createdAt: string;
}

/** Rows fetched per page. Keyset-paginated on `created_at`, newest first. */
export const MESSAGES_PAGE_SIZE = 50;

const MESSAGE_COLUMNS =
  'id, conversation_id, sender_id, body, created_at, read_at, deleted_at';

type MessagesPage = MessageRow[];
/** Shape TanStack stores under `queryKeys.conversations.messages(id)`. */
type MessagesCache = InfiniteData<MessagesPage, string | null>;

/**
 * Flattens the paginated cache into a single newest-first array.
 *
 * Pages overlap by one row on purpose (the cursor uses `lte`, not `lt`, so a
 * realtime-triggered refetch of page 0 can never open a gap at a page
 * boundary), so the boundary row is de-duplicated here by id.
 */
function flattenPages(data: MessagesCache | undefined): MessageRow[] {
  const out: MessageRow[] = [];
  const seen = new Set<string>();
  for (const page of data?.pages ?? []) {
    for (const row of page) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  return out;
}

/**
 * Paginated + realtime thread reader.
 *
 * Returns the raw infinite-query result plus `messages`: the flattened,
 * de-duplicated, NEWEST-FIRST list. That ordering is what an `inverted`
 * FlatList wants — index 0 renders at the bottom of the screen.
 */
export function useMessages(conversationId: string | undefined) {
  const myUserId = useAuthStore((s) => s.user?.id);

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
      {
        // Also catch UPDATEs so a "delete for everyone" tombstone (and read_at
        // flips) propagate to the other participant live.
        event: 'UPDATE',
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

  const query = useInfiniteQuery({
    queryKey: queryKeys.conversations.messages(conversationId ?? ''),
    enabled: !!conversationId && !!myUserId,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<MessagesPage> => {
      let q = supabase
        .from('messages')
        .select(MESSAGE_COLUMNS)
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PAGE_SIZE);
      // `lte` rather than `lt`: the cursor row is re-fetched as the first row
      // of the next page and de-duplicated client-side. Costs one duplicate
      // row per page but keeps the boundary row from disappearing when page 0
      // is refetched after a new message arrives.
      if (pageParam) q = q.lte('created_at', pageParam);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
    getNextPageParam: (lastPage: MessagesPage): string | null | undefined => {
      if (lastPage.length < MESSAGES_PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1]?.created_at ?? undefined;
    },
  });

  const messages = useMemo(
    () => flattenPages(query.data as MessagesCache | undefined),
    [query.data],
  );

  return { ...query, messages };
}

function makeOptimisticId(): string {
  return `optimistic-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

interface SendMessageVars {
  conversationId: string;
  body: string;
}

interface SendMessageContext {
  previous: MessagesCache | undefined;
  optimisticId: string;
}

/**
 * Sends a message and paints it in the thread immediately.
 *
 * `onMutate` prepends an optimistic row so the bubble appears before the
 * round-trip completes (the whole point — on 4G the old behaviour felt like
 * the tap did nothing). `onError` rolls the cache back, which is what the
 * blocked-user case hits: `send-message` returns 400, the stub disappears and
 * the caller's toast explains why. `onSettled` re-syncs either way.
 */
export function useSendMessage() {
  const qc = useQueryClient();

  return useMutation<
    SendMessageResponse,
    Error,
    SendMessageVars,
    SendMessageContext
  >({
    mutationFn: async ({ conversationId, body }) => {
      const token = useAuthStore.getState().session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı');
      return invokeFunction<SendMessageResponse>(
        'send-message',
        { conversationId, body },
        token,
      );
    },
    onMutate: async ({ conversationId, body }) => {
      const key = queryKeys.conversations.messages(conversationId);
      // Stop any in-flight refetch from overwriting the row we are about to
      // write into the cache.
      await qc.cancelQueries({ queryKey: key });

      const previous = qc.getQueryData<MessagesCache>(key);
      const optimisticId = makeOptimisticId();
      const row: MessageRow = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: useAuthStore.getState().user?.id ?? '',
        body,
        created_at: new Date().toISOString(),
        read_at: null,
        deleted_at: null,
        pending: true,
      };

      qc.setQueryData<MessagesCache>(key, (old) => {
        // Pages are newest-first and so are the rows inside each page, so the
        // newest message in the whole thread is pages[0][0].
        if (!old || old.pages.length === 0) {
          return { pages: [[row]], pageParams: [null] };
        }
        const pages = old.pages.slice();
        pages[0] = [row, ...pages[0]];
        return { ...old, pages };
      });

      return { previous, optimisticId };
    },
    onError: (_error, variables, context) => {
      if (!context) return;
      const key = queryKeys.conversations.messages(variables.conversationId);
      if (context.previous) {
        qc.setQueryData<MessagesCache>(key, context.previous);
        return;
      }
      // No snapshot to restore (first message in a thread that had never been
      // fetched): drop just the stub instead.
      qc.setQueryData<MessagesCache>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.filter((m) => m.id !== context.optimisticId),
          ),
        };
      });
    },
    // Moved off onSuccess so the thread, the inbox and the unread badge
    // re-sync after a failure too, not only after a success.
    onSettled: (_data, _error, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.conversations.messages(variables.conversationId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.conversations.list() });
      qc.invalidateQueries({ queryKey: queryKeys.conversations.unreadCount() });
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
    }: {
      messageId: string;
      conversationId: string;
    }) => {
      const { error } = await supabase.rpc('delete_message', {
        p_message_id: messageId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.conversations.messages(variables.conversationId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.conversations.list() });
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
