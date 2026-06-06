import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('anonymize-account: player anonymizes self', async () => {
  await cleanupTestData();
  const alice = await createTestUser({
    email: 'alice@test.local',
    genderCategory: 'erkek',
    firstName: 'Alice',
    lastName: 'Smith',
  });

  // Register a push token first
  const supa = adminClient();
  await supa.from('push_tokens').insert({
    profile_id: alice.userId,
    token: 'ExponentPushToken[test-token-aaa]',
    platform: 'ios',
  });

  const { status, body } = await invokeFunction('anonymize-account', {}, alice.accessToken);
  assertEquals(status, 200);
  assertEquals((body as { status: string }).status, 'anonymized');

  // Profile is anonymized
  const { data: profile } = await supa
    .from('profiles')
    .select('*')
    .eq('user_id', alice.userId)
    .single();
  assertEquals(profile!.first_name, 'Eski');
  assertEquals(profile!.last_name, 'Üye');
  assertEquals(profile!.phone, null);
  assertEquals(profile!.avatar_url, null);
  assertEquals(profile!.status, 'anonymized');
  assertEquals((profile!.email as string).startsWith('anonymized-'), true);

  // Push tokens removed
  const { data: tokens } = await supa
    .from('push_tokens')
    .select('*')
    .eq('profile_id', alice.userId);
  assertEquals(tokens!.length, 0);

  // Audit log written
  const { data: audit } = await supa
    .from('audit_log')
    .select('*')
    .eq('action', 'anonymize_account')
    .eq('actor_id', alice.userId)
    .single();
  if (!audit) throw new Error('audit row missing');

  // auth.users row still exists (we don't delete it because of FK cascade to profiles).
  // The user is locked out via signOut + anonymized email; profile remains for ELO history.
  const { data: users } = await supa.auth.admin.listUsers();
  const stillThere = users.users.find((u) => u.id === alice.userId);
  if (!stillThere) throw new Error('auth.users row should still exist (anonymize preserves history)');
});

Deno.test('anonymize-account: last admin cannot delete', async () => {
  await cleanupTestData();
  const adminUser = await createTestUser({
    email: 'admin@test.local',
    role: 'admin',
    genderCategory: 'erkek',
  });

  const { status, body } = await invokeFunction('anonymize-account', {}, adminUser.accessToken);
  assertEquals(status, 403);
  const msg = (body as { error: { message: string } }).error.message.toLowerCase();
  assertEquals(msg.includes('admin'), true);
});

Deno.test('anonymize-account: admin can delete if another admin exists', async () => {
  await cleanupTestData();
  const admin1 = await createTestUser({
    email: 'admin1@test.local',
    role: 'admin',
    genderCategory: 'erkek',
  });
  await createTestUser({
    email: 'admin2@test.local',
    role: 'admin',
    genderCategory: 'erkek',
  });

  const { status } = await invokeFunction('anonymize-account', {}, admin1.accessToken);
  assertEquals(status, 200);
});
