import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

const DOUBLES_CATEGORIES = ['erkek_cift', 'kadin_cift', 'karma_cift', 'open_cift'];

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
  seedToLabel: Record<number, string>;
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

interface SinglesStandingRow {
  rank: number;
  profile: { first_name: string; last_name: string } | null;
}

interface DoublesTeamRow {
  rank: number;
  player_a: { first_name: string } | null;
  player_b: { first_name: string } | null;
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
        .maybeSingle();
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

      const seedToLabel = DOUBLES_CATEGORIES.includes(tournament.category)
        ? await fetchDoublesSeedLabels(tournament.season_id, tournament.category, tournament.bracket_size)
        : await fetchSinglesSeedLabels(tournament.season_id, tournament.category, tournament.bracket_size);

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
        player_a_name: r.seed_a !== null ? seedToLabel[r.seed_a] ?? null : null,
        player_b_name: r.seed_b !== null ? seedToLabel[r.seed_b] ?? null : null,
      }));

      return {
        id: tournament.id,
        season_id: tournament.season_id,
        category: tournament.category,
        bracket_size: tournament.bracket_size,
        status: tournament.status,
        slots,
        seedToLabel,
      };
    },
    enabled: !!tournamentId,
  });
}

async function fetchSinglesSeedLabels(
  seasonId: string,
  category: string,
  bracketSize: number,
): Promise<Record<number, string>> {
  const { data } = await supabase
    .from('season_standings')
    .select(`
      rank,
      profile:public_profiles!season_standings_profile_id_fkey(first_name, last_name)
    `)
    .eq('season_id', seasonId)
    .eq('category', category)
    .lte('rank', bracketSize);

  const labels: Record<number, string> = {};
  for (const s of ((data ?? []) as unknown as SinglesStandingRow[])) {
    labels[s.rank] = s.profile ? `${s.profile.first_name} ${s.profile.last_name}` : '—';
  }
  return labels;
}

async function fetchDoublesSeedLabels(
  seasonId: string,
  category: string,
  bracketSize: number,
): Promise<Record<number, string>> {
  const { data } = await supabase
    .from('season_doubles_teams')
    .select(`
      rank,
      player_a:public_profiles!season_doubles_teams_player_a_id_fkey(first_name),
      player_b:public_profiles!season_doubles_teams_player_b_id_fkey(first_name)
    `)
    .eq('season_id', seasonId)
    .eq('category', category)
    .lte('rank', bracketSize);

  const labels: Record<number, string> = {};
  for (const t of ((data ?? []) as unknown as DoublesTeamRow[])) {
    const a = t.player_a?.first_name ?? '?';
    const b = t.player_b?.first_name ?? '?';
    labels[t.rank] = `${a} / ${b}`;
  }
  return labels;
}
