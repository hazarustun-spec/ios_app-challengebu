import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type LiveScore = {
  gamesA: number; gamesB: number; pointsA: number; pointsB: number;
  phase: 'ongoing' | 'void' | 'finished'; winner: 'a' | 'b' | null;
};

function fromRow(r: Record<string, unknown>): LiveScore {
  return {
    gamesA: Number(r.games_a ?? 0), gamesB: Number(r.games_b ?? 0),
    pointsA: Number(r.points_a ?? 0), pointsB: Number(r.points_b ?? 0),
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
    supabase.rpc('get_or_init_live_score', { p_match_id: matchId }).then(({ data, error: rpcError }) => {
      if (!active) return;
      if (rpcError) { setError(rpcError); return; }
      if (data) setScore(fromRow(data as Record<string, unknown>));
    });
    const channel = supabase
      .channel(`live_score_${matchId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'live_match_scores', filter: `match_id=eq.${matchId}` },
        (payload) => { if (active && payload.new) setScore(fromRow(payload.new as Record<string, unknown>)); })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [matchId]);

  const awardPoint = useCallback(async (side: 'a' | 'b') => {
    if (!matchId) return;
    const { data, error: rpcError } = await supabase.rpc('award_point', { p_match_id: matchId, p_side: side });
    if (rpcError) throw rpcError; // surfaced at the call site
    if (data) setScore(fromRow(data as Record<string, unknown>)); // optimistic; Realtime confirms
  }, [matchId]);

  // Undo the most recent point — server-authoritative (event-sourced), mirrors
  // awardPoint. Applies the returned row optimistically; Realtime confirms.
  const undoPoint = useCallback(async () => {
    if (!matchId) return;
    const { data, error: rpcError } = await supabase.rpc('undo_point', { p_match_id: matchId });
    if (rpcError) throw rpcError; // surfaced at the call site
    if (data) setScore(fromRow(data as Record<string, unknown>)); // optimistic; Realtime confirms
  }, [matchId]);

  return { score, error, awardPoint, undoPoint };
}
