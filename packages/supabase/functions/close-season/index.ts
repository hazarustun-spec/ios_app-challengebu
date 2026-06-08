import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ seasonId: z.string().uuid() });

const SEASONAL_BADGE_CODES = [
  'loyalty_first_season',
  'season_ladder_top10',
  'season_ladder_top3',
  'season_champion',
  'season_finalist',
  'season_semifinalist',
] as const;

interface MatchRow {
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  winner_team: 'a' | 'b' | 'void' | null;
}

interface TournamentMatchSlot {
  match: MatchRow | null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: season } = await supa.from('seasons').select('*').eq('id', parsed.data.seasonId).maybeSingle();
    if (!season) return errorResponse('Season not found', 404);
    if (season.status === 'closed') return errorResponse('Season already closed', 409);

    // 1. Soft-reset ELO across all categories.
    const { data: ratings } = await supa.from('elo_ratings').select('id, rating');
    for (const r of ratings ?? []) {
      const newRating = Math.round((r.rating + 1200) / 2);
      await supa.from('elo_ratings').update({ rating: newRating, matches_played: 0 }).eq('id', r.id);
    }

    // 2. Resolve badge IDs by code (we only insert the codes we recognise).
    const { data: catalog } = await supa
      .from('badges')
      .select('id, code')
      .in('code', [...SEASONAL_BADGE_CODES]);
    const badgeByCode = new Map<string, string>();
    for (const b of catalog ?? []) badgeByCode.set(b.code as string, b.id as string);

    // 3. Award seasonal badges based on standings + finished tournament results.
    const badgesAwarded = await awardSeasonalBadges(supa, season, badgeByCode);

    // 4. Flip season status to closed.
    await supa.from('seasons').update({ status: 'closed' }).eq('id', season.id);

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'close_season',
      entity_type: 'season',
      entity_id: season.id,
      details: { ratingsReset: ratings?.length ?? 0, badgesAwarded },
    });

    return jsonResponse({
      status: 'closed',
      ratingsReset: ratings?.length ?? 0,
      badgesAwarded,
    });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});

async function awardSeasonalBadges(
  supa: ReturnType<typeof getServiceClient>,
  season: { id: string; starts_at: string; ends_at: string },
  badgeByCode: Map<string, string>,
): Promise<number> {
  // Collect everyone who played a confirmed/voided match in the season window.
  const { data: matchesInSeason } = await supa
    .from('matches')
    .select('team_a_player_ids, team_b_player_ids')
    .gte('played_at', season.starts_at)
    .lte('played_at', season.ends_at)
    .in('status', ['confirmed', 'voided']);

  const participants = new Set<string>();
  for (const m of matchesInSeason ?? []) {
    for (const id of (m.team_a_player_ids ?? []) as string[]) participants.add(id);
    for (const id of (m.team_b_player_ids ?? []) as string[]) participants.add(id);
  }

  // loyalty_first_season: anyone who participated this season and has never held it.
  const firstSeasonBadgeId = badgeByCode.get('loyalty_first_season');
  const firstSeasonOwners = new Set<string>();
  if (firstSeasonBadgeId) {
    const { data: existing } = await supa
      .from('user_badges')
      .select('profile_id')
      .eq('badge_id', firstSeasonBadgeId);
    for (const r of existing ?? []) firstSeasonOwners.add(r.profile_id as string);
  }

  // Standings: top 10 and top 3 across every category (a player in two cats
  // still only gets one badge of each code).
  const { data: standings } = await supa
    .from('season_standings')
    .select('profile_id, rank')
    .eq('season_id', season.id);
  const top10 = new Set<string>();
  const top3 = new Set<string>();
  for (const s of standings ?? []) {
    const id = s.profile_id as string;
    if ((s.rank as number) <= 10) top10.add(id);
    if ((s.rank as number) <= 3) top3.add(id);
  }

  // Doubles standings use season_doubles_teams; top10/top3 for doubles too.
  const { data: doublesStandings } = await supa
    .from('season_doubles_teams')
    .select('player_a_id, player_b_id, rank')
    .eq('season_id', season.id);
  for (const t of doublesStandings ?? []) {
    if ((t.rank as number) <= 10) {
      top10.add(t.player_a_id as string);
      top10.add(t.player_b_id as string);
    }
    if ((t.rank as number) <= 3) {
      top3.add(t.player_a_id as string);
      top3.add(t.player_b_id as string);
    }
  }

  // Tournament outcomes: champion / finalist / semifinalist.
  const champions = new Set<string>();
  const finalists = new Set<string>();
  const semifinalists = new Set<string>();

  const { data: tournaments } = await supa
    .from('tournaments')
    .select('id, bracket_size, status')
    .eq('season_id', season.id);

  for (const t of tournaments ?? []) {
    if (t.status !== 'completed') continue;
    const finalRound = (t.bracket_size as number) === 4 ? 2 : 3;
    const sfRound = finalRound - 1;

    const { data: finalMatch } = await supa
      .from('tournament_matches')
      .select('match:matches(team_a_player_ids, team_b_player_ids, winner_team)')
      .eq('tournament_id', t.id)
      .eq('round', finalRound)
      .eq('bracket_position', 1)
      .maybeSingle();
    const fm = (finalMatch as TournamentMatchSlot | null)?.match ?? null;
    if (fm) {
      if (fm.winner_team === 'a') {
        for (const id of fm.team_a_player_ids) champions.add(id);
        for (const id of fm.team_b_player_ids) finalists.add(id);
      } else if (fm.winner_team === 'b') {
        for (const id of fm.team_b_player_ids) champions.add(id);
        for (const id of fm.team_a_player_ids) finalists.add(id);
      }
    }

    const { data: sfMatches } = await supa
      .from('tournament_matches')
      .select('match:matches(team_a_player_ids, team_b_player_ids, winner_team)')
      .eq('tournament_id', t.id)
      .eq('round', sfRound);
    for (const slot of (sfMatches ?? []) as unknown as TournamentMatchSlot[]) {
      const m = slot.match;
      if (!m) continue;
      if (m.winner_team === 'a') {
        for (const id of m.team_b_player_ids) semifinalists.add(id);
      } else if (m.winner_team === 'b') {
        for (const id of m.team_a_player_ids) semifinalists.add(id);
      }
    }
  }

  // Build the insert payload.
  const awards: { profile_id: string; badge_id: string; season_id: string; earned_at: string }[] = [];
  const now = new Date().toISOString();
  const push = (profileId: string, code: string) => {
    const badgeId = badgeByCode.get(code);
    if (!badgeId) return;
    awards.push({ profile_id: profileId, badge_id: badgeId, season_id: season.id, earned_at: now });
  };

  for (const id of participants) {
    if (firstSeasonBadgeId && !firstSeasonOwners.has(id)) push(id, 'loyalty_first_season');
  }
  for (const id of top10) push(id, 'season_ladder_top10');
  for (const id of top3) push(id, 'season_ladder_top3');
  for (const id of champions) push(id, 'season_champion');
  for (const id of finalists) push(id, 'season_finalist');
  for (const id of semifinalists) push(id, 'season_semifinalist');

  if (awards.length === 0) return 0;

  // ON CONFLICT is implicit via the (profile_id, badge_id, season_id) unique
  // constraint — if close-season is somehow retried, the second insert is a
  // no-op rather than an error.
  const { error } = await supa.from('user_badges').upsert(awards, {
    onConflict: 'profile_id,badge_id,season_id',
    ignoreDuplicates: true,
  });
  if (error) {
    console.error('seasonal badges insert failed', error);
    return 0;
  }
  return awards.length;
}
