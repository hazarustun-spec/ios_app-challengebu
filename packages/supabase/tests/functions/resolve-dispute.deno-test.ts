import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

async function setupDispute(adminInMatch = false): Promise<{
  adminToken: string;
  aliceToken: string;
  bobToken: string;
  matchId: string;
  disputeId: string;
  aliceId: string;
  bobId: string;
}> {
  const admin = await createTestUser({ email: 'admin@test.local', role: 'admin', genderCategory: 'erkek' });
  const alice = adminInMatch
    ? admin
    : await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { body: req } = await invokeFunction('create-match-request', {
    type: 'direct_challenge', targetId: bob.userId, category: 'erkek_tek',
    format: 'bu_klasik', isRated: true, proposedDate: '2026-07-01',
    proposedTime: '19:00', courtId: court!.id,
  }, alice.accessToken);
  const { body: acc } = await invokeFunction(
    'accept-match-request',
    { requestId: (req as { id: string }).id },
    bob.accessToken,
  );
  const matchId = (acc as { matchId: string }).matchId;

  // Submit different scores to create dispute
  const aliceScore = {
    matchId, scoreTeamA: 4, scoreTeamB: 2, winnerTeam: 'a' as const,
    els: [
      { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'b' },
      { el: 4, winner: 'b' }, { el: 5, winner: 'a' }, { el: 6, winner: 'a' },
    ],
  };
  await invokeFunction('submit-match-score', aliceScore, alice.accessToken);
  await invokeFunction('submit-match-score', aliceScore, bob.accessToken);

  const { body: dispute } = await invokeFunction(
    'raise-dispute',
    { matchId, reason: 'Score is wrong' },
    alice.accessToken,
  );
  const disputeId = (dispute as { disputeId: string }).disputeId;

  return {
    adminToken: admin.accessToken,
    aliceToken: alice.accessToken,
    bobToken: bob.accessToken,
    matchId,
    disputeId,
    aliceId: alice.userId,
    bobId: bob.userId,
  };
}

Deno.test('resolve-dispute: admin approves team A → ELO applied', async () => {
  await cleanupTestData();
  const { adminToken, matchId, disputeId, aliceId, bobId } = await setupDispute();

  const { status, body } = await invokeFunction(
    'resolve-dispute',
    { disputeId, outcome: 'approve_a' },
    adminToken,
  );
  assertEquals(status, 200);
  assertEquals((body as { outcome: string }).outcome, 'approve_a');

  const supa = adminClient();
  const { data: m } = await supa.from('matches').select('*').eq('id', matchId).single();
  assertEquals(m!.status, 'confirmed');
  assertEquals(m!.winner_team, 'a');

  const { data: d } = await supa.from('disputes').select('status').eq('id', disputeId).single();
  assertEquals(d!.status, 'resolved');

  const { data: aliceR } = await supa.from('elo_ratings').select('rating').eq('profile_id', aliceId).eq('category', 'erkek_tek').single();
  const { data: bobR } = await supa.from('elo_ratings').select('rating').eq('profile_id', bobId).eq('category', 'erkek_tek').single();
  if (!aliceR || aliceR.rating <= 1200) throw new Error('alice should have gained rating');
  if (!bobR || bobR.rating >= 1200) throw new Error('bob should have lost rating');
});

Deno.test('resolve-dispute: non-admin forbidden', async () => {
  await cleanupTestData();
  const { aliceToken, disputeId } = await setupDispute();
  const { status } = await invokeFunction(
    'resolve-dispute',
    { disputeId, outcome: 'approve_a' },
    aliceToken,
  );
  assertEquals(status, 403);
});

Deno.test('resolve-dispute: void outcome → match voided, no ELO change', async () => {
  await cleanupTestData();
  const { adminToken, matchId, disputeId } = await setupDispute();

  const { status } = await invokeFunction(
    'resolve-dispute',
    { disputeId, outcome: 'void', notes: 'Both submitted wrong' },
    adminToken,
  );
  assertEquals(status, 200);

  const supa = adminClient();
  const { data: m } = await supa.from('matches').select('status, voided_reason').eq('id', matchId).single();
  assertEquals(m!.status, 'voided');

  const { data: r } = await supa.from('elo_ratings').select('rating');
  for (const row of r ?? []) {
    assertEquals(row.rating, 1200);
  }
});

Deno.test('resolve-dispute: admin in match → auto-favor opponent', async () => {
  await cleanupTestData();
  // admin === alice in match; outcome 'approve_a' would benefit admin
  // Auto-rule: switches to 'approve_b'
  const { adminToken, matchId, disputeId, bobId } = await setupDispute(true);

  const { status } = await invokeFunction(
    'resolve-dispute',
    { disputeId, outcome: 'approve_a' },
    adminToken,
  );
  assertEquals(status, 200);

  const supa = adminClient();
  const { data: m } = await supa.from('matches').select('winner_team').eq('id', matchId).single();
  // Admin was alice (team_a); auto-rule switched to b
  assertEquals(m!.winner_team, 'b');

  const { data: bobR } = await supa.from('elo_ratings').select('rating').eq('profile_id', bobId).eq('category', 'erkek_tek').single();
  if (!bobR || bobR.rating <= 1200) throw new Error('bob (opponent) should have gained rating');
});

Deno.test('resolve-dispute: replay outcome resets match', async () => {
  await cleanupTestData();
  const { adminToken, matchId, disputeId } = await setupDispute();

  const { status } = await invokeFunction(
    'resolve-dispute',
    { disputeId, outcome: 'replay' },
    adminToken,
  );
  assertEquals(status, 200);

  const supa = adminClient();
  const { data: m } = await supa.from('matches').select('*').eq('id', matchId).single();
  assertEquals(m!.status, 'awaiting_confirmation');
  assertEquals(m!.winner_team, null);
  assertEquals(m!.score_team_a, 0);
  assertEquals(m!.score_team_b, 0);
});
