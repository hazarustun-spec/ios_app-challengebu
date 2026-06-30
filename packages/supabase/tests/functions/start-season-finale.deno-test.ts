import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

async function seedRatings(suffix: string, category: string, count: number): Promise<{
  adminToken: string; seasonId: string; adminId: string; playerIds: string[];
}> {
  const admin = await createTestUser({
    email: `admin-ssf-${suffix}@test.local`, role: 'admin', genderCategory: 'erkek',
  });
  const supa = adminClient();
  const playerIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const u = await createTestUser({ email: `p${i}-ssf-${suffix}@test.local`, genderCategory: 'erkek' });
    playerIds.push(u.userId);
    await supa.from('elo_ratings').upsert({
      profile_id: u.userId, category, rating: 1500 - i * 10, matches_played: 20,
    }, { onConflict: 'profile_id,category' });
  }

  const year = 3000 + parseInt(suffix.slice(0, 4), 16);
  const { data: season, error: seasonErr } = await supa.from('seasons').insert({
    name: 'guz', year,
    starts_at: '2026-09-01T00:00:00Z', ends_at: '2026-12-31T23:59:59Z',
    finale_starts_at: '2026-12-20T00:00:00Z', finale_ends_at: '2026-12-30T23:59:59Z',
    status: 'active',
  }).select('id').single();
  if (!season || seasonErr) throw new Error(`seedRatings: season insert failed for suffix ${suffix}: ${seasonErr?.message}`);

  return { adminToken: admin.accessToken, seasonId: season.id, adminId: admin.userId, playerIds };
}

Deno.test('start-season-finale: 8 erkek_tek players → tournament + 4 first-round matches', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { adminToken, seasonId, adminId, playerIds } = await seedRatings(s, 'erkek_tek', 8);
  try {
    const { status, body } = await invokeFunction('start-season-finale', { seasonId }, adminToken);
    assertEquals(status, 200);
    const result = body as { tournamentCount: number };
    if (result.tournamentCount < 1) throw new Error(`Expected at least 1 tournament, got ${result.tournamentCount}`);

    const supa = adminClient();
    const { data: tournaments } = await supa
      .from('tournaments').select('id, category, bracket_size').eq('season_id', seasonId);
    const erkekTekT = tournaments?.find((t) => t.category === 'erkek_tek');
    if (!erkekTekT) throw new Error('erkek_tek tournament missing');
    assertEquals(erkekTekT.bracket_size, 8);

    const { data: matches } = await supa
      .from('tournament_matches').select('*').eq('tournament_id', erkekTekT.id).eq('round', 1);
    assertEquals(matches!.length, 4);

    const seedPairs = matches!.map((m) => [m.seed_a, m.seed_b].sort((a, b) => a - b)).sort();
    assertEquals(seedPairs, [[1, 8], [2, 7], [3, 6], [4, 5]]);
  } finally {
    await teardownUsers([adminId, ...playerIds], { seasonIds: [seasonId] });
  }
});

Deno.test('start-season-finale: non-admin forbidden', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { seasonId, adminId, playerIds } = await seedRatings(s, 'erkek_tek', 8);
  const player = await createTestUser({ email: `player-ssf-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const { status } = await invokeFunction('start-season-finale', { seasonId }, player.accessToken);
    assertEquals(status, 403);
  } finally {
    await teardownUsers([adminId, player.userId, ...playerIds], { seasonIds: [seasonId] });
  }
});

Deno.test('start-season-finale: insufficient players skips category', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  // Use 'kadin_tek' instead of 'erkek_tek' — no other test file seeds kadin_tek ELO ratings,
  // so the global count stays exactly 4 (insufficient) even when tests run concurrently.
  const { adminToken, seasonId, adminId, playerIds } = await seedRatings(s, 'kadin_tek', 4);
  try {
    const { status } = await invokeFunction('start-season-finale', { seasonId }, adminToken);
    assertEquals(status, 200);

    const supa = adminClient();
    const { data: t } = await supa.from('tournaments').select('*').eq('season_id', seasonId).eq('category', 'kadin_tek');
    assertEquals(t!.length, 0);
  } finally {
    await teardownUsers([adminId, ...playerIds], { seasonIds: [seasonId] });
  }
});

Deno.test('start-season-finale: erkek_cift forms 4 teams from match history, seeds by avg rating', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({
    email: `admin-ssf-${s}@test.local`, role: 'admin', genderCategory: 'erkek',
  });
  const supa = adminClient();

  const players: { userId: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const u = await createTestUser({ email: `dp${i}-ssf-${s}@test.local`, genderCategory: 'erkek' });
    players.push({ userId: u.userId });
    await supa.from('elo_ratings').upsert({
      profile_id: u.userId, category: 'erkek_cift',
      rating: 1500 - i * 20, matches_played: 10,
    }, { onConflict: 'profile_id,category' });
  }

  const ssfYear = 3000 + parseInt(s.slice(0, 4), 16);
  const { data: season, error: seasonErr } = await supa.from('seasons').insert({
    name: 'guz', year: ssfYear,
    starts_at: '2026-09-01T00:00:00Z', ends_at: '2026-12-31T23:59:59Z',
    finale_starts_at: '2026-12-20T00:00:00Z', finale_ends_at: '2026-12-30T23:59:59Z',
    status: 'active',
  }).select('id').single();
  if (!season || seasonErr) throw new Error(`season insert failed for suffix ${s}: ${seasonErr?.message}`);
  const seasonId = season.id;

  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const teams: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7]];

  const matchIds: string[] = [];
  for (let pairIdx = 0; pairIdx < teams.length; pairIdx++) {
    for (let round = 0; round < 3; round++) {
      const opp = teams[(pairIdx + 1 + round) % teams.length];
      const us = teams[pairIdx];
      const { data: m } = await supa.from('matches').insert({
        category: 'erkek_cift', format: 'bu_klasik', court_id: court!.id,
        played_at: '2026-10-15T18:00:00Z', is_rated: true,
        team_a_player_ids: [players[us[0]].userId, players[us[1]].userId],
        team_b_player_ids: [players[opp[0]].userId, players[opp[1]].userId],
        score_team_a: 4, score_team_b: round, winner_team: 'a', status: 'confirmed',
        confirmed_by: [players[us[0]].userId, players[opp[0]].userId],
        confirmed_at: '2026-10-15T19:30:00Z',
      }).select('id').single();
      if (m) matchIds.push(m.id);
    }
  }

  try {
    const { status, body } = await invokeFunction('start-season-finale', { seasonId }, admin.accessToken);
    assertEquals(status, 200);
    if ((body as { tournamentCount: number }).tournamentCount < 1) {
      throw new Error('erkek_cift tournament was not created');
    }

    const { data: dTeams } = await supa
      .from('season_doubles_teams')
      .select('rank, player_a_id, player_b_id, avg_rating')
      .eq('season_id', seasonId).eq('category', 'erkek_cift')
      .order('rank', { ascending: true });
    assertEquals(dTeams!.length, 4);
    assertEquals(dTeams![0].rank, 1);
    assertEquals(dTeams![0].avg_rating, 1490);

    const { data: tournament } = await supa
      .from('tournaments').select('id, bracket_size')
      .eq('season_id', seasonId).eq('category', 'erkek_cift').single();
    assertEquals(tournament!.bracket_size, 4);

    const { data: tMatches } = await supa
      .from('tournament_matches').select('seed_a, seed_b')
      .eq('tournament_id', tournament!.id).eq('round', 1)
      .order('bracket_position', { ascending: true });
    assertEquals(tMatches!.length, 2);
    assertEquals([tMatches![0].seed_a, tMatches![0].seed_b], [1, 4]);
    assertEquals([tMatches![1].seed_a, tMatches![1].seed_b], [2, 3]);
  } finally {
    const playerIds = [admin.userId, ...players.map((p) => p.userId)];
    // Seasons delete first → cascades tournament_matches, then delete matches
    await teardownUsers(playerIds, { seasonIds: [seasonId], matchIds });
  }
});
