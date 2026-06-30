import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

async function probeWarm(): Promise<void> {
  try {
    await invokeFunction(
      'raise-dispute',
      { matchId: '00000000-0000-0000-0000-000000000099', reason: 'warmup' },
      'warmup-probe-token',
    );
  } catch (_) {
    // Network-level errors are fine; we only care that the module loaded.
  }
}
await probeWarm();

const disputeScore = {
  scoreTeamA: 4, scoreTeamB: 2, winnerTeam: 'a' as const,
  els: [
    { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'b' },
    { el: 4, winner: 'b' }, { el: 5, winner: 'a' }, { el: 6, winner: 'a' },
  ],
};

async function setupAwaitingMatch(suffix: string): Promise<{
  aliceToken: string; bobToken: string; carolToken: string;
  matchId: string; aliceId: string; bobId: string; carolId: string;
}> {
  const alice = await createTestUser({ email: `alice-rd-${suffix}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-rd-${suffix}@test.local`, genderCategory: 'erkek' });
  const carol = await createTestUser({ email: `carol-rd-${suffix}@test.local`, genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: req } = await invokeFunction('create-match-request', {
    type: 'direct_challenge', targetId: bob.userId, category: 'erkek_tek',
    format: 'bu_klasik', isRated: true, proposedDate: '2026-07-01',
    proposedTime: '19:00', courtId: court!.id,
  }, alice.accessToken);
  const { body: acc } = await invokeFunction(
    'accept-match-request', { requestId: (req as { id: string }).id }, bob.accessToken,
  );
  const matchId = (acc as { matchId: string }).matchId;

  await invokeFunction('submit-match-score', { matchId, ...disputeScore }, alice.accessToken);
  await invokeFunction('submit-match-score', { matchId, ...disputeScore }, bob.accessToken);

  return {
    aliceToken: alice.accessToken, bobToken: bob.accessToken, carolToken: carol.accessToken,
    matchId, aliceId: alice.userId, bobId: bob.userId, carolId: carol.userId,
  };
}

Deno.test('raise-dispute: participant raises dispute → match status disputed', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { aliceToken, matchId, aliceId, bobId, carolId } = await setupAwaitingMatch(s);
  try {
    const { status, body } = await invokeFunction(
      'raise-dispute', { matchId, reason: 'Bob girdiği skor yanlış' }, aliceToken,
    );
    assertEquals(status, 200);
    const result = body as { disputeId: string; status: string };
    assertEquals(result.status, 'disputed');

    const supa = adminClient();
    const { data: match } = await supa.from('matches').select('status').eq('id', matchId).single();
    assertEquals(match!.status, 'disputed');

    const { data: dispute } = await supa.from('disputes').select('*').eq('id', result.disputeId).single();
    assertEquals(dispute!.status, 'open');
    assertEquals(dispute!.reason, 'Bob girdiği skor yanlış');
  } finally {
    await teardownUsers([aliceId, bobId, carolId], { matchIds: [matchId] });
  }
});

Deno.test('raise-dispute: non-participant forbidden', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { carolToken, matchId, aliceId, bobId, carolId } = await setupAwaitingMatch(s);
  try {
    const { status } = await invokeFunction('raise-dispute', { matchId, reason: 'test' }, carolToken);
    assertEquals(status, 403);
  } finally {
    await teardownUsers([aliceId, bobId, carolId], { matchIds: [matchId] });
  }
});

Deno.test('raise-dispute: cannot dispute already-disputed match', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { aliceToken, bobToken, matchId, aliceId, bobId, carolId } = await setupAwaitingMatch(s);
  try {
    const r1 = await invokeFunction('raise-dispute', { matchId, reason: 'first' }, aliceToken);
    assertEquals(r1.status, 200);

    const r2 = await invokeFunction('raise-dispute', { matchId, reason: 'second' }, bobToken);
    assertEquals(r2.status, 409);
  } finally {
    await teardownUsers([aliceId, bobId, carolId], { matchIds: [matchId] });
  }
});

Deno.test('raise-dispute: cannot dispute confirmed match', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { aliceToken, bobToken, matchId, aliceId, bobId, carolId } = await setupAwaitingMatch(s);
  try {
    await invokeFunction('confirm-match', { matchId }, aliceToken);
    await invokeFunction('confirm-match', { matchId }, bobToken);

    const { status } = await invokeFunction('raise-dispute', { matchId, reason: 'too late' }, aliceToken);
    assertEquals(status, 409);
  } finally {
    await teardownUsers([aliceId, bobId, carolId], { matchIds: [matchId] });
  }
});
