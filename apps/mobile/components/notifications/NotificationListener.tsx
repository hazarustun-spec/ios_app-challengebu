import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/query-keys';
import { useAuthStore } from '../../stores/auth-store';

export function NotificationListener() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    const scheduleInvalidate = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
        qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
      }, 250);
    };

    // Unique channel name per subscription. `removeChannel` (in cleanup) is
    // async, so on a fast remount / login→logout→login a stale channel with a
    // fixed topic can still be subscribed when the next mount calls
    // `supabase.channel(sameTopic)` — which returns that subscribed instance
    // and makes `.on()` throw "cannot add postgres_changes callbacks after
    // subscribe()". A unique suffix guarantees a fresh channel every time; the
    // server-side `recipient_id` filter is what actually scopes the data.
    const channel = supabase
      .channel(`notifications:${userId}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        scheduleInvalidate,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        scheduleInvalidate,
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return null;
}
