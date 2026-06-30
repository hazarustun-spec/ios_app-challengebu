import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

Deno.test('admin-update-profile: promotes player to admin', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({ email: `admin-aup-${s}@test.local`, role: 'admin', genderCategory: 'erkek' });
  const alice = await createTestUser({ email: `alice-aup-${s}@test.local`, genderCategory: 'erkek' });
  try {
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
  } finally {
    await teardownUsers([admin.userId, alice.userId]);
  }
});

Deno.test('admin-update-profile: non-admin forbidden', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-aup-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-aup-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const { status } = await invokeFunction(
      'admin-update-profile',
      { targetUserId: bob.userId, role: 'admin' },
      alice.accessToken,
    );
    assertEquals(status, 403);
  } finally {
    await teardownUsers([alice.userId, bob.userId]);
  }
});

Deno.test('admin-update-profile: admin cannot demote self', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({ email: `admin-aup-${s}@test.local`, role: 'admin', genderCategory: 'erkek' });
  try {
    const { status } = await invokeFunction(
      'admin-update-profile',
      { targetUserId: admin.userId, role: 'player' },
      admin.accessToken,
    );
    assertEquals(status, 409);
  } finally {
    await teardownUsers([admin.userId]);
  }
});
