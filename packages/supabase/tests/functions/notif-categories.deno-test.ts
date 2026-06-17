import { assert, assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser } from './helpers.ts';

/**
 * Plan 8 Task A3 — `notification_category` enum revision.
 *
 * Plan 8 UI design uses a different set of categories than the pre-Plan-8
 * backend enum. This migration realigns both the enum values AND the default
 * preference seeds so the mobile Bildirimler + Ayarlar screens map 1:1.
 *
 * Final enum (8 values):
 *   match_invitations, match_score_pending, badges_earned, season_lifecycle,
 *   ladder_movement, community_announcements, open_listings, match_reminders
 *
 * Dropped values (pre-launch — no data preserved):
 *   match_proposals, score_confirmations, elo_and_ranking, badges,
 *   season_and_tournament, inactivity_warning
 *   (plus the placeholders dispute_updates / doubles_invitations called out
 *   in the task plan, which never existed in our enum.)
 */

Deno.test('notif categories: new values accepted, old values rejected', async () => {
  await cleanupTestData();
  const supa = adminClient();
  const user = await createTestUser({ email: 'notif-cat@test.local' });

  // open_listings should succeed
  const okOpen = await supa.from('notification_preferences').upsert({
    profile_id: user.userId,
    category: 'open_listings',
    enabled: true,
  }, { onConflict: 'profile_id,category' });
  assertEquals(okOpen.error, null, `open_listings insert failed: ${okOpen.error?.message}`);

  // match_reminders should succeed
  const okRem = await supa.from('notification_preferences').upsert({
    profile_id: user.userId,
    category: 'match_reminders',
    enabled: true,
  }, { onConflict: 'profile_id,category' });
  assertEquals(okRem.error, null, `match_reminders insert failed: ${okRem.error?.message}`);

  // dispute_updates should fail (enum value not defined)
  const failDispute = await supa.from('notification_preferences').upsert({
    profile_id: user.userId,
    category: 'dispute_updates' as never,
    enabled: true,
  }, { onConflict: 'profile_id,category' });
  assert(failDispute.error !== null, 'dispute_updates should be rejected');

  // doubles_invitations should fail (enum value not defined)
  const failDoubles = await supa.from('notification_preferences').upsert({
    profile_id: user.userId,
    category: 'doubles_invitations' as never,
    enabled: true,
  }, { onConflict: 'profile_id,category' });
  assert(failDoubles.error !== null, 'doubles_invitations should be rejected');

  // legacy pre-Plan-8 values should also be rejected post-migration
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

  await cleanupTestData();
});

Deno.test('notif categories: default prefs trigger seeds 9 categories per new profile', async () => {
  await cleanupTestData();
  const supa = adminClient();
  const user = await createTestUser({ email: 'notif-default@test.local' });

  const { data } = await supa.from('notification_preferences')
    .select('category, enabled')
    .eq('profile_id', user.userId);

  // Pin enabled=true for all — Plan 8 A3 deliberately flipped the legacy
  // elo_and_ranking=false default to ladder_movement=true. Without this
  // assertion, a future migration that silently turns one off would slip
  // through unnoticed. message_received was added by the messaging feature.
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

  await cleanupTestData();
});
