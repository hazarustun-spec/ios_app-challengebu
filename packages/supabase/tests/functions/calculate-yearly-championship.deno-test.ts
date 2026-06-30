import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

Deno.test('calculate-yearly-championship: admin computes points across seasons', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({
    email: `admin-cyc-${s}@test.local`,
    role: 'admin',
    genderCategory: 'erkek',
  });
  const alice = await createTestUser({ email: `alice-cyc-${s}@test.local`, genderCategory: 'erkek' });
  const supa = adminClient();

  // Use a unique year far from real seasons to avoid collisions
  const year = 2090 + parseInt(s.slice(0, 2), 16) % 5;

  const { data: s1 } = await supa.from('seasons').insert({
    name: 'guz', year,
    starts_at: `${year}-09-01`, ends_at: `${year}-12-31`,
    finale_starts_at: `${year}-12-20`, finale_ends_at: `${year}-12-30`,
    status: 'closed',
  }).select('id').single();
  const { data: s2 } = await supa.from('seasons').insert({
    name: 'bahar', year,
    starts_at: `${year}-02-01`, ends_at: `${year}-06-30`,
    finale_starts_at: `${year}-06-20`, finale_ends_at: `${year}-06-30`,
    status: 'closed',
  }).select('id').single();

  try {
    await supa.from('season_standings').insert({
      season_id: s1!.id, profile_id: alice.userId, category: 'erkek_tek',
      final_rating: 1500, rank: 1, matches_played: 10,
    });
    await supa.from('season_standings').insert({
      season_id: s2!.id, profile_id: alice.userId, category: 'erkek_tek',
      final_rating: 1450, rank: 2, matches_played: 8,
    });

    const { status, body } = await invokeFunction(
      'calculate-yearly-championship', { year }, admin.accessToken,
    );
    assertEquals(status, 200);
    if (((body as { categoriesCalculated: number }).categoriesCalculated) < 1) {
      throw new Error('expected at least 1 category calculated');
    }

    const { data: yc } = await supa
      .from('yearly_championship')
      .select('*')
      .eq('year', year)
      .eq('category', 'erkek_tek')
      .eq('profile_id', alice.userId)
      .single();
    // Champion (100) + 2nd place (70) = 170
    assertEquals(yc!.total_finale_points, 170);
    assertEquals(yc!.rank, 1);
  } finally {
    await teardownUsers(
      [admin.userId, alice.userId],
      { seasonIds: [s1!.id, s2!.id] },
    );
  }
});

Deno.test('calculate-yearly-championship: non-admin forbidden', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const player = await createTestUser({ email: `player-cyc-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const { status } = await invokeFunction('calculate-yearly-championship', { year: 2026 }, player.accessToken);
    assertEquals(status, 403);
  } finally {
    await teardownUsers([player.userId]);
  }
});
