// Tests for deactivate-push-token Edge Function.
//
// Requires `supabase functions serve` to be running externally so the local
// stack can route fetch calls to /functions/v1/<name>. Run with:
//
//   supabase functions serve &
//   export SUPABASE_SERVICE_ROLE_KEY="$(supabase status --output json | jq -r .SERVICE_ROLE_KEY)"
//   export SUPABASE_ANON_KEY="$(supabase status --output json | jq -r .ANON_KEY)"
//   deno test --config functions/deno.json --allow-net --allow-env --allow-read \
//     tests/functions/deactivate-push-token.deno-test.ts
import { assert, assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('deactivate-push-token: deletes own token by exact match', async () => {
  await cleanupTestData();
  const supa = adminClient();
  const user = await createTestUser({ email: 'deactivate@test.local' });

  await supa.from('push_tokens').insert({
    profile_id: user.userId,
    token: 'ExponentPushToken[test-deactivate-1]',
    platform: 'ios',
  });

  const res = await invokeFunction(
    'deactivate-push-token',
    { token: 'ExponentPushToken[test-deactivate-1]' },
    user.accessToken,
  );
  assertEquals(res.status, 200);

  const { data } = await supa.from('push_tokens')
    .select('id')
    .eq('profile_id', user.userId);
  assertEquals(data!.length, 0);
  await cleanupTestData();
});

Deno.test('deactivate-push-token: does not delete other users tokens', async () => {
  await cleanupTestData();
  const supa = adminClient();
  const userA = await createTestUser({ email: 'dpt-a@test.local' });
  const userB = await createTestUser({ email: 'dpt-b@test.local' });

  await supa.from('push_tokens').insert({
    profile_id: userA.userId,
    token: 'ExponentPushToken[a-token]',
    platform: 'ios',
  });
  await supa.from('push_tokens').insert({
    profile_id: userB.userId,
    token: 'ExponentPushToken[b-token]',
    platform: 'ios',
  });

  // User B attempts to deactivate user A's token (same string).
  // Filter is (profile_id = B AND token = a-token) → matches zero rows.
  const res = await invokeFunction(
    'deactivate-push-token',
    { token: 'ExponentPushToken[a-token]' },
    userB.accessToken,
  );
  assertEquals(res.status, 200);

  const { data: aTokens } = await supa.from('push_tokens').select('id').eq('profile_id', userA.userId);
  assertEquals(aTokens!.length, 1, 'A token must survive');
  const { data: bTokens } = await supa.from('push_tokens').select('id').eq('profile_id', userB.userId);
  assertEquals(bTokens!.length, 1, 'B token unrelated, must survive');
  await cleanupTestData();
});

Deno.test('deactivate-push-token: idempotent — deleting non-existent token returns 200', async () => {
  await cleanupTestData();
  const user = await createTestUser({ email: 'dpt-idem@test.local' });

  const res = await invokeFunction(
    'deactivate-push-token',
    { token: 'ExponentPushToken[never-registered]' },
    user.accessToken,
  );
  // No-op delete is fine — 200 with 0 rows
  assertEquals(res.status, 200);
  await cleanupTestData();
});

Deno.test('deactivate-push-token: unauthorized (no token) rejected', async () => {
  await cleanupTestData();
  const res = await invokeFunction(
    'deactivate-push-token',
    { token: 'ExponentPushToken[any]' },
    undefined,
  );
  assert(res.status === 401 || res.status === 403, `Expected 401/403, got ${res.status}`);
});

Deno.test('deactivate-push-token: invalid input (missing token) rejected', async () => {
  await cleanupTestData();
  const user = await createTestUser({ email: 'dpt-invalid@test.local' });

  const res = await invokeFunction(
    'deactivate-push-token',
    {},
    user.accessToken,
  );
  assertEquals(res.status, 400);
  await cleanupTestData();
});
