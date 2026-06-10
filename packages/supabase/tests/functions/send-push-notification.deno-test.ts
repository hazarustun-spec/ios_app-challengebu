import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('send-push-notification: admin sends → notification row created', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

  const { status, body } = await invokeFunction('send-push-notification', {
    recipientId: alice.userId,
    category: 'match_invitations',
    title: 'Yeni meydan okuma',
    body: 'Ali sana erkek tek meydan okudu',
    data: { matchRequestId: '00000000-0000-0000-0000-000000000123' },
  }, admin.accessToken);
  assertEquals(status, 200);
  const result = body as { notificationId: string; pushed: boolean };

  const supa = adminClient();
  const { data: notif } = await supa.from('notifications').select('*').eq('id', result.notificationId).single();
  assertEquals(notif!.recipient_id, alice.userId);
  assertEquals(notif!.title, 'Yeni meydan okuma');
});

Deno.test('send-push-notification: non-admin forbidden', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });

  const { status } = await invokeFunction('send-push-notification', {
    recipientId: bob.userId,
    category: 'match_invitations',
    title: 'test',
    body: 'test',
  }, alice.accessToken);
  assertEquals(status, 403);
});

Deno.test('send-push-notification: respects user preference OFF', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

  // Disable badges_earned category for alice
  const supa = adminClient();
  await supa.from('notification_preferences').update({ enabled: false })
    .eq('profile_id', alice.userId)
    .eq('category', 'badges_earned');

  const { body } = await invokeFunction('send-push-notification', {
    recipientId: alice.userId,
    category: 'badges_earned',
    title: 'Yeni rozet',
    body: 'İlk maç rozeti kazandın',
  }, admin.accessToken);
  const result = body as { pushed: boolean; reason: string };
  assertEquals(result.pushed, false);
  assertEquals(result.reason, 'preference_off');
});

Deno.test('send-push-notification: no tokens → pushed false', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

  const { body } = await invokeFunction('send-push-notification', {
    recipientId: alice.userId,
    category: 'match_invitations',
    title: 'test',
    body: 'test',
  }, admin.accessToken);
  const result = body as { pushed: boolean; reason: string };
  assertEquals(result.pushed, false);
  assertEquals(result.reason, 'no_tokens');
});
