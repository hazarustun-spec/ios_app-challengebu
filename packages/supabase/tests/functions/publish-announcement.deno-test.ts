import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

Deno.test('publish-announcement: inserts row + fans out notifications to all profiles', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({
    email: `admin-pa-${s}@test.local`,
    role: 'admin',
    genderCategory: 'erkek',
  });
  const alice = await createTestUser({ email: `alice-pa-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-pa-${s}@test.local`, genderCategory: 'kadin' });
  try {
    const supa = adminClient();
    const { status, body } = await invokeFunction(
      'publish-announcement',
      {
        title: `Duyuru-${s}`,
        body: 'Yarın Kort 1 boyacılarda olacak.',
        targetFilter: {},
        sendPush: false,
      },
      admin.accessToken,
    );
    assertEquals(status, 200);
    const result = body as { announcementId: string; recipientCount: number };

    const { data: notifs } = await supa
      .from('notifications')
      .select('recipient_id, category, title')
      .eq('category', 'community_announcements')
      .eq('title', `Duyuru-${s}`);

    const recipientSet = new Set((notifs ?? []).map((n) => n.recipient_id));
    // All three of our test users must be in the recipient set.
    assertEquals(recipientSet.has(admin.userId), true);
    assertEquals(recipientSet.has(alice.userId), true);
    assertEquals(recipientSet.has(bob.userId), true);
    // recipientCount from the function must be >= 3 (there may be other DB users)
    if (result.recipientCount < 3) throw new Error(`recipientCount ${result.recipientCount} should be >= 3`);
    assertEquals(notifs![0].title, `Duyuru-${s}`);
  } finally {
    await teardownUsers([admin.userId, alice.userId, bob.userId]);
  }
});

Deno.test('publish-announcement: filter by genderCategory', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({
    email: `admin-pa-${s}@test.local`,
    role: 'admin',
    genderCategory: 'erkek',
  });
  const alice = await createTestUser({ email: `alice-pa-${s}@test.local`, genderCategory: 'kadin' });
  const bob = await createTestUser({ email: `bob-pa-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const supa = adminClient();
    const { body } = await invokeFunction(
      'publish-announcement',
      {
        title: `Kadin-${s}`,
        body: 'Başvurular açıldı.',
        targetFilter: { genderCategory: 'kadin' },
        sendPush: false,
      },
      admin.accessToken,
    );
    const result = body as { recipientCount: number };

    // Only alice (genderCategory=kadin) among our test users should receive it.
    // recipientCount could be larger if there are other kadin users in the DB.
    if (result.recipientCount < 1) throw new Error('expected at least 1 recipient');

    const { data: aliceNotif } = await supa
      .from('notifications')
      .select('id')
      .eq('recipient_id', alice.userId)
      .eq('category', 'community_announcements')
      .eq('title', `Kadin-${s}`);
    assertEquals((aliceNotif ?? []).length, 1, 'alice should have received the announcement');

    const { data: bobNotif } = await supa
      .from('notifications')
      .select('id')
      .eq('recipient_id', bob.userId)
      .eq('category', 'community_announcements')
      .eq('title', `Kadin-${s}`);
    assertEquals((bobNotif ?? []).length, 0, 'bob (erkek) should NOT have received the kadin announcement');
  } finally {
    await teardownUsers([admin.userId, alice.userId, bob.userId]);
  }
});

Deno.test('publish-announcement: non-admin forbidden', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-pa-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const { status } = await invokeFunction(
      'publish-announcement',
      { title: 't', body: 'b', targetFilter: {}, sendPush: false },
      alice.accessToken,
    );
    assertEquals(status, 403);
  } finally {
    await teardownUsers([alice.userId]);
  }
});
