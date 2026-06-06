import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ seasonId: z.string().uuid() });

const SINGLES_CATEGORIES = ['erkek_tek', 'kadin_tek', 'open_tek'] as const;
const DOUBLES_CATEGORIES = ['erkek_cift', 'kadin_cift', 'karma_cift', 'open_cift'] as const;
const SINGLES_BRACKET_SIZE = 8;
const DOUBLES_BRACKET_SIZE = 4;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: season } = await supa.from('seasons').select('*').eq('id', parsed.data.seasonId).single();
    if (!season) return errorResponse('Season not found', 404);

    const tournamentsCreated: string[] = [];

    for (const category of [...SINGLES_CATEGORIES, ...DOUBLES_CATEGORIES]) {
      const bracketSize = (SINGLES_CATEGORIES as readonly string[]).includes(category)
        ? SINGLES_BRACKET_SIZE : DOUBLES_BRACKET_SIZE;

      const { data: topPlayers } = await supa
        .from('elo_ratings')
        .select('profile_id, rating, profiles!inner(status)')
        .eq('category', category)
        .neq('profiles.status', 'inactive_90')
        .order('rating', { ascending: false })
        .limit(bracketSize);

      if (!topPlayers || topPlayers.length < bracketSize) continue;

      for (let i = 0; i < topPlayers.length; i++) {
        const p = topPlayers[i];
        await supa.from('season_standings').insert({
          season_id: season.id,
          profile_id: p.profile_id,
          category,
          final_rating: p.rating,
          rank: i + 1,
          matches_played: 0,
        });
      }

      const { data: tournament } = await supa.from('tournaments').insert({
        season_id: season.id,
        category,
        bracket_size: bracketSize,
        status: 'seeded',
      }).select('id').single();
      tournamentsCreated.push(tournament!.id);

      const seedPairs = bracketSize === 8
        ? [[1, 8], [4, 5], [3, 6], [2, 7]]
        : [[1, 4], [2, 3]];
      for (let pos = 0; pos < seedPairs.length; pos++) {
        await supa.from('tournament_matches').insert({
          tournament_id: tournament!.id,
          round: 1,
          bracket_position: pos + 1,
          seed_a: seedPairs[pos][0],
          seed_b: seedPairs[pos][1],
        });
      }
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
