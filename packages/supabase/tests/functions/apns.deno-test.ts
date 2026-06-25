import { assert, assertEquals } from 'jsr:@std/assert';
import { makeApnsJwt } from '../../functions/_shared/apns.ts';

// Pure unit test for the ES256 provider-JWT cache in _shared/apns.ts. Generates
// a throwaway P-256 key in-test so no real .p8 is required, and runs without a
// local Supabase stack (unlike the *.deno-test.ts integration tests).

/** Generate a throwaway P-256 private key and return it as a PKCS#8 PEM. */
async function generateP8Pem(): Promise<string> {
  const { privateKey } = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  );
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);
  const bytes = new Uint8Array(pkcs8);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin).replace(/(.{64})/g, '$1\n');
  return `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n`;
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

Deno.test('makeApnsJwt: caches the JWT within its validity window (same kid/team)', async () => {
  const pem = await generateP8Pem();
  // Unique kid/team so this test starts from a cache miss regardless of the
  // module-level cache populated by other tests.
  const kid = 'CACHEKID01';
  const team = 'CACHETEAM1';

  // Deno's WebCrypto ECDSA is deterministic, so string-equality alone can't
  // distinguish a cache hit from a re-sign. Count actual sign() calls instead:
  // a second call with identical kid/team must NOT re-sign.
  const subtle = crypto.subtle;
  const origSign = subtle.sign.bind(subtle);
  let signCount = 0;
  // deno-lint-ignore no-explicit-any
  (subtle as any).sign = (...args: any[]) => {
    signCount++;
    // deno-lint-ignore no-explicit-any
    return (origSign as any)(...args);
  };
  try {
    const first = await makeApnsJwt(pem, kid, team);
    const second = await makeApnsJwt(pem, kid, team);
    assertEquals(first, second);
    // Exactly one sign: first call = miss (signs), second call = cache hit.
    assertEquals(signCount, 1);
  } finally {
    // deno-lint-ignore no-explicit-any
    (subtle as any).sign = origSign;
  }
});

Deno.test('makeApnsJwt: produces a valid ES256 JWT (3 segments, decodable header/payload)', async () => {
  const pem = await generateP8Pem();
  const kid = 'KEYID98765';
  const team = 'TEAMID0001';

  // Different kid/team than the previous test → forces a fresh sign (cache miss).
  const jwt = await makeApnsJwt(pem, kid, team);

  const parts = jwt.split('.');
  assertEquals(parts.length, 3);

  const header = JSON.parse(b64urlDecode(parts[0]));
  assertEquals(header.alg, 'ES256');
  assertEquals(header.kid, kid);

  const payload = JSON.parse(b64urlDecode(parts[1]));
  assertEquals(payload.iss, team);
  assert(typeof payload.iat === 'number');
  assert(payload.iat > 0);
});
