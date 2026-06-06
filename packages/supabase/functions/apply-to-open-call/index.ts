import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { conflict, errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  requestId: z.string().uuid(),
  applicantPartnerId: z.string().uuid().optional(),
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

    const { data: request } = await supa
      .from('match_requests')
      .select('id, creator_id, type, status, expires_at')
      .eq('id', parsed.data.requestId)
      .single();
    if (!request) return errorResponse('Request not found', 404);
    if (request.type !== 'open_call') return errorResponse('Only open_call accepts applications', 400);
    if (request.creator_id === auth.userId) return errorResponse('Cannot apply to your own call', 400);
    if (request.status !== 'pending') return conflict(`Request is ${request.status}`);
    if (new Date(request.expires_at).getTime() < Date.now()) {
      return conflict('Request has expired');
    }

    const { error } = await supa.from('open_call_applications').insert({
      match_request_id: request.id,
      applicant_id: auth.userId,
      applicant_partner_id: parsed.data.applicantPartnerId ?? null,
    });
    if (error) {
      if (error.code === '23505') return conflict('You already applied');
      return errorResponse('Failed to apply', 500, error);
    }

    return jsonResponse({ status: 'applied' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
