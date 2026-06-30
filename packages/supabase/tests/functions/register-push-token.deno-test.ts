import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

Deno.test('register-push-token: new token inserted', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-rpt-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const { status } = await invokeFunction('register-push-token', {
      token: 'ExponentPushToken[abc-123-very-long-token]',
      platform: 'ios',
    }, alice.accessToken);
    assertEquals(status, 200);

    const supa = adminClient();
    const { data: tokens } = await supa.from('push_tokens').select('*').eq('profile_id', alice.userId);
    assertEquals(tokens!.length, 1);
    assertEquals(tokens![0].platform, 'ios');
  } finally {
    await teardownUsers([alice.userId]);
  }
});

Deno.test('register-push-token: existing token updated (upsert)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-rpt-${s}@test.local`, genderCategory: 'erkek' });
  const tokenStr = 'ExponentPushToken[abc-456-long-token]';
  try {
    await invokeFunction('register-push-token', { token: tokenStr, platform: 'ios' }, alice.accessToken);
    await invokeFunction('register-push-token', { token: tokenStr, platform: 'ios' }, alice.accessToken);

    const supa = adminClient();
    const { data: tokens } = await supa.from('push_tokens').select('*').eq('profile_id', alice.userId);
    assertEquals(tokens!.length, 1); // No duplicate
  } finally {
    await teardownUsers([alice.userId]);
  }
});

Deno.test('register-push-token: rejects invalid token format', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-rpt-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const { status } = await invokeFunction('register-push-token', {
      token: 'x', // too short
      platform: 'ios',
    }, alice.accessToken);
    assertEquals(status, 400);
  } finally {
    await teardownUsers([alice.userId]);
  }
});
