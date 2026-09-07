// Outbox for messages that have been composed but not yet acknowledged by the
// server — Plan 8 / Messaging M2 "retry queue".
//
// Why a store instead of the query cache: M1 painted the optimistic bubble
// straight into the TanStack cache, so `onSettled`'s invalidate wiped a failed
// row on the very next refetch. Anything that has to outlive a refetch (and a
// cold start) has to live outside the cache. `useMessages` merges these rows
// on top of the server page, so a refetch can no longer touch them.
//
// Persistence: SecureStore, the same middleware pairing every other persisted
// store in this app uses (`ui-flags-store`, `onboarding-store`). Message drafts
// are not secrets, but there is no AsyncStorage in this project and adding a
// native module is off the table for an OTA release. SecureStore's payload
// limit (2048 bytes on the Android backing store) is respected by trimming the
// persisted slice — see `trimForPersist`.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export type OutboxStatus = 'sending' | 'failed';

export interface OutboxMessage {
  /** Client-generated id, `outbox-…`. Also the FlatList key for the bubble. */
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  /** ISO — used both for the bubble timestamp and for merge ordering. */
  createdAt: string;
  status: OutboxStatus;
  /** Last failure reason, for the toast / bubble hint. */
  error?: string;
}

interface MessageOutboxState {
  items: OutboxMessage[];
  /** Adds a row in `sending` state and returns its id. */
  enqueue: (input: {
    conversationId: string;
    senderId: string;
    body: string;
  }) => string;
  /** Flips a row back to `sending` (retry) — no-op if the id is gone. */
  markSending: (id: string) => void;
  markFailed: (id: string, error?: string) => void;
  remove: (id: string) => void;
  /** Drops every row of a thread (used when a thread is left/blocked). */
  clearConversation: (conversationId: string) => void;
  /** Drops everything — sign-out, so the next account starts clean. */
  clear: () => void;
  /** True once the persisted slice has been read back from storage. */
  _hydrated: boolean;
}

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/** Hard cap on rows kept around, oldest dropped first. */
const MAX_ITEMS = 30;
/** Keep the serialised slice comfortably under SecureStore's 2048-byte limit. */
const MAX_PERSISTED_BYTES = 1800;

function makeOutboxId(): string {
  return `outbox-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/**
 * Newest-first trim so an outbox that somehow grows large still persists — the
 * most recent unsent messages are the ones the user is actually looking at.
 */
function trimForPersist(items: OutboxMessage[]): OutboxMessage[] {
  const newestFirst = items
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const kept: OutboxMessage[] = [];
  for (const item of newestFirst) {
    kept.push(item);
    if (JSON.stringify(kept).length > MAX_PERSISTED_BYTES) {
      kept.pop();
      break;
    }
  }
  // Restore insertion order for the rows that survived.
  const keptIds = new Set(kept.map((i) => i.id));
  return items.filter((i) => keptIds.has(i.id));
}

export const useMessageOutboxStore = create<MessageOutboxState>()(
  persist(
    (set) => ({
      items: [],
      _hydrated: false,

      enqueue: ({ conversationId, senderId, body }) => {
        const id = makeOutboxId();
        const row: OutboxMessage = {
          id,
          conversationId,
          senderId,
          body,
          createdAt: new Date().toISOString(),
          status: 'sending',
        };
        set((s) => ({ items: [...s.items, row].slice(-MAX_ITEMS) }));
        return id;
      },

      markSending: (id) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, status: 'sending', error: undefined } : i,
          ),
        })),

      markFailed: (id, error) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, status: 'failed', error } : i,
          ),
        })),

      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      clearConversation: (conversationId) =>
        set((s) => ({
          items: s.items.filter((i) => i.conversationId !== conversationId),
        })),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'message-outbox',
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({ items: trimForPersist(s.items) }),
      onRehydrateStorage: () => (state) => {
        // A row that was still `sending` when the app died has no mutation left
        // to resolve it, so it would otherwise sit spinning forever. Relaunch
        // presents it as failed — one tap re-sends it.
        useMessageOutboxStore.setState({
          items: (state?.items ?? []).map((i) =>
            i.status === 'sending' ? { ...i, status: 'failed' as const } : i,
          ),
          _hydrated: true,
        });
      },
    },
  ),
);
