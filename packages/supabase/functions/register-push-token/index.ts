import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAuth, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['ios', 'android']),
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

    // Ownership check: if the token is already registered to a different user,
    // delete that stale row before inserting ours. This prevents caller A from
    // silently hijacking (IDOR-overwriting) caller B's push-token row.
    const { data: existing } = await supa
      .from('push_tokens')
      .select('profile_id')
      .eq('token', parsed.data.token)
      .maybeSingle();

    if (existing && existing.profile_id !== auth.userId) {
      await supa.from('push_tokens').delete().eq('token', parsed.data.token);
    }

    await supa.from('push_tokens').upsert(
      {
        profile_id: auth.userId,
        token: parsed.data.token,
        platform: parsed.data.platform,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );

    return jsonResponse({ status: 'registered' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
