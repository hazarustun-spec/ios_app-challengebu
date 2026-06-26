function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function b64url(data: ArrayBuffer | string): string {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Cache the signed provider JWT and reuse it within its validity window. APNs
// rejects too-frequent token refreshes (429 TooManyProviderTokenUpdates), and
// the plan mandates caching ≤ 50 min, so we re-sign at most every 45 min. The
// cache is invalidated if the signing keyId/teamId changes.
let cached: { jwt: string; iat: number; keyId: string; teamId: string } | null = null;
const JWT_MAX_AGE_SECONDS = 45 * 60;

export async function makeApnsJwt(p8Pem: string, keyId: string, teamId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (
    cached &&
    cached.keyId === keyId &&
    cached.teamId === teamId &&
    now - cached.iat < JWT_MAX_AGE_SECONDS
  ) {
    return cached.jwt;
  }

  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(p8Pem),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = b64url(JSON.stringify({ iss: teamId, iat: now }));
  const signing = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signing));
  const jwt = `${signing}.${b64url(sig)}`;
  cached = { jwt, iat: now, keyId, teamId };
  return jwt;
}

// Push-to-start payload (iOS 17.2+): unlike update/end, the "start" event must
// carry `attributes` + `attributes-type` so APNs can materialize a brand-new
// Live Activity on the recipient's device without the app running.
export async function sendLiveActivityStartPush(opts: {
  host: string; jwt: string; topic: string; deviceToken: string;
  attributesType: string;                  // "LiveMatchAttributes"
  attributes: Record<string, unknown>;     // { matchId, youSide, nameA, nameB, categoryLabel }
  contentState: Record<string, unknown>;   // initial { gamesA:0, ... }
  staleDate?: number;                        // optional unix seconds
  alert?: { title: string; body: string };  // Apple requires `alert` for event:"start"
}): Promise<{ status: number; body: string }> {
  const aps: Record<string, unknown> = {
    timestamp: Math.floor(Date.now() / 1000),
    event: 'start',
    'content-state': opts.contentState,
    'attributes-type': opts.attributesType,
    attributes: opts.attributes,
  };
  if (opts.alert) aps.alert = opts.alert;
  if (opts.staleDate) aps['stale-date'] = opts.staleDate;
  const res = await fetch(`${opts.host}/3/device/${opts.deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${opts.jwt}`,
      'apns-topic': opts.topic,
      'apns-push-type': 'liveactivity',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ aps }),
  });
  return { status: res.status, body: await res.text() };
}

export async function sendLiveActivityPush(opts: {
  host: string; jwt: string; topic: string; deviceToken: string;
  contentState: Record<string, unknown>; event?: 'update' | 'end'; dismissalDate?: number;
}): Promise<{ status: number; body: string }> {
  const aps: Record<string, unknown> = {
    timestamp: Math.floor(Date.now() / 1000),
    event: opts.event ?? 'update',
    'content-state': opts.contentState,
  };
  if (opts.event === 'end' && opts.dismissalDate) aps['dismissal-date'] = opts.dismissalDate;
  const res = await fetch(`${opts.host}/3/device/${opts.deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${opts.jwt}`,
      'apns-topic': opts.topic,
      'apns-push-type': 'liveactivity',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ aps }),
  });
  return { status: res.status, body: await res.text() };
}
