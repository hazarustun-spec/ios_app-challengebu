import { assertEquals } from 'jsr:@std/assert';
import {
  adminClient,
  ANON_KEY,
  createTestUser,
  FUNCTIONS_URL,
  invokeFunction,
  teardownUsers,
} from './helpers.ts';

// dispatch-push compares the Bearer against INTERNAL_PUSH_KEY directly.
// Probe once: if a valid-key call for a random non-existent notification id
// is NOT rejected with 401, the key is honored.
const INTERNAL_PUSH_KEY = Deno.env.get('INTERNAL_PUSH_KEY') ?? 'test-internal-key';

async function probeKeyHonored(): Promise<boolean> {
  const { status } = await invokeFunction(
    'dispatch-push',
    { notificationId: '00000000-0000-0000-0000-0000000000aa' },
    INTERNAL_PUSH_KEY,
  );
  return status !== 401;
}
const KEY_HONORED = await probeKeyHonored();

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
    .select('id').single();
  if (error || !data) throw new Error(`insert notification: ${error?.message}`);
  return data.id;
}

Deno.test('dispatch-push: missing Authorization → 401', async () => {
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
      'dispatch-push', { notificationId: 'not-a-uuid' }, INTERNAL_PUSH_KEY,
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
    const s = crypto.randomUUID().slice(0, 8);
    const alice = await createTestUser({ email: `alice-dp-${s}@test.local`, genderCategory: 'erkek' });
    try {
      const notificationId = await insertNotification(alice.userId);
      const { status, body } = await invokeFunction(
        'dispatch-push', { notificationId }, INTERNAL_PUSH_KEY,
      );
      assertEquals(status, 200);
      const result = body as { pushed: boolean; reason: string };
      assertEquals(result.pushed, false);
      assertEquals(result.reason, 'no_tokens');
    } finally {
      await teardownUsers([alice.userId]);
    }
  },
});

Deno.test({
  name: 'dispatch-push: recipient preference OFF → pushed:false preference_off',
  ignore: !KEY_HONORED,
  async fn() {
    const s = crypto.randomUUID().slice(0, 8);
    const alice = await createTestUser({ email: `alice-dp-${s}@test.local`, genderCategory: 'erkek' });
    try {
      const supa = adminClient();
      await supa
        .from('notification_preferences')
        .update({ enabled: false })
        .eq('profile_id', alice.userId)
        .eq('category', 'badges_earned');

      const notificationId = await insertNotification(alice.userId);
      const { status, body } = await invokeFunction(
        'dispatch-push', { notificationId }, INTERNAL_PUSH_KEY,
      );
      assertEquals(status, 200);
      const result = body as { pushed: boolean; reason: string };
      assertEquals(result.pushed, false);
      assertEquals(result.reason, 'preference_off');
    } finally {
      await teardownUsers([alice.userId]);
    }
  },
});
