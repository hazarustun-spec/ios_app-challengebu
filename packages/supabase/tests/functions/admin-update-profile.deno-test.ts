import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('admin-update-profile: promotes player to admin', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

  const { status, body } = await invokeFunction(
    'admin-update-profile',
    { targetUserId: alice.userId, role: 'admin', notes: 'co-admin' },
    admin.accessToken,
  );
  assertEquals(status, 200);
  const result = body as { role: string };
  assertEquals(result.role, 'admin');

  const supa = adminClient();
  const { data: prof } = await supa.from('profiles').select('role').eq('user_id', alice.userId).single();
  assertEquals(prof!.role, 'admin');

  const { data: audit } = await supa
    .from('audit_log')
    .select('action, entity_id')
    .eq('action', 'admin_update_profile')
    .eq('entity_id', alice.userId)
    .single();
  assertEquals(audit!.action, 'admin_update_profile');
});

Deno.test('admin-update-profile: non-admin forbidden', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });

  const { status } = await invokeFunction(
    'admin-update-profile',
    { targetUserId: bob.userId, role: 'admin' },
    alice.accessToken,
  );
  assertEquals(status, 403);
});

Deno.test('admin-update-profile: admin cannot demote self', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });

  const { status } = await invokeFunction(
    'admin-update-profile',
    { targetUserId: admin.userId, role: 'player' },
    admin.accessToken,
  );
  assertEquals(status, 409);
});
