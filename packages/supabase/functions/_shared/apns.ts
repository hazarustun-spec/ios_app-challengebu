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

export async function makeApnsJwt(p8Pem: string, keyId: string, teamId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(p8Pem),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = b64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const signing = `${header}.${payload}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signing));
  return `${signing}.${b64url(sig)}`;
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
