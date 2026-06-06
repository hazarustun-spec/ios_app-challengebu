import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

async function setupMatch(): Promise<{
  aliceToken: string; bobToken: string; matchId: string;
}> {
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
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
  const { body: accept } = await invokeFunction(
    'accept-match-request',
    { requestId: (req as { id: string }).id },
    bob.accessToken,
  );
  return {
    aliceToken: alice.accessToken,
    bobToken: bob.accessToken,
    matchId: (accept as { matchId: string }).matchId,
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
  await cleanupTestData();
  const { aliceToken, bobToken, matchId } = await setupMatch();

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
});

Deno.test('submit-match-score: mismatched submissions stay pending', async () => {
  await cleanupTestData();
  const { aliceToken, bobToken, matchId } = await setupMatch();

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
});

Deno.test('submit-match-score: non-participant forbidden', async () => {
  await cleanupTestData();
  const { matchId } = await setupMatch();
  const carol = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });
  const r = await invokeFunction('submit-match-score', { matchId, ...matchingScore }, carol.accessToken);
  assertEquals(r.status, 403);
});
