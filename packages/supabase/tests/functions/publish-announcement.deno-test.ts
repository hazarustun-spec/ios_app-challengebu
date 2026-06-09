import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('publish-announcement: inserts row + fans out notifications', async () => {
  await cleanupTestData();
  const admin = await createTestUser({
    email: 'admin@test.local',
    role: 'admin',
    genderCategory: 'erkek',
  });
  await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  await createTestUser({ email: 'bob@test.local', genderCategory: 'kadin' });

  const { status, body } = await invokeFunction(
    'publish-announcement',
    {
      title: 'Saha temizliği duyurusu',
      body: 'Yarın Kort 1 boyacılarda olacak.',
      targetFilter: {},
      sendPush: false,
    },
    admin.accessToken,
  );
  assertEquals(status, 200);
  const result = body as { announcementId: string; recipientCount: number };

  const supa = adminClient();
  const { data: notifs } = await supa
    .from('notifications')
    .select('recipient_id, category, title')
    .eq('category', 'community_announcements');
  const recipientSet = new Set((notifs ?? []).map((n) => n.recipient_id));
  // admin + alice + bob = 3 profiles in DB
  assertEquals(recipientSet.size, 3);
  assertEquals(result.recipientCount, 3);
  // sanity: title propagated
  assertEquals(notifs![0].title, 'Saha temizliği duyurusu');
});

Deno.test('publish-announcement: filter by genderCategory', async () => {
  await cleanupTestData();
  const admin = await createTestUser({
    email: 'admin@test.local',
    role: 'admin',
    genderCategory: 'erkek',
  });
  await createTestUser({ email: 'alice@test.local', genderCategory: 'kadin' });
  await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });

  const { body } = await invokeFunction(
    'publish-announcement',
    {
      title: 'Kadın tek turnuvası',
      body: 'Başvurular açıldı.',
      targetFilter: { genderCategory: 'kadin' },
      sendPush: false,
    },
    admin.accessToken,
  );
  const result = body as { recipientCount: number };
  assertEquals(result.recipientCount, 1);
  void admin;
});

Deno.test('publish-announcement: non-admin forbidden', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });

  const { status } = await invokeFunction(
    'publish-announcement',
    { title: 't', body: 'b', targetFilter: {}, sendPush: false },
    alice.accessToken,
  );
  assertEquals(status, 403);
});
