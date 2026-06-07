import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface PlayerStats {
  totalMatches: number;
  ratedWins: number;
  ratedLosses: number;
  winPct: number;
  currentStreak: number;
  mostPlayedFormat: string | null;
  mostPlayedCourt: string | null;
  mostFacedOpponent: { name: string; matches: number } | null;
}

interface MatchSlim {
  id: string;
  format: string;
  is_rated: boolean;
  status: string;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  winner_team: 'a' | 'b' | 'void' | null;
  played_at: string;
  court: { name: string } | null;
}

export function useUserStats(userId: string | undefined, includePrivate: boolean) {
  return useQuery<PlayerStats>({
    queryKey: includePrivate
      ? queryKeys.stats.mine()
      : queryKeys.stats.forUser(userId ?? ''),
    queryFn: async () => {
      if (!userId) return EMPTY_STATS;
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, format, is_rated, status,
          team_a_player_ids, team_b_player_ids,
          winner_team, played_at,
          court:courts(name)
        `)
        .in('status', ['confirmed', 'voided'])
        .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`)
        .order('played_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const matches = ((data ?? []) as unknown) as MatchSlim[];

      let opponentName: { name: string; matches: number } | null = null;
      if (includePrivate) {
        const opponentIds = new Map<string, number>();
        for (const m of matches) {
          const onA = m.team_a_player_ids.includes(userId);
          const opps = onA ? m.team_b_player_ids : m.team_a_player_ids;
          for (const o of opps) opponentIds.set(o, (opponentIds.get(o) ?? 0) + 1);
        }
        if (opponentIds.size > 0) {
          const [topId, topCount] = [...opponentIds.entries()].sort((a, b) => b[1] - a[1])[0];
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', topId)
            .maybeSingle();
          opponentName = profile
            ? { name: `${profile.first_name} ${profile.last_name}`, matches: topCount }
            : null;
        }
      }

      return computeStats(matches, userId, opponentName);
    },
    enabled: !!userId,
  });
}

const EMPTY_STATS: PlayerStats = {
  totalMatches: 0,
  ratedWins: 0,
  ratedLosses: 0,
  winPct: 0,
  currentStreak: 0,
  mostPlayedFormat: null,
  mostPlayedCourt: null,
  mostFacedOpponent: null,
};

const FORMAT_LABELS: Record<string, string> = {
  bu_klasik: 'BÜ Klasik',
  hizli_tiebreak: 'Hızlı Tiebreak',
  pro_set_8: 'Pro Set 8',
  '3set_klasik': '3 Set Klasik',
};

function computeStats(
  matches: MatchSlim[],
  userId: string,
  opponent: { name: string; matches: number } | null,
): PlayerStats {
  let ratedWins = 0;
  let ratedLosses = 0;
  const formats = new Map<string, number>();
  const courts = new Map<string, number>();

  for (const m of matches) {
    const onA = m.team_a_player_ids.includes(userId);
    formats.set(m.format, (formats.get(m.format) ?? 0) + 1);
    const courtName = m.court?.name;
    if (courtName) courts.set(courtName, (courts.get(courtName) ?? 0) + 1);
    if (m.is_rated && m.winner_team !== 'void') {
      const won = (onA && m.winner_team === 'a') || (!onA && m.winner_team === 'b');
      if (won) ratedWins += 1;
      else ratedLosses += 1;
    }
  }

  const ratedTotal = ratedWins + ratedLosses;
  const winPct = ratedTotal === 0 ? 0 : Math.round((ratedWins / ratedTotal) * 100);

  let currentStreak = 0;
  for (const m of matches) {
    if (!m.is_rated || m.winner_team === 'void') continue;
    const onA = m.team_a_player_ids.includes(userId);
    const won = (onA && m.winner_team === 'a') || (!onA && m.winner_team === 'b');
    if (won) currentStreak += 1;
    else break;
  }

  return {
    totalMatches: matches.length,
    ratedWins,
    ratedLosses,
    winPct,
    currentStreak,
    mostPlayedFormat: topKey(formats, (k) => FORMAT_LABELS[k] ?? k),
    mostPlayedCourt: topKey(courts),
    mostFacedOpponent: opponent,
  };
}

function topKey(map: Map<string, number>, transform?: (k: string) => string): string | null {
  if (map.size === 0) return null;
  const [key] = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  return transform ? transform(key) : key;
}
