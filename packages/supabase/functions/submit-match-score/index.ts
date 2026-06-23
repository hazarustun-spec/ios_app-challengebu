import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { conflict, errorResponse, forbidden, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  matchId: z.string().uuid(),
  scoreTeamA: z.number().int().min(0),
  scoreTeamB: z.number().int().min(0),
  winnerTeam: z.enum(['a', 'b', 'void']),
  els: z.array(z.object({ el: z.number().int().min(1), winner: z.enum(['a', 'b']) })).optional(),
  sets: z.array(z.object({ set: z.number().int(), a: z.number().int(), b: z.number().int() })).optional(),
  games: z.object({ a: z.number().int(), b: z.number().int() }).optional(),
  tiebreakScore: z.object({ a: z.number().int(), b: z.number().int() }).optional(),
  points: z.object({ a: z.number().int(), b: z.number().int() }).optional(),
}).refine(
  (data) => {
    if (data.winnerTeam === 'void') return data.scoreTeamA === data.scoreTeamB;
    if (data.winnerTeam === 'a') return data.scoreTeamA > data.scoreTeamB;
    return data.scoreTeamB > data.scoreTeamA;
  },
  { message: 'winnerTeam must match scores', path: ['winnerTeam'] },
);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
    const input = parsed.data;

    const { data: match } = await supa
      .from('matches')
      .select('id, status, team_a_player_ids, team_b_player_ids')
      .eq('id', input.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);

    // Participant check FIRST — non-participants must not learn match state.
    const isParticipant =
      match.team_a_player_ids.includes(auth.userId) ||
      match.team_b_player_ids.includes(auth.userId);
    if (!isParticipant) return forbidden('Only participants can submit scores');

    // Reject re-submission once the match has been settled (confirmed, voided, disputed, etc.)
    if (match.status !== 'awaiting_confirmation') {
      return conflict(`Match is already ${match.status} — score submission not allowed`);
    }

    const scoreDetails = {
      scoreTeamA: input.scoreTeamA,
      scoreTeamB: input.scoreTeamB,
      winnerTeam: input.winnerTeam,
      ...(input.els ? { els: input.els } : {}),
      ...(input.sets ? { sets: input.sets } : {}),
      ...(input.games ? { games: input.games } : {}),
      ...(input.tiebreakScore ? { tiebreakScore: input.tiebreakScore } : {}),
      ...(input.points ? { points: input.points } : {}),
    };

    await supa.from('match_score_submissions').upsert(
      { match_id: match.id, submitted_by: auth.userId, score_details: scoreDetails },
      { onConflict: 'match_id,submitted_by' },
    );

    const { data: submissions } = await supa
      .from('match_score_submissions')
      .select('submitted_by, score_details, submitted_at')
      .eq('match_id', match.id)
      .order('submitted_at', { ascending: false });
    if (!submissions) return jsonResponse({ matched: false });

    const latestPerPlayer = new Map<string, unknown>();
    for (const s of submissions) {
      if (!latestPerPlayer.has(s.submitted_by)) {
        latestPerPlayer.set(s.submitted_by, s.score_details);
      }
    }

    const allPlayers = [...match.team_a_player_ids, ...match.team_b_player_ids];
    const allSubmitted = allPlayers.every((p) => latestPerPlayer.has(p));
    if (!allSubmitted) return jsonResponse({ matched: false });

    const firstKey = allPlayers[0];
    const firstDetails = latestPerPlayer.get(firstKey) as Record<string, unknown>;
    const firstStr = JSON.stringify(firstDetails);
    const allMatch = allPlayers.every((p) => JSON.stringify(latestPerPlayer.get(p)) === firstStr);
    if (!allMatch) return jsonResponse({ matched: false, conflict: true });

    // Write the agreed score from the stored (deduped) submissions, NOT from
    // the current caller's live input. This prevents a flip-race where the
    // final caller could sneak in a different score between consensus check
    // and the DB write.
    const agreedDetails = firstDetails;
    await supa.from('matches').update({
      score_team_a: agreedDetails.scoreTeamA as number,
      score_team_b: agreedDetails.scoreTeamB as number,
      winner_team: agreedDetails.winnerTeam as string,
      score_details: agreedDetails,
    }).eq('id', match.id);

    return jsonResponse({ matched: true });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
