import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('register-push-token: new token inserted', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

  const { status } = await invokeFunction('register-push-token', {
    token: 'ExponentPushToken[abc-123-very-long-token]',
    platform: 'ios',
  }, alice.accessToken);
  assertEquals(status, 200);

  const supa = adminClient();
  const { data: tokens } = await supa.from('push_tokens').select('*').eq('profile_id', alice.userId);
  assertEquals(tokens!.length, 1);
  assertEquals(tokens![0].platform, 'ios');
});

Deno.test('register-push-token: existing token updated (upsert)', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const tokenStr = 'ExponentPushToken[abc-456-long-token]';

  await invokeFunction('register-push-token', {
    token: tokenStr,
    platform: 'ios',
  }, alice.accessToken);

  // Send same token again (e.g., app reopened)
  await invokeFunction('register-push-token', {
    token: tokenStr,
    platform: 'ios',
  }, alice.accessToken);

  const supa = adminClient();
  const { data: tokens } = await supa.from('push_tokens').select('*').eq('profile_id', alice.userId);
  assertEquals(tokens!.length, 1); // No duplicate
});

Deno.test('register-push-token: rejects invalid token format', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

  const { status } = await invokeFunction('register-push-token', {
    token: 'x', // too short
    platform: 'ios',
  }, alice.accessToken);
  assertEquals(status, 400);
});
