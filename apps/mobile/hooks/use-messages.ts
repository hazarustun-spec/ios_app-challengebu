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
import {
  useMessageOutboxStore,
  type OutboxMessage,
  type OutboxStatus,
} from '../stores/message-outbox-store';

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
  /**
   * Client-only. Set on rows that come from the outbox store rather than the
   * server: `sending` is in flight, `failed` is waiting for a retry tap.
   * Absent on every server row, so `!row.outboxStatus` means "has an id the
   * backend knows about".
   */
  outboxStatus?: OutboxStatus;
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

function outboxToRow(entry: OutboxMessage): MessageRow {
  return {
    id: entry.id,
    conversation_id: entry.conversationId,
    sender_id: entry.senderId,
    body: entry.body,
    created_at: entry.createdAt,
    read_at: null,
    deleted_at: null,
    pending: entry.status === 'sending',
    outboxStatus: entry.status,
  };
}

/**
 * Overlays the outbox on top of a server page, newest-first.
 *
 * The tricky part is the send round-trip: a realtime INSERT can invalidate and
 * refetch page 0 *before* the `send-message` response comes back, so for a beat
 * the real row and its still-`sending` outbox row are both in hand. Matching
 * them one-for-one (each server row can absorb at most one outbox row) hides
 * that flicker without collapsing the legitimate case of the same text sent
 * twice in a row. `failed` rows are never matched — they never reached the
 * server, so nothing on the server can stand in for them.
 */
function mergeOutbox(
  server: MessageRow[],
  outbox: OutboxMessage[],
): MessageRow[] {
  if (outbox.length === 0) return server;

  const absorbed = new Set<string>();
  const surviving: OutboxMessage[] = [];
  for (const entry of outbox) {
    if (entry.status !== 'sending') {
      surviving.push(entry);
      continue;
    }
    // The client clock can run slightly ahead of the DB's `now()`, so allow a
    // few seconds of slack on either side of the optimistic timestamp.
    const enqueuedAt = Date.parse(entry.createdAt);
    const twin = server.find(
      (row) =>
        !absorbed.has(row.id) &&
        row.sender_id === entry.senderId &&
        row.body === entry.body &&
        Date.parse(row.created_at) >= enqueuedAt - 5_000,
    );
    if (twin) {
      absorbed.add(twin.id);
      continue;
    }
    surviving.push(entry);
  }
  if (surviving.length === 0) return server;

  const pendingRows = surviving
    .map(outboxToRow)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  // Both sides are newest-first already; a linear merge keeps it that way
  // without re-sorting the whole (potentially long) server list every render.
  const out: MessageRow[] = [];
  let i = 0;
  let j = 0;
  while (i < pendingRows.length && j < server.length) {
    if (
      Date.parse(pendingRows[i]!.created_at) >=
      Date.parse(server[j]!.created_at)
    ) {
      out.push(pendingRows[i++]!);
    } else {
      out.push(server[j++]!);
    }
  }
  while (i < pendingRows.length) out.push(pendingRows[i++]!);
  while (j < server.length) out.push(server[j++]!);
  return out;
}

/**
 * Paginated + realtime thread reader.
 *
 * Returns the raw infinite-query result plus `messages`: the flattened,
 * de-duplicated, NEWEST-FIRST list with the conversation's outbox rows merged
 * in. That ordering is what an `inverted` FlatList wants — index 0 renders at
 * the bottom of the screen.
 *
 * The outbox rows are deliberately NOT in the query cache: that is the whole
 * reason a failed send now survives the `onSettled` invalidate.
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

  // Subscribe to the whole array (a stable reference) and narrow in a memo.
  // Returning `s.items.filter(...)` straight out of the selector would hand
  // zustand v5 a fresh array on every store read and loop the snapshot check.
  const outboxItems = useMessageOutboxStore((s) => s.items);
  const outboxForThread = useMemo(
    () =>
      conversationId
        ? outboxItems.filter((i) => i.conversationId === conversationId)
        : [],
    [outboxItems, conversationId],
  );

  const messages = useMemo(
    () =>
      mergeOutbox(
        flattenPages(query.data as MessagesCache | undefined),
        outboxForThread,
      ),
    [query.data, outboxForThread],
  );

  return { ...query, messages };
}

interface SendMessageVars {
  conversationId: string;
  body: string;
  /**
   * Set when re-sending a row that is already in the outbox. Omitted for a
   * fresh send, which enqueues its own row.
   */
  outboxId?: string;
}

interface SendMessageContext {
  outboxId: string;
}

/**
 * Sends a message and paints it in the thread immediately.
 *
 * The bubble comes from the outbox store, not from the query cache. `onMutate`
 * enqueues (or, on a retry, re-arms) the row so it appears before the
 * round-trip completes — on 4G the old, non-optimistic behaviour felt like the
 * tap had done nothing. On failure the row is flipped to `failed` and STAYS
 * there: that is the M2 change. M1 rolled the cache back and the bubble
 * vanished, and no cache-resident row could have survived `onSettled`'s
 * invalidate anyway. `onSuccess` drops the row once the real one exists.
 *
 * Pass `outboxId` to re-send an existing failed row instead of enqueueing a
 * second one.
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
    onMutate: ({ conversationId, body, outboxId }) => {
      const outbox = useMessageOutboxStore.getState();
      if (outboxId) {
        outbox.markSending(outboxId);
        return { outboxId };
      }
      return {
        outboxId: outbox.enqueue({
          conversationId,
          senderId: useAuthStore.getState().user?.id ?? '',
          body,
        }),
      };
    },
    onError: (error, _variables, context) => {
      if (!context) return;
      // The row stays on screen, faded, with a retry affordance. Nothing to
      // roll back in the cache — it was never written there.
      useMessageOutboxStore.getState().markFailed(context.outboxId, error.message);
    },
    onSuccess: (_data, _variables, context) => {
      // The real row is on its way in via the invalidate below (and usually
      // via realtime first). Drop the stand-in.
      if (context) useMessageOutboxStore.getState().remove(context.outboxId);
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
