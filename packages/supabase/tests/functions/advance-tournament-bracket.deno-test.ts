import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('advance-tournament-bracket: writes winner seed into parent slot', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();

  const { data: season } = await supa.from('seasons').insert({
    name: 'guz', year: 2026,
    starts_at: '2026-09-01', ends_at: '2027-01-25',
    finale_starts_at: '2027-01-16', finale_ends_at: '2027-01-25',
    status: 'finale',
  }).select('id').single();

  const { data: tournament } = await supa.from('tournaments').insert({
    season_id: season!.id,
    category: 'erkek_tek',
    bracket_size: 8,
    status: 'seeded',
  }).select('id').single();

  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { data: req } = await supa.from('match_requests').insert({
    creator_id: alice.userId,
    type: 'direct_challenge',
    target_id: bob.userId,
    category: 'erkek_tek',
    format: 'bu_klasik',
    is_rated: true,
    proposed_date: '2027-01-20',
    proposed_time: '18:00',
    court_id: court!.id,
    status: 'accepted',
    expires_at: '2027-01-21',
  }).select('id').single();

  const { data: m } = await supa.from('matches').insert({
    match_request_id: req!.id,
    category: 'erkek_tek',
    format: 'bu_klasik',
    court_id: court!.id,
    played_at: '2027-01-20T18:00:00Z',
    is_rated: true,
    team_a_player_ids: [alice.userId],
    team_b_player_ids: [bob.userId],
    score_team_a: 4,
    score_team_b: 0,
    winner_team: 'a',
    status: 'confirmed',
    confirmed_by: [alice.userId, bob.userId],
    confirmed_at: '2027-01-20T19:30:00Z',
  }).select('id').single();

  await supa.from('tournament_matches').insert({
    tournament_id: tournament!.id,
    round: 1,
    bracket_position: 1,
    match_id: m!.id,
    seed_a: 1,
    seed_b: 8,
  });

  const { status, body } = await invokeFunction('advance-tournament-bracket', { matchId: m!.id });
  assertEquals(status, 200);
  assertEquals((body as { advanced: boolean }).advanced, true);

  const { data: parent } = await supa
    .from('tournament_matches')
    .select('seed_a')
    .eq('tournament_id', tournament!.id)
    .eq('round', 2)
    .eq('bracket_position', 1)
    .single();
  assertEquals(parent!.seed_a, 1);
});

Deno.test('advance-tournament-bracket: ignores non-tournament match', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { data: req } = await supa.from('match_requests').insert({
    creator_id: alice.userId,
    type: 'direct_challenge',
    target_id: bob.userId,
    category: 'erkek_tek',
    format: 'bu_klasik',
    is_rated: true,
    proposed_date: '2026-10-01',
    proposed_time: '18:00',
    court_id: court!.id,
    status: 'accepted',
    expires_at: '2026-10-02',
  }).select('id').single();
  const { data: m } = await supa.from('matches').insert({
    match_request_id: req!.id,
    category: 'erkek_tek',
    format: 'bu_klasik',
    court_id: court!.id,
    played_at: '2026-10-01T18:00:00Z',
    is_rated: true,
    team_a_player_ids: [alice.userId],
    team_b_player_ids: [bob.userId],
    score_team_a: 4,
    score_team_b: 1,
    winner_team: 'a',
    status: 'confirmed',
    confirmed_by: [alice.userId, bob.userId],
  }).select('id').single();

  const { status, body } = await invokeFunction('advance-tournament-bracket', { matchId: m!.id });
  assertEquals(status, 200);
  assertEquals((body as { advanced: boolean }).advanced, false);
});
