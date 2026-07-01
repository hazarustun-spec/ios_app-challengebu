import { assertEquals, assertExists } from 'jsr:@std/assert';
import { createClient } from '@supabase/supabase-js';
import { ANON_KEY, SUPABASE_URL, adminClient, invokeFunction } from './helpers.ts';

// Must mirror REVIEW_EMAILS in packages/shared/src/schemas/onboarding.ts and
// REVIEW_OTP_CODE in functions/.env.test.
const REVIEW_EMAIL = 'appreview42@proton.me';
const REVIEW_CODE = '424242';

/** Delete the review auth user if the function created it, so runs stay isolated. */
async function deleteReviewUser(): Promise<void> {
  const supa = adminClient();
  const { data } = await supa.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === REVIEW_EMAIL);
  if (user) await supa.auth.admin.deleteUser(user.id);
}

Deno.test('review-login: correct email + code returns a token hash that verifies to a session', async () => {
  try {
    const { status, body } = await invokeFunction('review-login', {
      email: REVIEW_EMAIL,
      code: REVIEW_CODE,
    });
    assertEquals(status, 200);
    const { tokenHash } = body as { tokenHash: string };
    assertExists(tokenHash);

    // The hash must produce a real authenticated session.
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });
    assertEquals(error, null);
    assertExists(data.session);
    assertEquals(data.user?.email, REVIEW_EMAIL);
  } finally {
    await deleteReviewUser();
  }
});

Deno.test('review-login: wrong code is rejected', async () => {
  try {
    const { status } = await invokeFunction('review-login', {
      email: REVIEW_EMAIL,
      code: '000000',
    });
    assertEquals(status, 401);
  } finally {
    await deleteReviewUser();
  }
});

Deno.test('review-login: non-review email is rejected even with the correct code', async () => {
  const { status } = await invokeFunction('review-login', {
    email: 'someone@std.bogazici.edu.tr',
    code: REVIEW_CODE,
  });
  assertEquals(status, 403);
});

Deno.test('review-login: missing code is a 400', async () => {
  const { status } = await invokeFunction('review-login', {
    email: REVIEW_EMAIL,
  });
  assertEquals(status, 400);
});
