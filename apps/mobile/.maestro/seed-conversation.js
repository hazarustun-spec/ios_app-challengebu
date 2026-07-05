// seed-conversation.js — create a 1:1 conversation for messages.yaml (Maestro).
// Requires MY_UID (signed-in user) in env; picks another profile as the peer.
// Sets output.convId for the messages flow.
//
// Prereq: local Supabase at 127.0.0.1:54321 with service role key.

const BASE = 'http://127.0.0.1:54321';
const SRK =
  output.SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Maestro injects flow env vars into the script scope (see get-otp.js).
const myUid = typeof MY_UID !== 'undefined' ? MY_UID : null;
if (!myUid) {
  throw new Error('Pass -e MY_UID=<auth.users id> for the signed-in Maestro user');
}

function rest(path, opts = {}) {
  const res = http.get(`${BASE}/rest/v1/${path}`, {
    headers: {
      apikey: SRK,
      Authorization: `Bearer ${SRK}`,
      Accept: 'application/json',
      ...opts.headers,
    },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`GET ${path} → ${res.status}: ${res.body}`);
  }
  return json(res.body);
}

function restPost(path, body) {
  const res = http.post(`${BASE}/rest/v1/${path}`, {
    headers: {
      apikey: SRK,
      Authorization: `Bearer ${SRK}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`POST ${path} → ${res.status}: ${res.body}`);
  }
  return json(res.body);
}

const others = rest(
  `profiles?select=user_id&user_id=neq.${myUid}&status=eq.active&limit=1`,
);
const otherUid = others[0]?.user_id;
if (!otherUid) throw new Error('No other active profile to message');

const reqs = restPost('match_requests', {
  creator_id: myUid,
  type: 'direct_challenge',
  target_id: otherUid,
  category: 'kadin_tek',
  format: 'bu_klasik',
  is_rated: true,
  status: 'pending',
});
const requestId = reqs[0]?.id;
if (!requestId) throw new Error('match_requests insert failed');

const low = myUid < otherUid ? myUid : otherUid;
const high = myUid < otherUid ? otherUid : myUid;

const convs = restPost('conversations', {
  request_id: requestId,
  participant_low: low,
  participant_high: high,
  last_message_at: new Date().toISOString(),
  last_message_preview: 'Selam!',
});
output.convId = convs[0]?.id;
if (!output.convId) throw new Error('conversations insert failed');