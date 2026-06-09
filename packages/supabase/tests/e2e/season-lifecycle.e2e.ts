import { assert, assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from '../functions/helpers.ts';

Deno.test('season-lifecycle E2E: close-season + start-season-finale', async () => {
  await cleanupTestData();
  const admin = await createTestUser({
    email: 'admin@test.local',
    role: 'admin',
    genderCategory: 'erkek',
  });

  const players: Array<{ userId: string; accessToken: string }> = [];
  for (let i = 0; i < 8; i++) {
    const p = await createTestUser({
      email: `player${i}@test.local`,
      genderCategory: 'erkek',
      firstName: `Player${i}`,
      lastName: 'Test',
    });
    players.push(p);
  }
  const supa = adminClient();

  for (let i = 0; i < players.length; i++) {
    const rating = 1400 + (8 - i) * 25;
    await supa.from('elo_ratings').upsert(
      {
        profile_id: players[i].userId,
        category: 'erkek_tek',
        rating,
        matches_played: 15,
      },
      { onConflict: 'profile_id,category' },
    );
  }

  const { data: season } = await supa
    .from('seasons')
    .insert({
      name: 'bahar',
      year: 2026,
      starts_at: '2026-01-26',
      ends_at: '2026-06-30',
      finale_starts_at: '2026-06-21',
      finale_ends_at: '2026-06-30',
      status: 'active',
    })
    .select('id')
    .single();
  assert(season, 'season insert returned data');

  const finaleStart = await invokeFunction(
    'start-season-finale',
    { seasonId: season!.id },
    admin.accessToken,
  );
  assertEquals(finaleStart.status, 200);

  const { data: tournament } = await supa
    .from('tournaments')
    .select('id, bracket_size, status')
    .eq('season_id', season!.id)
    .eq('category', 'erkek_tek')
    .single();
  assert(tournament, 'erkek_tek tournament created');
  assertEquals(tournament!.bracket_size, 8);
  assertEquals(tournament!.status, 'seeded');

  const { data: bracketMatches } = await supa
    .from('tournament_matches')
    .select('round, bracket_position, seed_a, seed_b')
    .eq('tournament_id', tournament!.id)
    .order('bracket_position', { ascending: true });
  assertEquals((bracketMatches ?? []).length, 4);
  assertEquals(bracketMatches?.[0].seed_a, 1);
  assertEquals(bracketMatches?.[0].seed_b, 8);

  const { data: standings } = await supa
    .from('season_standings')
    .select('rank, profile_id')
    .eq('season_id', season!.id)
    .eq('category', 'erkek_tek')
    .order('rank', { ascending: true });
  assertEquals((standings ?? []).length, 8);
  assertEquals(standings?.[0].profile_id, players[0].userId);

  const closeRes = await invokeFunction(
    'close-season',
    { seasonId: season!.id },
    admin.accessToken,
  );
  assertEquals(closeRes.status, 200);

  const { data: ratingsAfter } = await supa
    .from('elo_ratings')
    .select('profile_id, rating, matches_played')
    .eq('category', 'erkek_tek')
    .in('profile_id', players.map((p) => p.userId));
  for (const row of ratingsAfter ?? []) {
    const i = players.findIndex((p) => p.userId === row.profile_id);
    const original = 1400 + (8 - i) * 25;
    const expected = Math.round((original + 1200) / 2);
    assertEquals(row.rating, expected, `player${i} soft-reset expected ${expected} got ${row.rating}`);
    assertEquals(row.matches_played, 0);
  }

  const { data: closedSeason } = await supa
    .from('seasons')
    .select('status')
    .eq('id', season!.id)
    .single();
  assertEquals(closedSeason!.status, 'closed');
});
