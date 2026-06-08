import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';
import { useAuthStore } from '../stores/auth-store';

export interface HeadToHead {
  totalMatches: number;
  myWins: number;
  theirWins: number;
}

export function useHeadToHead(otherUserId: string | undefined) {
  const myId = useAuthStore((s) => s.user?.id);
  return useQuery<HeadToHead>({
    queryKey: queryKeys.headToHead.between(otherUserId ?? ''),
    queryFn: async () => {
      if (!myId || !otherUserId) return { totalMatches: 0, myWins: 0, theirWins: 0 };
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, team_a_player_ids, team_b_player_ids, winner_team, status
        `)
        .in('status', ['confirmed', 'voided'])
        .or(
          `and(team_a_player_ids.cs.{${myId}},team_b_player_ids.cs.{${otherUserId}}),` +
            `and(team_a_player_ids.cs.{${otherUserId}},team_b_player_ids.cs.{${myId}})`,
        );
      if (error) throw error;

      let myWins = 0;
      let theirWins = 0;
      for (const m of data ?? []) {
        if (m.winner_team === 'void' || m.winner_team === null) continue;
        const onA = (m.team_a_player_ids as string[]).includes(myId);
        const iWon = (onA && m.winner_team === 'a') || (!onA && m.winner_team === 'b');
        if (iWon) myWins += 1;
        else theirWins += 1;
      }
      return {
        totalMatches: (data ?? []).length,
        myWins,
        theirWins,
      };
    },
    enabled: !!myId && !!otherUserId,
  });
}
