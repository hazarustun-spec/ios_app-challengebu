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

Deno.test('close-season: awards seasonal badges to standings + final winners', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const supa = adminClient();

  // 8 erkek_tek players ranked 1..8, plus a confirmed match so they show
  // up as season participants (loyalty_first_season is gated on that).
  const players: { userId: string; accessToken: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const u = await createTestUser({ email: `p${i}@test.local`, genderCategory: 'erkek' });
    players.push({ userId: u.userId, accessToken: u.accessToken });
    await supa.from('elo_ratings').upsert({
      profile_id: u.userId,
      category: 'erkek_tek',
      rating: 1500 - i * 10,
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

  for (let i = 0; i < players.length; i++) {
    await supa.from('season_standings').insert({
      season_id: season!.id,
      profile_id: players[i].userId,
      category: 'erkek_tek',
      final_rating: 1500 - i * 10,
      rank: i + 1,
      matches_played: 10,
    });
  }

  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  // One confirmed regular match in season window so participants is non-empty.
  await supa.from('matches').insert({
    category: 'erkek_tek', format: 'bu_klasik', court_id: court!.id,
    played_at: '2026-10-15T18:00:00Z', is_rated: true,
    team_a_player_ids: [players[0].userId],
    team_b_player_ids: [players[1].userId],
    score_team_a: 4, score_team_b: 0, winner_team: 'a',
    status: 'confirmed',
    confirmed_by: [players[0].userId, players[1].userId],
    confirmed_at: '2026-10-15T19:30:00Z',
  });

  // Completed tournament with Final + SFs.
  const { data: tournament } = await supa.from('tournaments').insert({
    season_id: season!.id,
    category: 'erkek_tek',
    bracket_size: 8,
    status: 'completed',
  }).select('id').single();

  const { data: sf1Match } = await supa.from('matches').insert({
    category: 'erkek_tek', format: 'bu_klasik', court_id: court!.id,
    played_at: '2026-12-21T18:00:00Z', is_rated: true,
    team_a_player_ids: [players[0].userId], team_b_player_ids: [players[3].userId],
    score_team_a: 4, score_team_b: 1, winner_team: 'a',
    status: 'confirmed',
    confirmed_by: [players[0].userId, players[3].userId],
    confirmed_at: '2026-12-21T19:30:00Z',
  }).select('id').single();
  await supa.from('tournament_matches').insert({
    tournament_id: tournament!.id, round: 2, bracket_position: 1,
    seed_a: 1, seed_b: 4, match_id: sf1Match!.id,
  });

  const { data: sf2Match } = await supa.from('matches').insert({
    category: 'erkek_tek', format: 'bu_klasik', court_id: court!.id,
    played_at: '2026-12-22T18:00:00Z', is_rated: true,
    team_a_player_ids: [players[1].userId], team_b_player_ids: [players[2].userId],
    score_team_a: 4, score_team_b: 2, winner_team: 'a',
    status: 'confirmed',
    confirmed_by: [players[1].userId, players[2].userId],
    confirmed_at: '2026-12-22T19:30:00Z',
  }).select('id').single();
  await supa.from('tournament_matches').insert({
    tournament_id: tournament!.id, round: 2, bracket_position: 2,
    seed_a: 2, seed_b: 3, match_id: sf2Match!.id,
  });

  const { data: finalMatch } = await supa.from('matches').insert({
    category: 'erkek_tek', format: 'bu_klasik', court_id: court!.id,
    played_at: '2026-12-23T18:00:00Z', is_rated: true,
    team_a_player_ids: [players[0].userId], team_b_player_ids: [players[1].userId],
    score_team_a: 4, score_team_b: 3, winner_team: 'a',
    status: 'confirmed',
    confirmed_by: [players[0].userId, players[1].userId],
    confirmed_at: '2026-12-23T19:30:00Z',
  }).select('id').single();
  await supa.from('tournament_matches').insert({
    tournament_id: tournament!.id, round: 3, bracket_position: 1,
    seed_a: 1, seed_b: 2, match_id: finalMatch!.id,
  });

  const { status, body } = await invokeFunction('close-season', { seasonId: season!.id }, admin.accessToken);
  assertEquals(status, 200);
  const result = body as { badgesAwarded: number };
  if (result.badgesAwarded < 5) {
    throw new Error(`Expected >= 5 seasonal badges, got ${result.badgesAwarded}`);
  }

  const { data: championRow } = await supa
    .from('user_badges')
    .select('badge:badges!inner(code)')
    .eq('profile_id', players[0].userId)
    .eq('badge.code', 'season_champion');
  if (!championRow || championRow.length === 0) throw new Error('Champion badge missing');

  const { data: finalistRow } = await supa
    .from('user_badges')
    .select('badge:badges!inner(code)')
    .eq('profile_id', players[1].userId)
    .eq('badge.code', 'season_finalist');
  if (!finalistRow || finalistRow.length === 0) throw new Error('Finalist badge missing');

  const { data: sfRows } = await supa
    .from('user_badges')
    .select('profile_id, badge:badges!inner(code)')
    .in('profile_id', [players[2].userId, players[3].userId])
    .eq('badge.code', 'season_semifinalist');
  assertEquals(sfRows!.length, 2);

  const { data: top3Rows } = await supa
    .from('user_badges')
    .select('profile_id, badge:badges!inner(code)')
    .in('profile_id', [players[0].userId, players[1].userId, players[2].userId])
    .eq('badge.code', 'season_ladder_top3');
  assertEquals(top3Rows!.length, 3);

  const { data: loyaltyRows } = await supa
    .from('user_badges')
    .select('profile_id, badge:badges!inner(code)')
    .in('profile_id', [players[0].userId, players[1].userId])
    .eq('badge.code', 'loyalty_first_season');
  assertEquals(loyaltyRows!.length, 2);
});
