// deactivate-push-token: deletes the caller's push_tokens row matching the
// supplied Expo push token. Invoked from the mobile sign-out hook so APNs
// stops delivering notifications to that device once the user signs out.
//
// Pre-TestFlight hardening #9 — without this, the 60-day inactive cleanup
// cron is the only backstop and signed-out devices keep ringing for weeks.
import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  token: z.string().min(1).max(500),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);

    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    // Filter on both profile_id AND token so a caller can only delete their
    // own rows even if they know someone else's token string. Idempotent —
    // zero matching rows still returns 200.
    const { error } = await supa
      .from('push_tokens')
      .delete()
      .eq('profile_id', auth.userId)
      .eq('token', parsed.data.token);
    if (error) return errorResponse(error.message, 500);

    return jsonResponse({ deactivated: true });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
