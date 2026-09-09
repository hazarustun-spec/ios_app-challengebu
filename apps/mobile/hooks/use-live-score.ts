import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * The live score as the SERVER holds it: `unitsA` is always team A's count and
 * `unitsB` always team B's, whichever team the reader happens to be on.
 *
 * That absoluteness is the whole point. The previous shape called these
 * `gamesA`/`gamesB` and the score screen read them as "mine"/"theirs", which is
 * only true for a team-A player: a team-B player saw the opponent's score under
 * their own name, and the "+" button under "Sen" awarded to team A. Two phones
 * showed mirrored scores for the same match and their submissions never matched.
 * Callers must map through their own side — see `mySide` in
 * app/match/[id]/score.tsx.
 *
 * "Units" rather than "games" because the unit depends on the format: games in
 * Klasik and Pro Set, points in Hızlı Tiebreak, sets in 3 Set Klasik. See
 * lib/live-format.ts.
 */
export type LiveScore = {
  unitsA: number;
  unitsB: number;
  phase: 'ongoing' | 'void' | 'finished';
  winner: 'a' | 'b' | null;
};

function fromRow(r: Record<string, unknown>): LiveScore {
  return {
    // The columns keep their historical `games_*` names; migration
    // 20260909000001 repurposed them to hold whichever unit the format counts.
    unitsA: Number(r.games_a ?? 0),
    unitsB: Number(r.games_b ?? 0),
    phase: (r.phase as LiveScore['phase']) ?? 'ongoing',
    winner: (r.winner as LiveScore['winner']) ?? null,
  };
}

export function useLiveScore(matchId: string | undefined) {
  const [score, setScore] = useState<LiveScore | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let active = true;
    // Initial load — shows lock-screen changes made while the app was closed.
    supabase
      .rpc('get_or_init_live_score', { p_match_id: matchId })
      .then(({ data, error: rpcError }) => {
        if (!active) return;
        if (rpcError) {
          setError(rpcError);
          return;
        }
        if (data) setScore(fromRow(data as Record<string, unknown>));
      });
    const channel = supabase
      .channel(`live_score_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_match_scores',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (active && payload.new) setScore(fromRow(payload.new as Record<string, unknown>));
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  /** Give one unit to a TEAM side — 'a' and 'b' are the match's fixed sides. */
  const awardUnit = useCallback(
    async (side: 'a' | 'b') => {
      if (!matchId) return;
      const { data, error: rpcError } = await supabase.rpc('award_unit', {
        p_match_id: matchId,
        p_side: side,
      });
      if (rpcError) throw rpcError; // surfaced at the call site
      if (data) setScore(fromRow(data as Record<string, unknown>)); // optimistic; Realtime confirms
    },
    [matchId],
  );

  /**
   * Take back the last unit given to ONE side. Per-side on purpose: with a
   * "−" control next to each player, "take back mine" has to mean mine. The
   * old undo reversed whichever side scored last, so tapping "−" on your own
   * row could remove your opponent's game.
   */
  const revokeUnit = useCallback(
    async (side: 'a' | 'b') => {
      if (!matchId) return;
      const { data, error: rpcError } = await supabase.rpc('revoke_unit', {
        p_match_id: matchId,
        p_side: side,
      });
      if (rpcError) throw rpcError; // surfaced at the call site
      if (data) setScore(fromRow(data as Record<string, unknown>)); // optimistic; Realtime confirms
    },
    [matchId],
  );

  return { score, error, awardUnit, revokeUnit };
}
