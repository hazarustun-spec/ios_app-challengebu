import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';

// Registers a device/user-level APNs push-to-start token (captured once at app
// startup after auth). Unlike register-activity-token, there is NO matchId and
// NO participant check: the token can start ANY Live Activity of the attributes
// type, so it is keyed by user_id alone.
const inputSchema = z.object({
  token: z.string().min(1),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { token } = parsed.data;

    const { error } = await supa
      .from('push_to_start_tokens')
      .upsert(
        {
          user_id: auth.userId,
          token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    if (error) {
      console.error('[register-push-to-start-token] upsert failed', error);
      return internalError(error);
    }

    return jsonResponse({ registered: true });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
