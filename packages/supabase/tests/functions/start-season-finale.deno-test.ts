import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

async function seedRatings(category: string, count: number): Promise<{ adminToken: string; seasonId: string }> {
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const supa = adminClient();

  // Create N players with descending ratings
  for (let i = 0; i < count; i++) {
    const u = await createTestUser({ email: `p${i}@test.local`, genderCategory: 'erkek' });
    await supa.from('elo_ratings').upsert({
      profile_id: u.userId,
      category,
      rating: 1500 - i * 10, // 1500, 1490, 1480, ...
      matches_played: 20,
    }, { onConflict: 'profile_id,category' });
  }

  // Create a season
  const { data: season } = await supa.from('seasons').insert({
    name: 'guz',
    year: 2026,
    starts_at: '2026-09-01T00:00:00Z',
    ends_at: '2026-12-31T23:59:59Z',
    finale_starts_at: '2026-12-20T00:00:00Z',
    finale_ends_at: '2026-12-30T23:59:59Z',
    status: 'finale',
  }).select('id').single();

  return { adminToken: admin.accessToken, seasonId: season!.id };
}

Deno.test('start-season-finale: 8 erkek_tek players → tournament + 4 first-round matches', async () => {
  await cleanupTestData();
  const { adminToken, seasonId } = await seedRatings('erkek_tek', 8);

  const { status, body } = await invokeFunction('start-season-finale', { seasonId }, adminToken);
  assertEquals(status, 200);
  const result = body as { tournamentCount: number };
  if (result.tournamentCount < 1) throw new Error(`Expected at least 1 tournament, got ${result.tournamentCount}`);

  const supa = adminClient();
  const { data: tournaments } = await supa
    .from('tournaments')
    .select('id, category, bracket_size')
    .eq('season_id', seasonId);
  const erkekTekT = tournaments?.find((t) => t.category === 'erkek_tek');
  if (!erkekTekT) throw new Error('erkek_tek tournament missing');
  assertEquals(erkekTekT.bracket_size, 8);

  const { data: matches } = await supa
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', erkekTekT.id)
    .eq('round', 1);
  assertEquals(matches!.length, 4);

  // Verify seed pairs: 1v8, 4v5, 3v6, 2v7
  const seedPairs = matches!.map((m) => [m.seed_a, m.seed_b].sort((a, b) => a - b)).sort();
  assertEquals(seedPairs, [[1, 8], [2, 7], [3, 6], [4, 5]]);
});

Deno.test('start-season-finale: non-admin forbidden', async () => {
  await cleanupTestData();
  await seedRatings('erkek_tek', 8);
  const player = await createTestUser({ email: 'player@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: season } = await supa.from('seasons').select('id').single();

  const { status } = await invokeFunction('start-season-finale', { seasonId: season!.id }, player.accessToken);
  assertEquals(status, 403);
});

Deno.test('start-season-finale: insufficient players skips category', async () => {
  await cleanupTestData();
  // Only seed 4 erkek_tek (less than top 8 required for singles bracket)
  const { adminToken, seasonId } = await seedRatings('erkek_tek', 4);

  const { status } = await invokeFunction('start-season-finale', { seasonId }, adminToken);
  assertEquals(status, 200);

  const supa = adminClient();
  const { data: t } = await supa.from('tournaments').select('*').eq('season_id', seasonId).eq('category', 'erkek_tek');
  // Insufficient → no tournament created for erkek_tek
  assertEquals(t!.length, 0);
});

Deno.test('start-season-finale: erkek_cift forms 4 teams from match history, seeds by avg rating', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const supa = adminClient();

  // 8 players for 4 doubles teams (P0+P1, P2+P3, P4+P5, P6+P7), seasoned with descending ratings.
  const players: { userId: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const u = await createTestUser({ email: `dp${i}@test.local`, genderCategory: 'erkek' });
    players.push({ userId: u.userId });
    await supa.from('elo_ratings').upsert({
      profile_id: u.userId,
      category: 'erkek_cift',
      rating: 1500 - i * 20,
      matches_played: 10,
    }, { onConflict: 'profile_id,category' });
  }

  const { data: season } = await supa.from('seasons').insert({
    name: 'guz', year: 2026,
    starts_at: '2026-09-01T00:00:00Z',
    ends_at: '2026-12-31T23:59:59Z',
    finale_starts_at: '2026-12-20T00:00:00Z',
    finale_ends_at: '2026-12-30T23:59:59Z',
    status: 'finale',
  }).select('id').single();

  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const teams: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7]];

  // Each team plays 3 confirmed doubles matches within the season window — opponent team rotates.
  for (let pairIdx = 0; pairIdx < teams.length; pairIdx++) {
    for (let round = 0; round < 3; round++) {
      const opp = teams[(pairIdx + 1 + round) % teams.length];
      const us = teams[pairIdx];
      await supa.from('matches').insert({
        category: 'erkek_cift',
        format: 'bu_klasik',
        court_id: court!.id,
        played_at: '2026-10-15T18:00:00Z',
        is_rated: true,
        team_a_player_ids: [players[us[0]].userId, players[us[1]].userId],
        team_b_player_ids: [players[opp[0]].userId, players[opp[1]].userId],
        score_team_a: 4,
        score_team_b: round, // varied scores so the rows look real
        winner_team: 'a',
        status: 'confirmed',
        confirmed_by: [players[us[0]].userId, players[opp[0]].userId],
        confirmed_at: '2026-10-15T19:30:00Z',
      });
    }
  }

  const { status, body } = await invokeFunction('start-season-finale', { seasonId: season!.id }, admin.accessToken);
  assertEquals(status, 200);
  if ((body as { tournamentCount: number }).tournamentCount < 1) {
    throw new Error('erkek_cift tournament was not created');
  }

  // season_doubles_teams should hold 4 ranked teams.
  const { data: dTeams } = await supa
    .from('season_doubles_teams')
    .select('rank, player_a_id, player_b_id, avg_rating')
    .eq('season_id', season!.id)
    .eq('category', 'erkek_cift')
    .order('rank', { ascending: true });
  assertEquals(dTeams!.length, 4);
  // Highest avg rating team must be rank 1; players[0]+[1] avg = (1500+1480)/2 = 1490.
  assertEquals(dTeams![0].rank, 1);
  assertEquals(dTeams![0].avg_rating, 1490);

  // The cift tournament must have bracket_size 4 and 2 first-round matches (SF).
  const { data: tournament } = await supa
    .from('tournaments')
    .select('id, bracket_size')
    .eq('season_id', season!.id)
    .eq('category', 'erkek_cift')
    .single();
  assertEquals(tournament!.bracket_size, 4);

  const { data: tMatches } = await supa
    .from('tournament_matches')
    .select('seed_a, seed_b')
    .eq('tournament_id', tournament!.id)
    .eq('round', 1)
    .order('bracket_position', { ascending: true });
  assertEquals(tMatches!.length, 2);
  assertEquals([tMatches![0].seed_a, tMatches![0].seed_b], [1, 4]);
  assertEquals([tMatches![1].seed_a, tMatches![1].seed_b], [2, 3]);
});
