import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { makeApnsJwt, sendLiveActivityStartPush } from '../_shared/apns.ts';

// Auto-starts the OPPONENT's Live Activity when a match begins. Invoked by the
// `trg_start_opponent_activity` AFTER-UPDATE trigger on public.matches (via
// pg_net) when `started_by` changes, so a player tapping "start" materializes
// the Live Activity on every other participant's device WITHOUT them opening the
// app (iOS 17.2+ push-to-start).
//
// Auth: internal-only. The trigger passes INTERNAL_PUSH_KEY as the Bearer token
// (mirrored into both the function env and Vault's service_role_key), so we
// can't rely on SUPABASE_SERVICE_ROLE_KEY matching (its value differs under the
// new API-key system). We compare the Bearer against INTERNAL_PUSH_KEY directly.
const inputSchema = z.object({ matchId: z.string().uuid() });

const APNS_TOPIC = 'app.challengebu.ios.push-type.liveactivity';
const ATTRIBUTES_TYPE = 'LiveMatchAttributes';

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

    // Load the match. No row → nothing to start.
    const { data: match, error: matchErr } = await supa
      .from('matches')
      .select('team_a_player_ids, team_b_player_ids, started_by')
      .eq('id', matchId)
      .maybeSingle();
    if (matchErr) console.error('[start-opponent-activity] match read failed', matchErr);
    if (!match) return jsonResponse({ pushed: 0, reason: 'no match' });

    const teamA: string[] = match.team_a_player_ids ?? [];
    const teamB: string[] = match.team_b_player_ids ?? [];
    const startedBy: string[] = match.started_by ?? [];

    // Non-starter participants = (team_a ∪ team_b) minus everyone who already
    // started (their own device already has the activity). Empty → nothing to do.
    const participants = [...teamA, ...teamB];
    const nonStarters = participants.filter((uid) => !startedBy.includes(uid));
    if (nonStarters.length === 0) return jsonResponse({ pushed: 0 });

    // Load the non-starters' device-level push-to-start tokens. Empty → return
    // BEFORE reading Vault / signing a JWT (same early-return discipline as
    // push-live-score; keeps this testable locally without a .p8).
    const { data: tokens, error: tokensErr } = await supa
      .from('push_to_start_tokens')
      .select('user_id, token')
      .in('user_id', nonStarters);
    if (tokensErr) console.error('[start-opponent-activity] token list read failed', tokensErr);
    if (!tokens || tokens.length === 0) return jsonResponse({ pushed: 0 });

    // Read APNs creds from Vault via the get_secret() SECURITY DEFINER RPC.
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

    const results: { user_id: string; status: number }[] = [];
    for (const t of tokens) {
      const recipient = t.user_id as string;
      const deviceToken = t.token as string;

      // Perspective-correct names: from THIS recipient's point of view they are
      // "Sen" (You) and the first player on the other team is the opponent
      // (mirrors score.tsx's nameA/nameB derivation).
      const youSide: 'a' | 'b' = teamA.includes(recipient) ? 'a' : 'b';
      const opponentUid = youSide === 'a' ? teamB[0] : teamA[0];

      let opponentFirstName = 'Rakip';
      if (opponentUid) {
        const { data: prof } = await supa
          .from('profiles')
          .select('first_name')
          .eq('user_id', opponentUid)
          .maybeSingle();
        if (prof?.first_name) opponentFirstName = prof.first_name as string;
      }
      const nameA = youSide === 'a' ? 'Sen' : opponentFirstName;
      const nameB = youSide === 'a' ? opponentFirstName : 'Sen';

      const attributes = {
        matchId,
        youSide,
        nameA,
        nameB,
        categoryLabel: null,
      };
      const contentState = {
        gamesA: 0,
        gamesB: 0,
        pointsA: 0,
        pointsB: 0,
        phase: 'ongoing',
        winner: null,
      };

      try {
        const r = await sendLiveActivityStartPush({
          host: apnsHost,
          jwt,
          topic: APNS_TOPIC,
          deviceToken,
          attributesType: ATTRIBUTES_TYPE,
          attributes,
          contentState,
          alert: { title: 'Maç başladı', body: `${opponentFirstName} maçı başlattı` },
        });
        results.push({ user_id: recipient, status: r.status });
      } catch (err) {
        // One recipient's failure must not abort the rest.
        console.error('[start-opponent-activity] start push failed', err);
        results.push({ user_id: recipient, status: 0 });
      }
    }

    const pushed = results.filter((r) => r.status === 200).length;
    return jsonResponse({ pushed, results });
  } catch (err) {
    return internalError(err);
  }
});
