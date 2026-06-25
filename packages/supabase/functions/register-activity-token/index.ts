import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  matchId: z.string().uuid(),
  token: z.string().min(1),
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

    const { matchId, token } = parsed.data;

    const { error } = await supa
      .from('live_activity_tokens')
      .upsert(
        {
          match_id: matchId,
          user_id: auth.userId,
          update_token: token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'match_id,user_id' },
      );
    if (error) return internalError(error);

    return jsonResponse({ registered: true });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
