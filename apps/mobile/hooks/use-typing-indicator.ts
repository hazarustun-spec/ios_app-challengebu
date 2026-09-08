// "Yazıyor…" for a message thread — Messaging M2.
//
// Uses Supabase Realtime *broadcast*, not postgres_changes: a keystroke is
// worthless a second later, so writing one to Postgres (and paying an INSERT,
// a WAL record, a replication hop and the retention cost) to describe
// something already stale is the wrong trade. Broadcast is ephemeral by
// design — nothing is stored and nothing is replayed to a client that joins
// late, which is exactly the semantics of a typing indicator.
//
// Cost: one extra Realtime channel per OPEN thread — not per user. It exists
// only while `messages/[conversationId]` is mounted, so it does not change the
// per-user channel budget in docs/capacity-analysis-2026-09.md, which counts
// channels held app-wide.
//
// Protocol (both directions, same shape):
//   event 'typing' → { userId, typing: boolean }
// `typing: false` is best-effort. The sender emits one on send and on unmount,
// but a crash, a dropped socket or a backgrounded app emits nothing, so the
// receiver must never rely on it — hence the expiry timer below.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/** Don't broadcast more than once per this window while the user types. */
const THROTTLE_MS = 2000;

/**
 * Clear the indicator this long after the last received `typing: true`.
 * Must exceed THROTTLE_MS by enough that a steadily typing peer never blinks
 * off between their own broadcasts.
 */
const EXPIRY_MS = 5000;

interface Result {
  /** True while the other participant is typing. */
  isOtherTyping: boolean;
  /** Call on every keystroke — throttled internally. */
  notifyTyping: () => void;
  /** Call when the draft is sent or cleared. */
  notifyStopped: () => void;
}

export function useTypingIndicator(
  conversationId: string | undefined,
  myUserId: string | undefined,
): Result {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentAt = useRef(0);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || !myUserId) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      // Without this the sender does not receive its own broadcasts, which is
      // what we want: our own keystrokes must not light up our own indicator.
      config: { broadcast: { self: false } },
    });

    channel.on(
      'broadcast',
      { event: 'typing' },
      ({ payload }: { payload?: { userId?: string; typing?: boolean } }) => {
        // A conversation has exactly two participants, but guard anyway —
        // a stray echo of our own id must not toggle the indicator.
        if (!payload || payload.userId === myUserId) return;

        if (expiryTimer.current) clearTimeout(expiryTimer.current);

        if (payload.typing === false) {
          setIsOtherTyping(false);
          return;
        }
        setIsOtherTyping(true);
        expiryTimer.current = setTimeout(() => setIsOtherTyping(false), EXPIRY_MS);
      },
    );

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      // Best-effort courtesy stop so the peer's bubble clears immediately
      // instead of waiting out EXPIRY_MS.
      void channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: myUserId, typing: false },
      });
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsOtherTyping(false);
    };
  }, [conversationId, myUserId]);

  const notifyTyping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || !myUserId) return;
    const now = Date.now();
    if (now - lastSentAt.current < THROTTLE_MS) return;
    lastSentAt.current = now;
    void ch.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: myUserId, typing: true },
    });
  }, [myUserId]);

  const notifyStopped = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || !myUserId) return;
    // Reset the throttle too: the next keystroke after a send should light the
    // peer's indicator right away rather than waiting out the old window.
    lastSentAt.current = 0;
    void ch.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: myUserId, typing: false },
    });
  }, [myUserId]);

  return { isOtherTyping, notifyTyping, notifyStopped };
}
