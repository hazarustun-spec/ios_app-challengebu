import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ seasonId: z.string().uuid() });

const SINGLES_CATEGORIES = ['erkek_tek', 'kadin_tek', 'open_tek'] as const;
// 'karma_cift' retired in 20260805000002 — it was open_cift under another
// name (nothing enforced the mixed-team rule) and no rows carry it any more.
// This list is iterated to seed one finale bracket per category, so leaving
// it in would mint an empty karma bracket every single season.
const DOUBLES_CATEGORIES = ['erkek_cift', 'kadin_cift', 'open_cift'] as const;
const SINGLES_BRACKET_SIZE = 8;
const DOUBLES_BRACKET_SIZE = 4;

type DoublesCategory = (typeof DOUBLES_CATEGORIES)[number];

interface MatchRow {
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  category: DoublesCategory;
}

interface EloRow {
  profile_id: string;
  rating: number;
}

interface Pair {
  a: string;
  b: string;
  matches: number;
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
    // Idempotency guard: re-firing would duplicate season_standings /
    // season_doubles_teams / tournaments rows because none have a per-season
    // unique constraint. Only allow the transition active → finale.
    if (season.status !== 'active') {
      return errorResponse(`Season is not active (current: ${season.status})`, 409);
    }

    const tournamentsCreated: string[] = [];

    // Singles: rank by individual ELO.
    for (const category of SINGLES_CATEGORIES) {
      const tid = await seedSinglesTournament(supa, season.id, category);
      if (tid) tournamentsCreated.push(tid);
    }

    // Doubles: form teams from this season's match history, rank by team avg rating.
    for (const category of DOUBLES_CATEGORIES) {
      const tid = await seedDoublesTournament(supa, season, category);
      if (tid) tournamentsCreated.push(tid);
    }

    await supa.from('seasons').update({ status: 'finale' }).eq('id', season.id);

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'start_season_finale',
      entity_type: 'season',
      entity_id: season.id,
      details: { tournamentsCreated: tournamentsCreated.length },
    });

    return jsonResponse({ seasonStatus: 'finale', tournamentCount: tournamentsCreated.length });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});

async function seedSinglesTournament(
  supa: ReturnType<typeof getServiceClient>,
  seasonId: string,
  category: string,
): Promise<string | null> {
  const { data: topPlayers } = await supa
    .from('elo_ratings')
    .select('profile_id, rating, profiles!inner(status)')
    .eq('category', category)
    .neq('profiles.status', 'inactive_90')
    .order('rating', { ascending: false })
    .limit(SINGLES_BRACKET_SIZE);

  if (!topPlayers || topPlayers.length < SINGLES_BRACKET_SIZE) return null;

  for (let i = 0; i < topPlayers.length; i++) {
    const p = topPlayers[i] as EloRow;
    await supa.from('season_standings').insert({
      season_id: seasonId,
      profile_id: p.profile_id,
      category,
      final_rating: p.rating,
      rank: i + 1,
      matches_played: 0,
    });
  }

  const { data: tournament } = await supa.from('tournaments').insert({
    season_id: seasonId,
    category,
    bracket_size: SINGLES_BRACKET_SIZE,
    status: 'seeded',
  }).select('id').single();

  const seedPairs = [[1, 8], [4, 5], [3, 6], [2, 7]];
  for (let pos = 0; pos < seedPairs.length; pos++) {
    await supa.from('tournament_matches').insert({
      tournament_id: tournament!.id,
      round: 1,
      bracket_position: pos + 1,
      seed_a: seedPairs[pos][0],
      seed_b: seedPairs[pos][1],
    });
  }

  return tournament!.id;
}

async function seedDoublesTournament(
  supa: ReturnType<typeof getServiceClient>,
  season: { id: string; starts_at: string; ends_at: string },
  category: DoublesCategory,
): Promise<string | null> {
  const { data: matches } = await supa
    .from('matches')
    .select('team_a_player_ids, team_b_player_ids, category')
    .eq('category', category)
    .eq('status', 'confirmed')
    .gte('played_at', season.starts_at)
    .lte('played_at', season.ends_at);

  if (!matches || matches.length === 0) return null;

  // Count partnership occurrences (only ordered, canonical pair).
  const pairCounts = new Map<string, Pair>();
  for (const m of matches as MatchRow[]) {
    countPartnership(pairCounts, m.team_a_player_ids);
    countPartnership(pairCounts, m.team_b_player_ids);
  }
  if (pairCounts.size === 0) return null;

  // Greedy: most-played pair first; each player can be on only one team.
  const sortedPairs = [...pairCounts.values()].sort((x, y) => y.matches - x.matches);
  const claimed = new Set<string>();
  const teams: Pair[] = [];
  for (const p of sortedPairs) {
    if (claimed.has(p.a) || claimed.has(p.b)) continue;
    teams.push(p);
    claimed.add(p.a);
    claimed.add(p.b);
    if (teams.length === DOUBLES_BRACKET_SIZE) break;
  }
  if (teams.length < DOUBLES_BRACKET_SIZE) return null;

  // Resolve each team's avg rating from elo_ratings (this category).
  const allProfileIds = teams.flatMap((t) => [t.a, t.b]);
  const { data: ratings } = await supa
    .from('elo_ratings')
    .select('profile_id, rating')
    .eq('category', category)
    .in('profile_id', allProfileIds);
  const ratingByProfile = new Map<string, number>(
    ((ratings ?? []) as EloRow[]).map((r) => [r.profile_id, r.rating]),
  );

  const teamsWithRating = teams.map((t) => ({
    ...t,
    avgRating: Math.round(
      ((ratingByProfile.get(t.a) ?? 1200) + (ratingByProfile.get(t.b) ?? 1200)) / 2,
    ),
  }));
  teamsWithRating.sort((x, y) => y.avgRating - x.avgRating);

  for (let i = 0; i < teamsWithRating.length; i++) {
    const t = teamsWithRating[i];
    await supa.from('season_doubles_teams').insert({
      season_id: season.id,
      category,
      player_a_id: t.a,
      player_b_id: t.b,
      avg_rating: t.avgRating,
      rank: i + 1,
      matches_played: t.matches,
    });
  }

  const { data: tournament } = await supa.from('tournaments').insert({
    season_id: season.id,
    category,
    bracket_size: DOUBLES_BRACKET_SIZE,
    status: 'seeded',
  }).select('id').single();

  // Doubles bracket: SF only, F is created lazily by advance-tournament-bracket.
  const seedPairs = [[1, 4], [2, 3]];
  for (let pos = 0; pos < seedPairs.length; pos++) {
    await supa.from('tournament_matches').insert({
      tournament_id: tournament!.id,
      round: 1,
      bracket_position: pos + 1,
      seed_a: seedPairs[pos][0],
      seed_b: seedPairs[pos][1],
    });
  }

  return tournament!.id;
}

function countPartnership(map: Map<string, Pair>, teamPlayerIds: string[]): void {
  // Only count 2-player teams (doubles); singles slots have length 1.
  if (teamPlayerIds.length !== 2) return;
  const [x, y] = teamPlayerIds;
  const a = x < y ? x : y;
  const b = x < y ? y : x;
  const key = `${a}|${b}`;
  const existing = map.get(key);
  if (existing) {
    existing.matches += 1;
  } else {
    map.set(key, { a, b, matches: 1 });
  }
}
