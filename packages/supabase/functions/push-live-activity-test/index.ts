import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { makeApnsJwt, sendLiveActivityPush } from '../_shared/apns.ts';

// Temporary test endpoint (removed in Task 3).
// Reads APNs creds from Vault via the get_secret() SECURITY DEFINER RPC,
// signs an ES256 JWT, and fires a Live Activity push to the given device token.
// Auth: internal-only — same INTERNAL_PUSH_KEY pattern as dispatch-push.
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const internalKey = (Deno.env.get('INTERNAL_PUSH_KEY') ?? '').trim();
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!internalKey || token !== internalKey) return errorResponse('Forbidden', 401);

    const { deviceToken, contentState } = await req.json();
    const supa = getServiceClient();

    // Read Vault via SECURITY DEFINER RPC (vault.decrypted_secrets is not
    // selectable by service_role directly).
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
    const r = await sendLiveActivityPush({
      host: apnsHost,
      jwt,
      topic: 'app.challengebu.ios.push-type.liveactivity',
      deviceToken,
      contentState,
    });
    return jsonResponse({ apns_status: r.status, apns_body: r.body });
  } catch (err) {
    return internalError(err);
  }
});
