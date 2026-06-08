import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('calculate-yearly-championship: admin computes points across seasons', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const supa = adminClient();

  // Two seasons in 2026 where alice ranked 1st in erkek_tek
  const { data: s1 } = await supa.from('seasons').insert({
    name: 'guz', year: 2026,
    starts_at: '2026-09-01', ends_at: '2026-12-31',
    finale_starts_at: '2026-12-20', finale_ends_at: '2026-12-30',
    status: 'closed',
  }).select('id').single();
  const { data: s2 } = await supa.from('seasons').insert({
    name: 'bahar', year: 2026,
    starts_at: '2026-02-01', ends_at: '2026-06-30',
    finale_starts_at: '2026-06-20', finale_ends_at: '2026-06-30',
    status: 'closed',
  }).select('id').single();

  await supa.from('season_standings').insert({
    season_id: s1!.id, profile_id: alice.userId, category: 'erkek_tek',
    final_rating: 1500, rank: 1, matches_played: 10,
  });
  await supa.from('season_standings').insert({
    season_id: s2!.id, profile_id: alice.userId, category: 'erkek_tek',
    final_rating: 1450, rank: 2, matches_played: 8,
  });

  const { status, body } = await invokeFunction('calculate-yearly-championship', { year: 2026 }, admin.accessToken);
  assertEquals(status, 200);
  if (((body as { categoriesCalculated: number }).categoriesCalculated) < 1) {
    throw new Error('expected at least 1 category calculated');
  }

  const { data: yc } = await supa
    .from('yearly_championship')
    .select('*')
    .eq('year', 2026)
    .eq('category', 'erkek_tek')
    .eq('profile_id', alice.userId)
    .single();
  // Champion (100) + 2nd place (70) = 170
  assertEquals(yc!.total_finale_points, 170);
  assertEquals(yc!.rank, 1);
});

Deno.test('calculate-yearly-championship: non-admin forbidden', async () => {
  await cleanupTestData();
  const player = await createTestUser({ email: 'player@test.local', genderCategory: 'erkek' });
  const { status } = await invokeFunction('calculate-yearly-championship', { year: 2026 }, player.accessToken);
  assertEquals(status, 403);
});
