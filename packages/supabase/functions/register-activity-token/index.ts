import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { errorResponse, forbidden, internalError, jsonResponse } from '../_shared/errors.ts';
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

    // Only match participants may register a Live Activity token for a match
    // (mirrors the live_score_read RLS policy on live_match_scores).
    const { data: match, error: matchErr } = await supa
      .from('matches')
      .select('team_a_player_ids, team_b_player_ids')
      .eq('id', matchId)
      .maybeSingle();
    if (matchErr) {
      console.error('[register-activity-token] match lookup failed', matchErr);
      return internalError(matchErr);
    }
    const participants: string[] = [
      ...(match?.team_a_player_ids ?? []),
      ...(match?.team_b_player_ids ?? []),
    ];
    if (!match || !participants.includes(auth.userId)) {
      return forbidden('Not a match participant');
    }

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
    if (error) {
      console.error('[register-activity-token] upsert failed', error);
      return internalError(error);
    }

    return jsonResponse({ registered: true });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
