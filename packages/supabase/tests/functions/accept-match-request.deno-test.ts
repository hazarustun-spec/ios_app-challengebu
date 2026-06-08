import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

async function makeRequest(aliceToken: string, bobUserId: string): Promise<string> {
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body } = await invokeFunction(
    'create-match-request',
    {
      type: 'direct_challenge',
      targetId: bobUserId,
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    aliceToken,
  );
  return (body as { id: string }).id;
}

Deno.test('accept-match-request: target accepts → match created', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });

  const reqId = await makeRequest(alice.accessToken, bob.userId);
  const { status, body } = await invokeFunction(
    'accept-match-request',
    { requestId: reqId },
    bob.accessToken,
  );

  assertEquals(status, 200);
  const result = body as { matchId: string; requestStatus: string };
  assertEquals(result.requestStatus, 'accepted');

  const supa = adminClient();
  const { data: m } = await supa.from('matches').select('*').eq('id', result.matchId).single();
  assertEquals(m!.status, 'awaiting_confirmation');
  assertEquals(m!.team_a_player_ids[0], alice.userId);
  assertEquals(m!.team_b_player_ids[0], bob.userId);
});

Deno.test('accept-match-request: non-target cannot accept', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const carol = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });

  const reqId = await makeRequest(alice.accessToken, bob.userId);
  const { status } = await invokeFunction(
    'accept-match-request',
    { requestId: reqId },
    carol.accessToken,
  );
  assertEquals(status, 403);
});

Deno.test('accept-match-request: cannot accept expired', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { data: req } = await supa
    .from('match_requests')
    .insert({
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
    })
    .select('id')
    .single();

  const { status, body } = await invokeFunction(
    'accept-match-request',
    { requestId: req!.id },
    bob.accessToken,
  );
  assertEquals(status, 409);
  const msg = (body as { error: { message: string } }).error.message;
  assertEquals(msg.toLowerCase().includes('expired'), true);
});
