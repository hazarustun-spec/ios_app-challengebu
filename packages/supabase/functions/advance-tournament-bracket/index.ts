import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const inputSchema = z.object({ matchId: z.string().uuid() });

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: match } = await supa
      .from('matches')
      .select('id, status, winner_team, team_a_player_ids, team_b_player_ids')
      .eq('id', parsed.data.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);
    if (match.status !== 'confirmed' || match.winner_team === 'void' || !match.winner_team) {
      return jsonResponse({ advanced: false, reason: 'match not in confirmable state' });
    }

    const { data: tm } = await supa
      .from('tournament_matches')
      .select('id, tournament_id, round, bracket_position, seed_a, seed_b')
      .eq('match_id', match.id)
      .maybeSingle();
    if (!tm) return jsonResponse({ advanced: false, reason: 'not a tournament match' });

    if (tm.round >= 3) {
      const { data: tournament } = await supa
        .from('tournaments')
        .select('id, status')
        .eq('id', tm.tournament_id)
        .single();
      if (tournament && tournament.status !== 'completed') {
        await supa.from('tournaments').update({ status: 'completed' }).eq('id', tournament.id);
      }
      return jsonResponse({ advanced: false, reason: 'final completed', tournamentCompleted: true });
    }

    const winnerSeed = match.winner_team === 'a' ? tm.seed_a : tm.seed_b;
    const nextRound = tm.round + 1;
    const nextPosition = Math.ceil(tm.bracket_position / 2);
    const isAOfNext = tm.bracket_position % 2 === 1;

    const { data: parent } = await supa
      .from('tournament_matches')
      .select('id, seed_a, seed_b')
      .eq('tournament_id', tm.tournament_id)
      .eq('round', nextRound)
      .eq('bracket_position', nextPosition)
      .maybeSingle();

    if (parent) {
      const patch = isAOfNext ? { seed_a: winnerSeed } : { seed_b: winnerSeed };
      await supa.from('tournament_matches').update(patch).eq('id', parent.id);
      return jsonResponse({
        advanced: true,
        parentMatchId: parent.id,
        side: isAOfNext ? 'a' : 'b',
        seed: winnerSeed,
      });
    }

    await supa.from('tournament_matches').insert({
      tournament_id: tm.tournament_id,
      round: nextRound,
      bracket_position: nextPosition,
      seed_a: isAOfNext ? winnerSeed : null,
      seed_b: isAOfNext ? null : winnerSeed,
    });

    if (nextRound === 2) {
      await supa.from('tournaments').update({ status: 'in_progress' }).eq('id', tm.tournament_id);
    }

    return jsonResponse({
      advanced: true,
      parentMatchId: null,
      side: isAOfNext ? 'a' : 'b',
      seed: winnerSeed,
    });
  } catch (err) {
    return internalError(err);
  }
});
