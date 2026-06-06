import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('close-season: applies soft ELO reset', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const supa = adminClient();

  // Set alice rating to 1500
  await supa.from('elo_ratings').upsert({
    profile_id: alice.userId,
    category: 'erkek_tek',
    rating: 1500,
    matches_played: 20,
  }, { onConflict: 'profile_id,category' });

  const { data: season } = await supa.from('seasons').insert({
    name: 'guz', year: 2026,
    starts_at: '2026-09-01', ends_at: '2026-12-31',
    finale_starts_at: '2026-12-20', finale_ends_at: '2026-12-30',
    status: 'finale',
  }).select('id').single();

  const { status } = await invokeFunction('close-season', { seasonId: season!.id }, admin.accessToken);
  assertEquals(status, 200);

  // Alice's rating should be (1500 + 1200) / 2 = 1350
  const { data: r } = await supa
    .from('elo_ratings')
    .select('rating, matches_played')
    .eq('profile_id', alice.userId)
    .eq('category', 'erkek_tek')
    .single();
  assertEquals(r!.rating, 1350);
  assertEquals(r!.matches_played, 0);
});

Deno.test('close-season: non-admin forbidden', async () => {
  await cleanupTestData();
  const player = await createTestUser({ email: 'player@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: season } = await supa.from('seasons').insert({
    name: 'guz', year: 2026,
    starts_at: '2026-09-01', ends_at: '2026-12-31',
    finale_starts_at: '2026-12-20', finale_ends_at: '2026-12-30',
    status: 'finale',
  }).select('id').single();

  const { status } = await invokeFunction('close-season', { seasonId: season!.id }, player.accessToken);
  assertEquals(status, 403);
});

Deno.test('close-season: already closed returns 409', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: season } = await supa.from('seasons').insert({
    name: 'guz', year: 2026,
    starts_at: '2026-09-01', ends_at: '2026-12-31',
    finale_starts_at: '2026-12-20', finale_ends_at: '2026-12-30',
    status: 'closed',
  }).select('id').single();

  const { status } = await invokeFunction('close-season', { seasonId: season!.id }, admin.accessToken);
  assertEquals(status, 409);
});
