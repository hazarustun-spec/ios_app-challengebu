import { describe, expect, it } from 'bun:test';
import { AuthApiError, AuthRetryableFetchError, type Session } from '@supabase/supabase-js';
import { classifySessionRead, signInAgeExceeded } from '../session-policy';

const DAY = 86_400_000;
const session = { access_token: 'x' } as Session;

function tokenSignedInAt(seconds: number | null): string {
  const claims =
    seconds === null ? { sub: 'u' } : { sub: 'u', amr: [{ method: 'otp', timestamp: seconds }] };
  const b64 = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `h.${b64}.s`;
}

describe('classifySessionRead', () => {
  it('a session is signed in', () => {
    expect(classifySessionRead(session, null)).toBe('signed-in');
  });

  it('no session and no error is signed out', () => {
    expect(classifySessionRead(null, null)).toBe('signed-out');
  });

  it('a network failure during the refresh is NOT signed out', () => {
    // The bug: this used to send people to the e-mail screen with a valid
    // refresh token still in storage.
    const err = new AuthRetryableFetchError('Network request failed', 0);
    expect(classifySessionRead(null, err)).toBe('unknown');
  });

  it('a definitive rejection from the auth server is signed out', () => {
    const err = new AuthApiError(
      'Invalid Refresh Token: Already Used',
      400,
      'refresh_token_already_used',
    );
    expect(classifySessionRead(null, err)).toBe('signed-out');
  });
});

describe('signInAgeExceeded (60 days)', () => {
  const now = Date.UTC(2026, 8, 12);
  const at = (daysAgo: number) => Math.floor((now - daysAgo * DAY) / 1000);

  it('59 days after entering the code: still signed in', () => {
    expect(signInAgeExceeded(tokenSignedInAt(at(59)), now)).toBe(false);
  });

  it('61 days after entering the code: ask for a new code', () => {
    expect(signInAgeExceeded(tokenSignedInAt(at(61)), now)).toBe(true);
  });

  it('a token without sign-in time never forces a sign-out', () => {
    expect(signInAgeExceeded(tokenSignedInAt(null), now)).toBe(false);
    expect(signInAgeExceeded('not-a-jwt', now)).toBe(false);
    expect(signInAgeExceeded(undefined, now)).toBe(false);
  });
});
