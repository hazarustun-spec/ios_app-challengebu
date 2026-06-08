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
      .maybeSingle();
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

    // Singles brackets are size 8 (rounds 1=QF, 2=SF, 3=F); doubles brackets
    // are size 4 (rounds 1=SF, 2=F). The Final round is therefore log2(size).
    const { data: tournament } = await supa
      .from('tournaments')
      .select('id, status, bracket_size')
      .eq('id', tm.tournament_id)
      .maybeSingle();
    if (!tournament) return errorResponse('Tournament not found', 404);

    const finalRound = tournament.bracket_size === 4 ? 2 : 3;

    if (tm.round >= finalRound) {
      if (tournament.status !== 'completed') {
        await supa.from('tournaments').update({ status: 'completed' }).eq('id', tournament.id);
      }
      return jsonResponse({ advanced: false, reason: 'final completed', tournamentCompleted: true });
    }

    const winnerSeed = match.winner_team === 'a' ? tm.seed_a : tm.seed_b;
    if (winnerSeed === null || winnerSeed === undefined) {
      return jsonResponse({ advanced: false, reason: 'winner seed missing on source match' });
    }
    const nextRound = tm.round + 1;
    // Bracket promotion: positions 1+2 of round N → position 1 of round N+1,
    // positions 3+4 → position 2. Odd source positions occupy the parent's
    // seed_a slot, even ones seed_b.
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

    // Tournament flips to in_progress when the first non-seed slot is created.
    // For singles (size 8) that's at round 2 (SF); for doubles (size 4) the
    // round-2 row IS the Final, so we don't want to flip-then-complete in the
    // same call — only nudge to in_progress when the new row isn't the Final.
    if (nextRound < finalRound && tournament.status !== 'in_progress') {
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
