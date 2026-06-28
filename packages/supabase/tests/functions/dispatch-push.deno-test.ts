import { assertEquals } from 'jsr:@std/assert';
import {
  adminClient,
  ANON_KEY,
  cleanupTestData,
  createTestUser,
  FUNCTIONS_URL,
  invokeFunction,
} from './helpers.ts';

// dispatch-push delivers a push for an ALREADY-CREATED notification row. It is
// invoked internally by the `trg_dispatch_push` AFTER-INSERT trigger, which
// passes INTERNAL_PUSH_KEY as the Bearer token. The function compares the Bearer
// against INTERNAL_PUSH_KEY directly (no service-role fallback), so a wrong/empty
// key is rejected with 401 before anything else runs.
//
// Serve the function with the matching env, e.g.:
//   supabase functions serve --no-verify-jwt --env-file <(echo INTERNAL_PUSH_KEY=test-internal-key)
// and run the test with INTERNAL_PUSH_KEY exported to the same value.
const INTERNAL_PUSH_KEY = Deno.env.get('INTERNAL_PUSH_KEY') ?? 'test-internal-key';

/**
 * The local stack may be running without INTERNAL_PUSH_KEY configured in the edge
 * runtime, in which case EVERY call returns 401 (the key check is first) and the
 * input-validation / no-token branches are unreachable. Probe once: if a valid-key
 * call for a random (non-existent) notification id is NOT rejected, the key is
 * honored and we can exercise the reachable post-auth behavior. The auth-rejection
 * tests below always run regardless.
 */
async function probeKeyHonored(): Promise<boolean> {
  const { status } = await invokeFunction(
    'dispatch-push',
    { notificationId: '00000000-0000-0000-0000-0000000000aa' },
    INTERNAL_PUSH_KEY,
  );
  return status !== 401;
}
const KEY_HONORED = await probeKeyHonored();

/** Insert a notification row directly (service role bypasses RLS); return its id. */
async function insertNotification(recipientId: string): Promise<string> {
  const supa = adminClient();
  const { data, error } = await supa
    .from('notifications')
    .insert({
      recipient_id: recipientId,
      category: 'badges_earned',
      title: 'Rozet kazandın! 🏅',
      body: 'İlk maç rozetini cebine attın!',
      data: { action: 'badges_earned' },
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`insert notification: ${error?.message}`);
  return data.id;
}

Deno.test('dispatch-push: missing Authorization → 401', async () => {
  // Hit the endpoint directly with no Authorization header at all (apikey only).
  const res = await fetch(`${FUNCTIONS_URL}/dispatch-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ notificationId: '00000000-0000-0000-0000-0000000000ab' }),
  });
  await res.body?.cancel();
  assertEquals(res.status, 401);
});

Deno.test('dispatch-push: wrong key → 401', async () => {
  const { status } = await invokeFunction(
    'dispatch-push',
    { notificationId: '00000000-0000-0000-0000-0000000000ab' },
    'definitely-not-the-internal-key',
  );
  assertEquals(status, 401);
});

Deno.test({
  name: 'dispatch-push: valid key + invalid input → 400',
  ignore: !KEY_HONORED,
  async fn() {
    const { status } = await invokeFunction(
      'dispatch-push',
      { notificationId: 'not-a-uuid' },
      INTERNAL_PUSH_KEY,
    );
    assertEquals(status, 400);
  },
});

Deno.test({
  name: 'dispatch-push: valid key + unknown notification → 200 not_found',
  ignore: !KEY_HONORED,
  async fn() {
    const { status, body } = await invokeFunction(
      'dispatch-push',
      { notificationId: '00000000-0000-0000-0000-0000000000ac' },
      INTERNAL_PUSH_KEY,
    );
    assertEquals(status, 200);
    assertEquals((body as { pushed: boolean; reason: string }).reason, 'not_found');
  },
});

Deno.test({
  name: 'dispatch-push: recipient has no push tokens → pushed:false no_tokens',
  ignore: !KEY_HONORED,
  async fn() {
    await cleanupTestData();
    const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
    const notificationId = await insertNotification(alice.userId);

    const { status, body } = await invokeFunction(
      'dispatch-push',
      { notificationId },
      INTERNAL_PUSH_KEY,
    );
    assertEquals(status, 200);
    const result = body as { pushed: boolean; reason: string };
    assertEquals(result.pushed, false);
    assertEquals(result.reason, 'no_tokens');
  },
});

Deno.test({
  name: 'dispatch-push: recipient preference OFF → pushed:false preference_off',
  ignore: !KEY_HONORED,
  async fn() {
    await cleanupTestData();
    const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

    // Disable the badges_earned category for alice (default rows are created per user).
    const supa = adminClient();
    await supa
      .from('notification_preferences')
      .update({ enabled: false })
      .eq('profile_id', alice.userId)
      .eq('category', 'badges_earned');

    const notificationId = await insertNotification(alice.userId);

    const { status, body } = await invokeFunction(
      'dispatch-push',
      { notificationId },
      INTERNAL_PUSH_KEY,
    );
    assertEquals(status, 200);
    const result = body as { pushed: boolean; reason: string };
    assertEquals(result.pushed, false);
    assertEquals(result.reason, 'preference_off');
  },
});
