import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { conflict, errorResponse, forbidden, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  matchId: z.string().uuid(),
  reason: z.string().trim().min(1).max(500),
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
      .select('id, status, team_a_player_ids, team_b_player_ids')
      .eq('id', parsed.data.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);
    const allPlayers: string[] = [...match.team_a_player_ids, ...match.team_b_player_ids];
    if (!allPlayers.includes(auth.userId)) return forbidden('Only participants can raise disputes');
    if (match.status === 'confirmed' || match.status === 'voided') {
      return conflict(`Match is ${match.status} — cannot dispute`);
    }

    const { data: dispute, error } = await supa.from('disputes').insert({
      match_id: match.id,
      raised_by: auth.userId,
      reason: parsed.data.reason,
    }).select('id').single();
    if (error) return errorResponse('Failed to create dispute', 500, error);

    await supa.from('matches').update({ status: 'disputed' }).eq('id', match.id);

    return jsonResponse({ disputeId: dispute!.id, status: 'disputed' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
