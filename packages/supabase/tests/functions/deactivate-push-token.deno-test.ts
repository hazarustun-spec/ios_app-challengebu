import { assert, assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

Deno.test('deactivate-push-token: deletes own token by exact match', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const supa = adminClient();
  const user = await createTestUser({ email: `dpt-del-${s}@test.local` });
  try {
    await supa.from('push_tokens').insert({
      profile_id: user.userId,
      token: `ExponentPushToken[test-del-${s}]`,
      platform: 'ios',
    });

    const res = await invokeFunction(
      'deactivate-push-token',
      { token: `ExponentPushToken[test-del-${s}]` },
      user.accessToken,
    );
    assertEquals(res.status, 200);

    const { data } = await supa.from('push_tokens').select('id').eq('profile_id', user.userId);
    assertEquals(data!.length, 0);
  } finally {
    await teardownUsers([user.userId]);
  }
});

Deno.test('deactivate-push-token: does not delete other users tokens', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const supa = adminClient();
  const userA = await createTestUser({ email: `dpt-a-${s}@test.local` });
  const userB = await createTestUser({ email: `dpt-b-${s}@test.local` });
  try {
    await supa.from('push_tokens').insert({
      profile_id: userA.userId,
      token: `ExponentPushToken[a-${s}]`,
      platform: 'ios',
    });
    await supa.from('push_tokens').insert({
      profile_id: userB.userId,
      token: `ExponentPushToken[b-${s}]`,
      platform: 'ios',
    });

    // User B attempts to deactivate user A's token — filter (profile_id = B AND token = a-token) → 0 rows
    const res = await invokeFunction(
      'deactivate-push-token',
      { token: `ExponentPushToken[a-${s}]` },
      userB.accessToken,
    );
    assertEquals(res.status, 200);

    const { data: aTokens } = await supa.from('push_tokens').select('id').eq('profile_id', userA.userId);
    assertEquals(aTokens!.length, 1, 'A token must survive');
    const { data: bTokens } = await supa.from('push_tokens').select('id').eq('profile_id', userB.userId);
    assertEquals(bTokens!.length, 1, 'B token unrelated, must survive');
  } finally {
    await teardownUsers([userA.userId, userB.userId]);
  }
});

Deno.test('deactivate-push-token: idempotent — deleting non-existent token returns 200', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const user = await createTestUser({ email: `dpt-idem-${s}@test.local` });
  try {
    const res = await invokeFunction(
      'deactivate-push-token',
      { token: `ExponentPushToken[never-${s}]` },
      user.accessToken,
    );
    assertEquals(res.status, 200);
  } finally {
    await teardownUsers([user.userId]);
  }
});

Deno.test('deactivate-push-token: unauthorized (no token) rejected', async () => {
  const res = await invokeFunction(
    'deactivate-push-token',
    { token: 'ExponentPushToken[any]' },
    undefined,
  );
  assert(res.status === 401 || res.status === 403, `Expected 401/403, got ${res.status}`);
});

Deno.test('deactivate-push-token: invalid input (missing token) rejected', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const user = await createTestUser({ email: `dpt-inv-${s}@test.local` });
  try {
    const res = await invokeFunction('deactivate-push-token', {}, user.accessToken);
    assertEquals(res.status, 400);
  } finally {
    await teardownUsers([user.userId]);
  }
});
