// review-login — App Store review sign-in bypass for the OTP-only auth flow.
//
// The app signs in with email OTP / magic-link only (no password), so an Apple
// reviewer given a demo email can't retrieve the mailed code. This endpoint lets
// the reviewer authenticate the ONE dedicated review mailbox with a fixed code
// (REVIEW_OTP_CODE secret) — no inbox access needed.
//
// Flow: client sends { email, code }. We check the email is the review account
// and the code matches the secret, then mint a magic-link token hash via the
// admin API. The client calls supabase.auth.verifyOtp({ token_hash, type:
// 'magiclink' }) to get a real session. Deployed with verify_jwt = false so the
// reviewer (no session yet) can call it.
//
// Security: strictly scoped to REVIEW_EMAILS — the code can never mint a session
// for any other account, and the review account is an ordinary player.

import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

// Mirror of REVIEW_EMAILS in packages/shared/src/schemas/onboarding.ts.
// Keep these two in sync.
const REVIEW_EMAILS: readonly string[] = ['appreview42@proton.me'];

const inputSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});

/** Length-independent constant-time string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Fold the length difference into the result so mismatched lengths still take
  // a full pass and never short-circuit.
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const raw = await req.json().catch(() => null);
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const email = parsed.data.email.toLowerCase().trim();
    if (!REVIEW_EMAILS.includes(email)) {
      // Never reveal the review email; a normal account cannot use this path.
      return errorResponse('Not a review account', 403);
    }

    const expected = Deno.env.get('REVIEW_OTP_CODE');
    if (!expected) {
      console.error('[review-login] REVIEW_OTP_CODE is not set');
      return internalError(new Error('REVIEW_OTP_CODE not configured'));
    }
    if (!timingSafeEqual(parsed.data.code, expected)) {
      return errorResponse('Invalid code', 401);
    }

    const supa = getServiceClient();

    // Ensure the review auth user exists. Ignore "already registered" so repeat
    // logins are idempotent.
    const { error: createErr } = await supa.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (
      createErr &&
      !/already been registered|already exists|already registered/i.test(createErr.message)
    ) {
      return errorResponse(createErr.message, 422, createErr);
    }

    // Hand the reviewer a demo account in the state the seed script produced,
    // no matter what the previous reviewer left behind — a deleted (anonymized)
    // profile, a played-out demo match, an accepted challenge. Best-effort: a
    // failure here must not cost the reviewer their session, which is the one
    // thing they cannot work around.
    const { error: resetErr } = await supa.rpc('reset_review_account');
    if (resetErr) console.error('[review-login] reset_review_account failed', resetErr);

    const { data, error } = await supa.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (error || !data.properties?.hashed_token) {
      return errorResponse(error?.message ?? 'Could not generate login token', 502, error);
    }

    return jsonResponse({ tokenHash: data.properties.hashed_token });
  } catch (err) {
    return internalError(err);
  }
});
