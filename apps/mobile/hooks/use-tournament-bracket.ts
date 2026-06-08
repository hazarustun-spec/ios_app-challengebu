import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface BracketSlot {
  id: string;
  round: number;
  bracket_position: number;
  seed_a: number | null;
  seed_b: number | null;
  match_id: string | null;
  match_status: 'awaiting_confirmation' | 'confirmed' | 'disputed' | 'voided' | null;
  winner_team: 'a' | 'b' | 'void' | null;
  score_team_a: number | null;
  score_team_b: number | null;
  player_a_name: string | null;
  player_b_name: string | null;
}

export interface TournamentBracket {
  id: string;
  season_id: string;
  category: string;
  bracket_size: number;
  status: 'seeded' | 'in_progress' | 'completed';
  slots: BracketSlot[];
  seedToPlayer: Record<number, { user_id: string; name: string }>;
}

interface RawBracketSlot {
  id: string;
  round: number;
  bracket_position: number;
  seed_a: number | null;
  seed_b: number | null;
  match_id: string | null;
  match: {
    status: BracketSlot['match_status'];
    winner_team: BracketSlot['winner_team'];
    score_team_a: number | null;
    score_team_b: number | null;
  } | null;
}

interface StandingRow {
  rank: number;
  profile_id: string;
  profile: { first_name: string; last_name: string } | null;
}

export function useTournamentBracket(tournamentId: string | undefined) {
  return useQuery<TournamentBracket | null>({
    queryKey: tournamentId
      ? queryKeys.tournaments.bracket(tournamentId)
      : queryKeys.tournaments.all,
    queryFn: async () => {
      if (!tournamentId) return null;
      const { data: tournament, error: tErr } = await supabase
        .from('tournaments')
        .select('id, season_id, category, bracket_size, status')
        .eq('id', tournamentId)
        .single();
      if (tErr) throw tErr;
      if (!tournament) return null;

      const { data: rawSlots, error: sErr } = await supabase
        .from('tournament_matches')
        .select(`
          id, round, bracket_position, seed_a, seed_b, match_id,
          match:matches(status, winner_team, score_team_a, score_team_b)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('bracket_position', { ascending: true });
      if (sErr) throw sErr;

      const { data: standings, error: stErr } = await supabase
        .from('season_standings')
        .select(`
          rank, profile_id,
          profile:profiles!season_standings_profile_id_fkey(first_name, last_name)
        `)
        .eq('season_id', tournament.season_id)
        .eq('category', tournament.category)
        .lte('rank', tournament.bracket_size);
      if (stErr) throw stErr;

      const seedToPlayer: Record<number, { user_id: string; name: string }> = {};
      for (const s of ((standings ?? []) as unknown as StandingRow[])) {
        const name = s.profile ? `${s.profile.first_name} ${s.profile.last_name}` : '—';
        seedToPlayer[s.rank] = { user_id: s.profile_id, name };
      }

      const slots: BracketSlot[] = ((rawSlots ?? []) as unknown as RawBracketSlot[]).map((r) => ({
        id: r.id,
        round: r.round,
        bracket_position: r.bracket_position,
        seed_a: r.seed_a,
        seed_b: r.seed_b,
        match_id: r.match_id,
        match_status: r.match?.status ?? null,
        winner_team: r.match?.winner_team ?? null,
        score_team_a: r.match?.score_team_a ?? null,
        score_team_b: r.match?.score_team_b ?? null,
        player_a_name: r.seed_a !== null ? seedToPlayer[r.seed_a]?.name ?? null : null,
        player_b_name: r.seed_b !== null ? seedToPlayer[r.seed_b]?.name ?? null : null,
      }));

      return {
        id: tournament.id,
        season_id: tournament.season_id,
        category: tournament.category,
        bracket_size: tournament.bracket_size,
        status: tournament.status,
        slots,
        seedToPlayer,
      };
    },
    enabled: !!tournamentId,
  });
}
