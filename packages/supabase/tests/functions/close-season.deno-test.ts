import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

async function makeSeason(opts: { status: string; suffix: string }): Promise<string> {
  const supa = adminClient();
  // Unique year derived from UUID suffix — avoids (name, year) unique constraint collision
  const year = 3000 + parseInt(opts.suffix.slice(0, 4), 16);
  const { data: season, error: seasonErr } = await supa.from('seasons').insert({
    name: 'guz', year,
    starts_at: '2026-09-01', ends_at: '2026-12-31',
    finale_starts_at: '2026-12-20', finale_ends_at: '2026-12-30',
    status: opts.status,
  }).select('id').single();
  if (!season || seasonErr) throw new Error(`makeSeason failed for suffix ${opts.suffix}: ${seasonErr?.message}`);
  return season.id;
}

Deno.test('close-season: applies soft ELO reset', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({
    email: `admin-cs-${s}@test.local`, role: 'admin', genderCategory: 'erkek',
  });
  const alice = await createTestUser({ email: `alice-cs-${s}@test.local`, genderCategory: 'erkek' });
  const supa = adminClient();
  const seasonId = await makeSeason({ status: 'finale', suffix: s });

  try {
    await supa.from('elo_ratings').upsert({
      profile_id: alice.userId, category: 'erkek_tek',
      rating: 1500, matches_played: 20,
    }, { onConflict: 'profile_id,category' });

    const { status } = await invokeFunction('close-season', { seasonId }, admin.accessToken);
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
  } finally {
    await teardownUsers([admin.userId, alice.userId], { seasonIds: [seasonId] });
  }
});

Deno.test('close-season: non-admin forbidden', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const player = await createTestUser({ email: `player-cs-${s}@test.local`, genderCategory: 'erkek' });
  const seasonId = await makeSeason({ status: 'finale', suffix: s });
  try {
    const { status } = await invokeFunction('close-season', { seasonId }, player.accessToken);
    assertEquals(status, 403);
  } finally {
    await teardownUsers([player.userId], { seasonIds: [seasonId] });
  }
});

Deno.test('close-season: already closed returns 409', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({
    email: `admin-cs-${s}@test.local`, role: 'admin', genderCategory: 'erkek',
  });
  const seasonId = await makeSeason({ status: 'closed', suffix: s });
  try {
    const { status } = await invokeFunction('close-season', { seasonId }, admin.accessToken);
    assertEquals(status, 409);
  } finally {
    await teardownUsers([admin.userId], { seasonIds: [seasonId] });
  }
});

Deno.test('close-season: awards seasonal badges to standings + final winners', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({
    email: `admin-cs-${s}@test.local`, role: 'admin', genderCategory: 'erkek',
  });
  const supa = adminClient();

  // 8 erkek_tek players
  const players: { userId: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const u = await createTestUser({ email: `p${i}-cs-${s}@test.local`, genderCategory: 'erkek' });
    players.push({ userId: u.userId });
    await supa.from('elo_ratings').upsert({
      profile_id: u.userId, category: 'erkek_tek',
      rating: 1500 - i * 10, matches_played: 10,
    }, { onConflict: 'profile_id,category' });
  }

  // Derive a unique year from the UUID suffix — the same value used for the seasons.year column.
  // By using csYear for ALL date strings, each test run lives in its own unique temporal namespace
  // (e.g. year 12345). The close-season function queries matches globally by [starts_at, ends_at];
  // without per-run year isolation, orphaned matches from aborted previous runs (profile deleted,
  // match row surviving) can cause the user_badges FK upsert to fail silently (badgesAwarded=0).
  const csYear = 3000 + parseInt(s.slice(0, 4), 16);
  const { data: season, error: seasonErr } = await supa.from('seasons').insert({
    name: 'guz', year: csYear,
    starts_at: `${csYear}-09-01T00:00:00Z`, ends_at: `${csYear}-12-31T23:59:59Z`,
    finale_starts_at: `${csYear}-12-20T00:00:00Z`, finale_ends_at: `${csYear}-12-30T23:59:59Z`,
    status: 'finale',
  }).select('id').single();
  if (!season || seasonErr) throw new Error(`season insert failed for suffix ${s}: ${seasonErr?.message}`);
  const seasonId = season.id;

  // Season standings
  for (let i = 0; i < players.length; i++) {
    await supa.from('season_standings').insert({
      season_id: seasonId, profile_id: players[i].userId, category: 'erkek_tek',
      final_rating: 1500 - i * 10, rank: i + 1, matches_played: 10,
    });
  }

  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  if (!court) throw new Error('No court found');

  // All match played_at dates use csYear so each run is in its own temporal namespace
  const { data: regMatch, error: regMatchErr } = await supa.from('matches').insert({
    category: 'erkek_tek', format: 'bu_klasik', court_id: court.id,
    played_at: `${csYear}-10-15T18:00:00Z`, is_rated: true,
    team_a_player_ids: [players[0].userId], team_b_player_ids: [players[1].userId],
    score_team_a: 4, score_team_b: 0, winner_team: 'a', status: 'confirmed',
    confirmed_by: [players[0].userId, players[1].userId],
    confirmed_at: '2026-10-15T19:30:00Z',
  }).select('id').single();
  if (!regMatch || regMatchErr) throw new Error(`regMatch insert failed: ${regMatchErr?.message}`);

  // Tournament with SF + Final
  const { data: tournament, error: tournErr } = await supa.from('tournaments').insert({
    season_id: seasonId, category: 'erkek_tek', bracket_size: 8, status: 'completed',
  }).select('id').single();
  if (!tournament || tournErr) throw new Error(`tournament insert failed: ${tournErr?.message}`);

  const { data: sf1Match, error: sf1Err } = await supa.from('matches').insert({
    category: 'erkek_tek', format: 'bu_klasik', court_id: court.id,
    played_at: `${csYear}-12-21T18:00:00Z`, is_rated: true,
    team_a_player_ids: [players[0].userId], team_b_player_ids: [players[3].userId],
    score_team_a: 4, score_team_b: 1, winner_team: 'a', status: 'confirmed',
    confirmed_by: [players[0].userId, players[3].userId],
    confirmed_at: '2026-12-21T19:30:00Z',
  }).select('id').single();
  if (!sf1Match || sf1Err) throw new Error(`sf1Match insert failed: ${sf1Err?.message}`);
  const { error: sf1TmErr } = await supa.from('tournament_matches').insert({
    tournament_id: tournament.id, round: 2, bracket_position: 1,
    seed_a: 1, seed_b: 4, match_id: sf1Match.id,
  });
  if (sf1TmErr) throw new Error(`sf1 tournament_match insert failed: ${sf1TmErr.message}`);

  const { data: sf2Match, error: sf2Err } = await supa.from('matches').insert({
    category: 'erkek_tek', format: 'bu_klasik', court_id: court.id,
    played_at: `${csYear}-12-22T18:00:00Z`, is_rated: true,
    team_a_player_ids: [players[1].userId], team_b_player_ids: [players[2].userId],
    score_team_a: 4, score_team_b: 2, winner_team: 'a', status: 'confirmed',
    confirmed_by: [players[1].userId, players[2].userId],
    confirmed_at: '2026-12-22T19:30:00Z',
  }).select('id').single();
  if (!sf2Match || sf2Err) throw new Error(`sf2Match insert failed: ${sf2Err?.message}`);
  const { error: sf2TmErr } = await supa.from('tournament_matches').insert({
    tournament_id: tournament.id, round: 2, bracket_position: 2,
    seed_a: 2, seed_b: 3, match_id: sf2Match.id,
  });
  if (sf2TmErr) throw new Error(`sf2 tournament_match insert failed: ${sf2TmErr.message}`);

  const { data: finalMatch, error: finalErr } = await supa.from('matches').insert({
    category: 'erkek_tek', format: 'bu_klasik', court_id: court.id,
    played_at: `${csYear}-12-23T18:00:00Z`, is_rated: true,
    team_a_player_ids: [players[0].userId], team_b_player_ids: [players[1].userId],
    score_team_a: 4, score_team_b: 3, winner_team: 'a', status: 'confirmed',
    confirmed_by: [players[0].userId, players[1].userId],
    confirmed_at: '2026-12-23T19:30:00Z',
  }).select('id').single();
  if (!finalMatch || finalErr) throw new Error(`finalMatch insert failed: ${finalErr?.message}`);
  const { error: finalTmErr } = await supa.from('tournament_matches').insert({
    tournament_id: tournament.id, round: 3, bracket_position: 1,
    seed_a: 1, seed_b: 2, match_id: finalMatch.id,
  });
  if (finalTmErr) throw new Error(`final tournament_match insert failed: ${finalTmErr.message}`);

  try {
    // Verify data exists before calling close-season
    const { data: standingsCheck, count: standingsCount } = await supa
      .from('season_standings').select('*', { count: 'exact' }).eq('season_id', seasonId);
    if ((standingsCount ?? 0) < 1) throw new Error(`No standings found for season ${seasonId}`);

    const { data: matchesCheck } = await supa
      .from('matches')
      .select('id')
      .gte('played_at', `${csYear}-09-01T00:00:00Z`)
      .lte('played_at', `${csYear}-12-31T23:59:59Z`)
      .in('status', ['confirmed', 'voided'])
      .in('id', [regMatch.id, sf1Match.id, sf2Match.id, finalMatch.id]);
    if ((matchesCheck ?? []).length < 4) {
      throw new Error(`Expected 4 matches in season window, found ${matchesCheck?.length}: ${JSON.stringify(matchesCheck)}`);
    }

    const { status, body } = await invokeFunction('close-season', { seasonId }, admin.accessToken);
    if (status !== 200) throw new Error(`close-season returned ${status}: ${JSON.stringify(body)}`);
    const result = body as { badgesAwarded: number };
    if (result.badgesAwarded < 5) {
      throw new Error(`Expected >= 5 seasonal badges, got ${result.badgesAwarded}`);
    }

    const { data: championRow } = await supa
      .from('user_badges').select('badge:badges!inner(code)')
      .eq('profile_id', players[0].userId).eq('badge.code', 'season_champion');
    if (!championRow || championRow.length === 0) throw new Error('Champion badge missing');

    const { data: finalistRow } = await supa
      .from('user_badges').select('badge:badges!inner(code)')
      .eq('profile_id', players[1].userId).eq('badge.code', 'season_finalist');
    if (!finalistRow || finalistRow.length === 0) throw new Error('Finalist badge missing');

    const { data: sfRows } = await supa
      .from('user_badges').select('profile_id, badge:badges!inner(code)')
      .in('profile_id', [players[2].userId, players[3].userId])
      .eq('badge.code', 'season_semifinalist');
    assertEquals(sfRows!.length, 2);

    const { data: top3Rows } = await supa
      .from('user_badges').select('profile_id, badge:badges!inner(code)')
      .in('profile_id', [players[0].userId, players[1].userId, players[2].userId])
      .eq('badge.code', 'season_ladder_top3');
    assertEquals(top3Rows!.length, 3);

    const { data: loyaltyRows } = await supa
      .from('user_badges').select('profile_id, badge:badges!inner(code)')
      .in('profile_id', [players[0].userId, players[1].userId])
      .eq('badge.code', 'loyalty_first_season');
    assertEquals(loyaltyRows!.length, 2);
  } finally {
    const playerIds = [admin.userId, ...players.map((p) => p.userId)];
    const matchIds = [regMatch.id, sf1Match.id, sf2Match.id, finalMatch.id];
    await teardownUsers(playerIds, { seasonIds: [seasonId], matchIds });
  }
});
