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

    const { data: request } = await supa
      .from('match_requests')
      .select('id, target_id, status')
      .eq('id', parsed.data.requestId)
      .single();
    if (!request) return errorResponse('Request not found', 404);
    if (request.target_id !== auth.userId) return forbidden('Only the target can reject');
    if (request.status !== 'pending') return conflict(`Request is ${request.status}`);

    const { error } = await supa
      .from('match_requests')
      .update({ status: 'rejected' })
      .eq('id', request.id);
    if (error) return errorResponse('Failed to reject', 500, error);

    return jsonResponse({ status: 'rejected' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
