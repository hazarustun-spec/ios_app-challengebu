import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

async function setupMatch(suffix: string): Promise<{
  aliceToken: string; bobToken: string; matchId: string; aliceId: string; bobId: string;
}> {
  // Direct DB inserts — avoids edge-function chain failures under concurrent load.
  const alice = await createTestUser({ email: `alice-sms-${suffix}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-sms-${suffix}@test.local`, genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  if (!court) throw new Error('No court found');

  const { data: req } = await supa.from('match_requests').insert({
    creator_id: alice.userId, target_id: bob.userId, type: 'direct_challenge',
    category: 'erkek_tek', format: 'bu_klasik', proposed_date: '2026-07-01',
    proposed_time: '19:00', court_id: court.id, status: 'accepted',
    expires_at: '2026-08-01T00:00:00Z',
  }).select('id').single();
  if (!req) throw new Error(`match_request insert failed (suffix ${suffix})`);

  const { data: m, error: matchErr } = await supa.from('matches').insert({
    match_request_id: req.id, category: 'erkek_tek', format: 'bu_klasik',
    court_id: court.id, played_at: '2026-07-01T19:00:00Z', is_rated: true,
    team_a_player_ids: [alice.userId], team_b_player_ids: [bob.userId],
  }).select('id').single();
  if (!m || matchErr) throw new Error(`match insert failed (suffix ${suffix}): ${matchErr?.message}`);

  return {
    aliceToken: alice.accessToken,
    bobToken: bob.accessToken,
    matchId: m.id,
    aliceId: alice.userId,
    bobId: bob.userId,
  };
}

const matchingScore = {
  els: [
    { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'b' },
    { el: 4, winner: 'b' }, { el: 5, winner: 'a' }, { el: 6, winner: 'a' },
  ],
  scoreTeamA: 4,
  scoreTeamB: 2,
  winnerTeam: 'a' as const,
};

Deno.test('submit-match-score: matching submissions populate match', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { aliceToken, bobToken, matchId, aliceId, bobId } = await setupMatch(s);
  try {
    const r1 = await invokeFunction('submit-match-score', { matchId, ...matchingScore }, aliceToken);
    assertEquals(r1.status, 200);
    assertEquals((r1.body as { matched: boolean }).matched, false);

    const r2 = await invokeFunction('submit-match-score', { matchId, ...matchingScore }, bobToken);
    assertEquals(r2.status, 200);
    assertEquals((r2.body as { matched: boolean }).matched, true);

    const { data: m } = await adminClient().from('matches').select('*').eq('id', matchId).single();
    assertEquals(m!.score_team_a, 4);
    assertEquals(m!.score_team_b, 2);
    assertEquals(m!.winner_team, 'a');
    assertEquals(m!.status, 'awaiting_confirmation');
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('submit-match-score: mismatched submissions stay pending', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { aliceToken, bobToken, matchId, aliceId, bobId } = await setupMatch(s);
  try {
    await invokeFunction('submit-match-score', { matchId, ...matchingScore }, aliceToken);
    const r2 = await invokeFunction('submit-match-score', {
      matchId,
      scoreTeamA: 4,
      scoreTeamB: 1,
      winnerTeam: 'a',
      els: [
        { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'a' },
        { el: 4, winner: 'b' }, { el: 5, winner: 'a' },
      ],
    }, bobToken);
    assertEquals(r2.status, 200);
    assertEquals((r2.body as { matched: boolean }).matched, false);

    const { data: m } = await adminClient().from('matches').select('winner_team').eq('id', matchId).single();
    assertEquals(m!.winner_team, null);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('submit-match-score: non-participant forbidden', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceId, bobId } = await setupMatch(s);
  const carol = await createTestUser({ email: `carol-sms-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const r = await invokeFunction('submit-match-score', { matchId, ...matchingScore }, carol.accessToken);
    // Function may return 400 (bad request) or 403 (forbidden) for non-participants
    assertEquals([400, 403].includes(r.status), true, `Expected 4xx rejection for non-participant, got ${r.status}`);
  } finally {
    await teardownUsers([aliceId, bobId, carol.userId], { matchIds: [matchId] });
  }
});

Deno.test('submit-match-score: rejects inconsistent winnerTeam', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { aliceToken, matchId, aliceId, bobId } = await setupMatch(s);
  try {
    const r = await invokeFunction('submit-match-score', {
      matchId,
      scoreTeamA: 2,
      scoreTeamB: 4,
      winnerTeam: 'a', // wrong: a has fewer
      els: [
        { el: 1, winner: 'b' }, { el: 2, winner: 'a' }, { el: 3, winner: 'b' },
        { el: 4, winner: 'a' }, { el: 5, winner: 'b' }, { el: 6, winner: 'b' },
      ],
    }, aliceToken);
    assertEquals(r.status, 400);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('submit-match-score: same player resubmit replaces prior (latest wins)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { aliceToken, bobToken, matchId, aliceId, bobId } = await setupMatch(s);
  try {
    // Alice submits first (wrong score)
    await invokeFunction('submit-match-score', {
      matchId,
      scoreTeamA: 4,
      scoreTeamB: 1,
      winnerTeam: 'a',
      els: [
        { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'a' },
        { el: 4, winner: 'b' }, { el: 5, winner: 'a' },
      ],
    }, aliceToken);

    // Alice resubmits (correct score, matches Bob)
    await invokeFunction('submit-match-score', { matchId, ...matchingScore }, aliceToken);

    // Bob submits the matching score
    const r = await invokeFunction('submit-match-score', { matchId, ...matchingScore }, bobToken);
    assertEquals(r.status, 200);
    assertEquals((r.body as { matched: boolean }).matched, true);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});
