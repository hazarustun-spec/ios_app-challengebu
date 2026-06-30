import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

async function makeRequest(aliceToken: string, bobUserId: string): Promise<string> {
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body } = await invokeFunction('create-match-request', {
    type: 'direct_challenge', targetId: bobUserId, category: 'erkek_tek',
    format: 'bu_klasik', isRated: true, proposedDate: '2026-07-01',
    proposedTime: '19:00', courtId: court!.id,
  }, aliceToken);
  return (body as { id: string }).id;
}

Deno.test('accept-match-request: target accepts → match created', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-amr-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-amr-${s}@test.local`, genderCategory: 'erkek' });
  let matchId = '';
  try {
    const reqId = await makeRequest(alice.accessToken, bob.userId);
    const { status, body } = await invokeFunction('accept-match-request', { requestId: reqId }, bob.accessToken);
    assertEquals(status, 200);
    const result = body as { matchId: string; requestStatus: string };
    assertEquals(result.requestStatus, 'accepted');
    matchId = result.matchId;

    const supa = adminClient();
    const { data: m } = await supa.from('matches').select('*').eq('id', matchId).single();
    assertEquals(m!.status, 'awaiting_confirmation');
    assertEquals(m!.team_a_player_ids[0], alice.userId);
    assertEquals(m!.team_b_player_ids[0], bob.userId);
  } finally {
    await teardownUsers([alice.userId, bob.userId], { matchIds: matchId ? [matchId] : [] });
  }
});

Deno.test('accept-match-request: non-target cannot accept', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-amr-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-amr-${s}@test.local`, genderCategory: 'erkek' });
  const carol = await createTestUser({ email: `carol-amr-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const reqId = await makeRequest(alice.accessToken, bob.userId);
    const { status } = await invokeFunction('accept-match-request', { requestId: reqId }, carol.accessToken);
    assertEquals(status, 403);
  } finally {
    await teardownUsers([alice.userId, bob.userId, carol.userId]);
  }
});

Deno.test('accept-match-request: cannot accept expired', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-amr-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-amr-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const supa = adminClient();
    const { data: court } = await supa.from('courts').select('id').limit(1).single();
    const { data: req } = await supa.from('match_requests').insert({
      creator_id: alice.userId,
      target_id: bob.userId,
      type: 'direct_challenge',
      category: 'erkek_tek',
      format: 'bu_klasik',
      is_rated: true,
      proposed_date: '2026-07-01',
      proposed_time: '19:00',
      court_id: court!.id,
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      status: 'pending',
    }).select('id').single();

    const { status, body } = await invokeFunction(
      'accept-match-request', { requestId: req!.id }, bob.accessToken,
    );
    assertEquals(status, 409);
    const msg = (body as { error: { message: string } }).error.message;
    assertEquals(msg.toLowerCase().includes('expired'), true);
  } finally {
    await teardownUsers([alice.userId, bob.userId]);
  }
});
