import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { makeApnsJwt, sendLiveActivityPush } from '../_shared/apns.ts';

// Pushes the current live_match_scores content-state to every registered Live
// Activity token for a match. Invoked by the `trg_push_live_score` AFTER-UPDATE
// trigger on public.live_match_scores (via pg_net), so every scored point — from
// the app or the lock-screen button — syncs to all of the match's devices.
//
// Auth: internal-only. The trigger passes INTERNAL_PUSH_KEY as the Bearer token
// (mirrored into both the function env and Vault's service_role_key), so we
// can't rely on SUPABASE_SERVICE_ROLE_KEY matching (its value differs under the
// new API-key system). We compare the Bearer against INTERNAL_PUSH_KEY directly.
const inputSchema = z.object({
  matchId: z.string().uuid(),
  notificationId: z.string().uuid().nullable().optional(),
});

const APNS_TOPIC = 'app.challengebu.ios.push-type.liveactivity';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const internalKey = (Deno.env.get('INTERNAL_PUSH_KEY') ?? '').trim();
    const token = (req.headers.get('authorization') ?? '')
      .replace(/^Bearer\s+/i, '')
      .trim();
    if (!internalKey || token !== internalKey) {
      return errorResponse('Forbidden', 401);
    }

    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
    const { matchId } = parsed.data;

    const supa = getServiceClient();

    // Load the current score row. No row → nothing to push.
    const { data: score } = await supa
      .from('live_match_scores')
      .select('games_a, games_b, points_a, points_b, phase, winner')
      .eq('match_id', matchId)
      .maybeSingle();
    if (!score) return jsonResponse({ pushed: 0, reason: 'no score row' });

    // Load the match's registered Live Activity tokens. Empty → return early
    // WITHOUT touching Vault or signing a JWT (testable locally without a .p8).
    const { data: tokens } = await supa
      .from('live_activity_tokens')
      .select('update_token')
      .eq('match_id', matchId);
    if (!tokens || tokens.length === 0) return jsonResponse({ pushed: 0 });

    // Read APNs creds from Vault via the get_secret() SECURITY DEFINER RPC
    // (vault.decrypted_secrets is not selectable by service_role directly).
    const secret = async (name: string): Promise<string> => {
      const { data, error } = await supa.rpc('get_secret', { p_name: name });
      if (error) throw new Error(`get_secret(${name}): ${error.message}`);
      return (data as string) ?? '';
    };
    // apns_key keeps its raw PEM newlines; other short values are trimmed.
    const apnsKey = await secret('apns_key');
    const apnsKeyId = (await secret('apns_key_id')).trim();
    const apnsTeamId = (await secret('apns_team_id')).trim();
    const apnsHost = ((await secret('apns_host')).trim()) || 'https://api.sandbox.push.apple.com';

    const jwt = await makeApnsJwt(apnsKey, apnsKeyId, apnsTeamId);

    // DB snake_case → Codable camelCase (must match LiveMatchAttributes.ContentState).
    const contentState = {
      gamesA: score.games_a,
      gamesB: score.games_b,
      pointsA: score.points_a,
      pointsB: score.points_b,
      phase: score.phase,
      winner: score.winner,
    };
    const event: 'update' | 'end' = score.phase === 'ongoing' ? 'update' : 'end';
    const dismissalDate = event === 'end' ? Math.floor(Date.now() / 1000) + 5 : undefined;

    const results: { token: string; status: number }[] = [];
    for (const t of tokens) {
      const deviceToken = t.update_token as string;
      try {
        const r = await sendLiveActivityPush({
          host: apnsHost,
          jwt,
          topic: APNS_TOPIC,
          deviceToken,
          contentState,
          event,
          dismissalDate,
        });
        results.push({ token: deviceToken.slice(0, 8), status: r.status });
      } catch (err) {
        console.error('[push-live-score] token push failed', err);
        results.push({ token: deviceToken.slice(0, 8), status: 0 });
      }
    }

    return jsonResponse({ pushed: results.length, results });
  } catch (err) {
    return internalError(err);
  }
});
