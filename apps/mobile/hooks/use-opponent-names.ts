// hooks/use-opponent-names.ts — Resolver hook that batch-fetches the active
// player roster once and exposes a `resolve(match)` function to extract
// opponent display names without triggering per-card network requests.

import { useMemo } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { formatOpponentName, opponentIds } from '../lib/match-opponent';
import { usePlayers, type PlayerRow } from './use-players';
import type { MatchLike } from '../lib/match-opponent';

export interface OpponentInfo {
  /** All opponent player IDs (1 for singles, 2 for doubles). */
  ids: string[];
  /** Display label: "Berk Aydın" (singles) or "Ali & Can" (doubles). */
  name: string;
  /** First opponent's user_id — used to look up an Avatar. Null if unknown. */
  primaryId: string | null;
  /** First opponent's first name — used as Avatar name prop fallback. */
  primaryName: string;
}

export interface UseOpponentNamesReturn {
  isLoading: boolean;
  resolve(match: MatchLike): OpponentInfo;
}

export function useOpponentNames(): UseOpponentNamesReturn {
  const myId = useAuthStore((s) => s.user?.id);
  const { data: players, isLoading } = usePlayers();

  // Build a fast lookup map from the roster
  const playerMap = useMemo<Map<string, PlayerRow>>(() => {
    const m = new Map<string, PlayerRow>();
    for (const p of players ?? []) {
      m.set(p.user_id, p);
    }
    return m;
  }, [players]);

  function resolve(match: MatchLike): OpponentInfo {
    const ids = opponentIds(match, myId ?? '');

    const resolved = ids.map((id) => playerMap.get(id)).filter(Boolean) as PlayerRow[];

    const name = isLoading || resolved.length === 0
      ? 'Rakip'
      : formatOpponentName(resolved);

    const primaryId = ids[0] ?? null;
    const firstPlayer = primaryId ? playerMap.get(primaryId) : undefined;
    const primaryName = firstPlayer
      ? `${firstPlayer.first_name} ${firstPlayer.last_name}`
      : 'Rakip';

    return { ids, name, primaryId, primaryName };
  }

  return { isLoading, resolve };
}
