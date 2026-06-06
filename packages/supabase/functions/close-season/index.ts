import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({ seasonId: z.string().uuid() });

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: season } = await supa.from('seasons').select('*').eq('id', parsed.data.seasonId).single();
    if (!season) return errorResponse('Season not found', 404);
    if (season.status === 'closed') return errorResponse('Season already closed', 409);

    const { data: ratings } = await supa.from('elo_ratings').select('id, rating');
    for (const r of ratings ?? []) {
      const newRating = Math.round((r.rating + 1200) / 2);
      await supa.from('elo_ratings').update({ rating: newRating, matches_played: 0 }).eq('id', r.id);
    }

    await supa.from('seasons').update({ status: 'closed' }).eq('id', season.id);

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'close_season',
      entity_type: 'season',
      entity_id: season.id,
      details: { ratingsReset: ratings?.length ?? 0 },
    });

    return jsonResponse({ status: 'closed', ratingsReset: ratings?.length ?? 0 });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
