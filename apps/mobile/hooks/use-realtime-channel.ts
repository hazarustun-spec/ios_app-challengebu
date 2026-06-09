import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Generic Supabase Realtime subscription helper.
 *
 * Subscribes to one or more `postgres_changes` events on a single channel,
 * and on each event invalidates the supplied TanStack Query keys (debounced
 * at `debounceMs`, default 250 ms) so the UI refetches at most once per burst.
 *
 * ## Filter limitations
 *
 * Supabase Realtime `filter:` only supports scalar operators:
 *   `eq.`, `neq.`, `gt.`, `gte.`, `lt.`, `lte.`, `in.`
 *
 * Array-containment (`cs.` / `cd.`) is NOT supported by the Realtime layer
 * even though it works for regular PostgREST reads. That means we cannot
 * server-side filter a channel by membership in a `uuid[]` column like
 * `matches.team_a_player_ids` / `team_b_player_ids`. Wirings that need that
 * kind of scope must subscribe to ALL events on the table and let RLS scope
 * the subsequent SELECT — chatty but correct.
 */
export interface PostgresChangeConfig {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
}

interface Params {
  channelName: string;
  enabled: boolean;
  configs: PostgresChangeConfig[];
  invalidateKeys: readonly (readonly unknown[])[];
  debounceMs?: number;
  onEvent?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

export function useRealtimeChannel({
  channelName,
  enabled,
  configs,
  invalidateKeys,
  debounceMs = 250,
  onEvent,
}: Params) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || configs.length === 0) return;
    const schedule = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      onEvent?.(payload);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        for (const k of invalidateKeys) {
          qc.invalidateQueries({ queryKey: k });
        }
      }, debounceMs);
    };

    let channel = supabase.channel(channelName);
    for (const cfg of configs) {
      channel = channel.on(
        'postgres_changes',
        {
          event: cfg.event,
          schema: cfg.schema ?? 'public',
          table: cfg.table,
          ...(cfg.filter ? { filter: cfg.filter } : {}),
        },
        schedule,
      );
    }
    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [channelName, enabled, JSON.stringify(configs), JSON.stringify(invalidateKeys), qc, debounceMs, onEvent]);
}
