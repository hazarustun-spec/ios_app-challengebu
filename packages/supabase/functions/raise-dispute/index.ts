import { z } from 'zod';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';
import { handleCors } from '../_shared/cors.ts';
import {
  conflict,
  errorResponse,
  forbidden,
  internalError,
  jsonResponse,
} from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const inputSchema = z
  .object({
    matchId: z.string().uuid(),
    reason: z.string().trim().min(1).max(500),
    // What the reporter says the score actually was, in the format's own unit.
    // Optional and only meaningful as a pair — a "this match was never played"
    // report has no score to claim.
    claimedScoreA: z.number().int().min(0).max(99).optional(),
    claimedScoreB: z.number().int().min(0).max(99).optional(),
  })
  .refine((v) => (v.claimedScoreA === undefined) === (v.claimedScoreB === undefined), {
    message: 'claimedScoreA and claimedScoreB must be sent together',
  });

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: match } = await supa
      .from('matches')
      .select('id, status, winner_team, team_a_player_ids, team_b_player_ids')
      .eq('id', parsed.data.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);
    const allPlayers: string[] = [...match.team_a_player_ids, ...match.team_b_player_ids];
    if (!allPlayers.includes(auth.userId)) return forbidden('Only participants can raise disputes');
    if (match.status === 'confirmed' || match.status === 'voided' || match.status === 'disputed') {
      return conflict(`Match is ${match.status} — cannot dispute`);
    }
    // No score gate. This used to refuse unless `winner_team` was set, which
    // meant the one situation the button most needed to cover — the score can't
    // be entered at all — was the one it rejected. A participant may report a
    // match at any point before it is settled.

    const { data: dispute, error } = await supa
      .from('disputes')
      .insert({
        match_id: match.id,
        raised_by: auth.userId,
        reason: parsed.data.reason,
        claimed_score_a: parsed.data.claimedScoreA ?? null,
        claimed_score_b: parsed.data.claimedScoreB ?? null,
      })
      .select('id')
      .single();
    if (error) return errorResponse('Failed to create dispute', 500, error);

    const { error: updateErr } = await supa
      .from('matches')
      .update({ status: 'disputed' })
      .eq('id', match.id);
    if (updateErr) return errorResponse('Failed to mark match disputed', 500, updateErr);

    return jsonResponse({ disputeId: dispute!.id, status: 'disputed' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
