import { assert, assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, teardownUsers } from './helpers.ts';

/**
 * Plan 8 Task A3 — `notification_category` enum revision.
 */

Deno.test('notif categories: new values accepted, old values rejected', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const user = await createTestUser({ email: `notif-cat-${s}@test.local` });
  try {
    const supa = adminClient();

    const okOpen = await supa.from('notification_preferences').upsert({
      profile_id: user.userId,
      category: 'open_listings',
      enabled: true,
    }, { onConflict: 'profile_id,category' });
    assertEquals(okOpen.error, null, `open_listings insert failed: ${okOpen.error?.message}`);

    const okRem = await supa.from('notification_preferences').upsert({
      profile_id: user.userId,
      category: 'match_reminders',
      enabled: true,
    }, { onConflict: 'profile_id,category' });
    assertEquals(okRem.error, null, `match_reminders insert failed: ${okRem.error?.message}`);

    const failDispute = await supa.from('notification_preferences').upsert({
      profile_id: user.userId,
      category: 'dispute_updates' as never,
      enabled: true,
    }, { onConflict: 'profile_id,category' });
    assert(failDispute.error !== null, 'dispute_updates should be rejected');

    const failDoubles = await supa.from('notification_preferences').upsert({
      profile_id: user.userId,
      category: 'doubles_invitations' as never,
      enabled: true,
    }, { onConflict: 'profile_id,category' });
    assert(failDoubles.error !== null, 'doubles_invitations should be rejected');

    const failProposals = await supa.from('notification_preferences').upsert({
      profile_id: user.userId,
      category: 'match_proposals' as never,
      enabled: true,
    }, { onConflict: 'profile_id,category' });
    assert(failProposals.error !== null, 'match_proposals (legacy) should be rejected');

    const failInactivity = await supa.from('notification_preferences').upsert({
      profile_id: user.userId,
      category: 'inactivity_warning' as never,
      enabled: true,
    }, { onConflict: 'profile_id,category' });
    assert(failInactivity.error !== null, 'inactivity_warning (legacy) should be rejected');
  } finally {
    await teardownUsers([user.userId]);
  }
});

Deno.test('notif categories: default prefs trigger seeds 9 categories per new profile', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const user = await createTestUser({ email: `notif-default-${s}@test.local` });
  try {
    const supa = adminClient();
    const { data } = await supa.from('notification_preferences')
      .select('category, enabled')
      .eq('profile_id', user.userId);

    const allOn = (data ?? []).every((r) => r.enabled === true);
    assertEquals(allOn, true, `expected all default prefs to be enabled=true`);

    const cats = (data ?? []).map((r) => r.category).sort();
    assertEquals(cats.length, 9, `expected 9 default prefs, got ${cats.length}`);
    assertEquals(cats, [
      'badges_earned',
      'community_announcements',
      'ladder_movement',
      'match_invitations',
      'match_reminders',
      'match_score_pending',
      'message_received',
      'open_listings',
      'season_lifecycle',
    ]);
  } finally {
    await teardownUsers([user.userId]);
  }
});
