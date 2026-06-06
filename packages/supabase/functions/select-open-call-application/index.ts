import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { conflict, errorResponse, forbidden, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ applicationId: z.string().uuid() });

function buildPlayedAt(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalizedTime}Z`).toISOString();
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: app } = await supa
      .from('open_call_applications')
      .select('id, match_request_id, applicant_id, applicant_partner_id, status')
      .eq('id', parsed.data.applicationId)
      .single();
    if (!app) return errorResponse('Application not found', 404);
    if (app.status !== 'pending') return conflict(`Application is ${app.status}`);

    const { data: request } = await supa
      .from('match_requests')
      .select('*')
      .eq('id', app.match_request_id)
      .single();
    if (!request) return errorResponse('Request not found', 404);
    if (request.creator_id !== auth.userId) return forbidden('Only the creator can select');
    if (request.status !== 'pending') return conflict(`Request is ${request.status}`);

    const playedAt = buildPlayedAt(request.proposed_date, request.proposed_time);
    const teamA = request.creator_partner_id
      ? [request.creator_id, request.creator_partner_id]
      : [request.creator_id];
    const teamB = app.applicant_partner_id
      ? [app.applicant_id, app.applicant_partner_id]
      : [app.applicant_id];

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

    await supa.from('open_call_applications').update({ status: 'selected' }).eq('id', app.id);
    await supa
      .from('open_call_applications')
      .update({ status: 'declined' })
      .eq('match_request_id', app.match_request_id)
      .neq('id', app.id);
    await supa.from('match_requests').update({ status: 'accepted' }).eq('id', request.id);

    return jsonResponse({ matchId: match!.id, requestStatus: 'accepted' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
