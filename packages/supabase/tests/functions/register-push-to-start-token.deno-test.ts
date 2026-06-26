import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('register-push-to-start-token: missing auth → 401', async () => {
  await cleanupTestData();
  const r = await invokeFunction('register-push-to-start-token', { token: 'deadbeef' });
  assertEquals(r.status, 401);
});

Deno.test('register-push-to-start-token: valid call → 200 + row upserted (user-keyed)', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

  const r = await invokeFunction(
    'register-push-to-start-token',
    { token: 'deadbeef01' },
    alice.accessToken,
  );
  assertEquals(r.status, 200);
  assertEquals((r.body as { registered: boolean }).registered, true);

  const supa = adminClient();
  const { data: row } = await supa
    .from('push_to_start_tokens')
    .select('*')
    .eq('user_id', alice.userId)
    .single();
  if (!row) throw new Error('token row not inserted');
  assertEquals(row.token, 'deadbeef01');

  // Upsert: a second call with a new token updates the same single row.
  const r2 = await invokeFunction(
    'register-push-to-start-token',
    { token: 'cafebabe02' },
    alice.accessToken,
  );
  assertEquals(r2.status, 200);
  const { data: rows } = await supa
    .from('push_to_start_tokens')
    .select('token')
    .eq('user_id', alice.userId);
  assertEquals(rows!.length, 1);
  assertEquals(rows![0].token, 'cafebabe02');
});

Deno.test('register-push-to-start-token: invalid input (empty token) → 400', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const r = await invokeFunction('register-push-to-start-token', { token: '' }, alice.accessToken);
  assertEquals(r.status, 400);
});
