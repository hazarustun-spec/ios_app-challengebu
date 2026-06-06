import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { conflict, errorResponse, forbidden, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ requestId: z.string().uuid() });

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);

    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: request, error: fetchErr } = await supa
      .from('match_requests')
      .select('*')
      .eq('id', parsed.data.requestId)
      .single();

    if (fetchErr || !request) return errorResponse('Request not found', 404);

    if (request.type !== 'direct_challenge') {
      return errorResponse('Only direct_challenge requests can be accepted this way', 400);
    }
    if (request.target_id !== auth.userId) {
      return forbidden('Only the target can accept this challenge');
    }
    if (request.status !== 'pending') {
      return conflict(`Request is ${request.status}`);
    }
    if (new Date(request.expires_at).getTime() < Date.now()) {
      await supa.from('match_requests').update({ status: 'expired' }).eq('id', request.id);
      return conflict('Request has expired');
    }

    const timeStr: string = request.proposed_time;
    const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    const playedAt = new Date(`${request.proposed_date}T${normalizedTime}Z`).toISOString();
    const teamA = request.creator_partner_id
      ? [request.creator_id, request.creator_partner_id]
      : [request.creator_id];
    const teamB = request.target_partner_id
      ? [request.target_id, request.target_partner_id]
      : [request.target_id];

    const { data: match, error: matchErr } = await supa
      .from('matches')
      .insert({
        match_request_id: request.id,
        category: request.category,
        format: request.format,
        court_id: request.court_id,
        played_at: playedAt,
        is_rated: request.is_rated,
        team_a_player_ids: teamA,
        team_b_player_ids: teamB,
        status: 'awaiting_confirmation',
      })
      .select('id')
      .single();

    if (matchErr) return errorResponse('Failed to create match', 500, matchErr);

    const { error: updateErr } = await supa
      .from('match_requests')
      .update({ status: 'accepted' })
      .eq('id', request.id);

    if (updateErr) return errorResponse('Failed to update request', 500, updateErr);

    return jsonResponse({ matchId: match!.id, requestStatus: 'accepted' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
