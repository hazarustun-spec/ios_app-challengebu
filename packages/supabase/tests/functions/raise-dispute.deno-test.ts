import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

// A match is only disputable once both players have agreed on a score (winner_team is set).
// We submit matching scores from both players so the match has a winner_team before
// any test tries to raise a dispute — this reflects the real production lifecycle.
const disputeScore = {
  scoreTeamA: 4,
  scoreTeamB: 2,
  winnerTeam: 'a' as const,
  els: [
    { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'b' },
    { el: 4, winner: 'b' }, { el: 5, winner: 'a' }, { el: 6, winner: 'a' },
  ],
};

async function setupAwaitingMatch(): Promise<{
  aliceToken: string; bobToken: string; carolToken: string; matchId: string;
}> {
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const carol = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: req } = await invokeFunction('create-match-request', {
    type: 'direct_challenge',
    targetId: bob.userId,
    category: 'erkek_tek',
    format: 'bu_klasik',
    isRated: true,
    proposedDate: '2026-07-01',
    proposedTime: '19:00',
    courtId: court!.id,
  }, alice.accessToken);
  const { body: acc } = await invokeFunction(
    'accept-match-request',
    { requestId: (req as { id: string }).id },
    bob.accessToken,
  );
  const matchId = (acc as { matchId: string }).matchId;

  // Submit matching scores from both players so winner_team is set.
  // A dispute can only be raised after a score has been submitted (security guard).
  await invokeFunction('submit-match-score', { matchId, ...disputeScore }, alice.accessToken);
  await invokeFunction('submit-match-score', { matchId, ...disputeScore }, bob.accessToken);

  return {
    aliceToken: alice.accessToken,
    bobToken: bob.accessToken,
    carolToken: carol.accessToken,
    matchId,
  };
}

Deno.test('raise-dispute: participant raises dispute → match status disputed', async () => {
  await cleanupTestData();
  const { aliceToken, matchId } = await setupAwaitingMatch();

  const { status, body } = await invokeFunction(
    'raise-dispute',
    { matchId, reason: 'Bob girdiği skor yanlış' },
    aliceToken,
  );
  assertEquals(status, 200);
  const result = body as { disputeId: string; status: string };
  assertEquals(result.status, 'disputed');

  const supa = adminClient();
  const { data: match } = await supa.from('matches').select('status').eq('id', matchId).single();
  assertEquals(match!.status, 'disputed');

  const { data: dispute } = await supa
    .from('disputes')
    .select('*')
    .eq('id', result.disputeId)
    .single();
  assertEquals(dispute!.status, 'open');
  assertEquals(dispute!.reason, 'Bob girdiği skor yanlış');
});

Deno.test('raise-dispute: non-participant forbidden', async () => {
  await cleanupTestData();
  const { carolToken, matchId } = await setupAwaitingMatch();
  const { status } = await invokeFunction(
    'raise-dispute',
    { matchId, reason: 'test' },
    carolToken,
  );
  assertEquals(status, 403);
});

Deno.test('raise-dispute: cannot dispute already-disputed match', async () => {
  await cleanupTestData();
  const { aliceToken, bobToken, matchId } = await setupAwaitingMatch();

  const r1 = await invokeFunction(
    'raise-dispute',
    { matchId, reason: 'first' },
    aliceToken,
  );
  assertEquals(r1.status, 200);

  const r2 = await invokeFunction(
    'raise-dispute',
    { matchId, reason: 'second' },
    bobToken,
  );
  assertEquals(r2.status, 409);
});

Deno.test('raise-dispute: cannot dispute confirmed match', async () => {
  await cleanupTestData();
  // setupAwaitingMatch already submits matching scores; just confirm the match.
  const { aliceToken, bobToken, matchId } = await setupAwaitingMatch();

  await invokeFunction('confirm-match', { matchId }, aliceToken);
  await invokeFunction('confirm-match', { matchId }, bobToken);

  const { status } = await invokeFunction(
    'raise-dispute',
    { matchId, reason: 'too late' },
    aliceToken,
  );
  assertEquals(status, 409);
});
