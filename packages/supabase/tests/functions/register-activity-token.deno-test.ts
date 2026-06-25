import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

async function pendingMatch(): Promise<{ aliceToken: string; matchId: string; aliceId: string }> {
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: req } = await invokeFunction('create-match-request', {
    type: 'direct_challenge', targetId: bob.userId, category: 'erkek_tek',
    format: 'bu_klasik', isRated: true, proposedDate: '2026-07-01',
    proposedTime: '19:00', courtId: court!.id,
  }, alice.accessToken);
  const { body: acc } = await invokeFunction('accept-match-request', { requestId: (req as { id: string }).id }, bob.accessToken);
  const matchId = (acc as { matchId: string }).matchId;
  return { aliceToken: alice.accessToken, matchId, aliceId: alice.userId };
}

Deno.test('register-activity-token: missing auth → 401', async () => {
  await cleanupTestData();
  const { matchId } = await pendingMatch();
  const r = await invokeFunction('register-activity-token', { matchId, token: 'deadbeef' });
  assertEquals(r.status, 401);
});

Deno.test('register-activity-token: valid call → 200 + row upserted', async () => {
  await cleanupTestData();
  const { aliceToken, matchId, aliceId } = await pendingMatch();

  const r = await invokeFunction('register-activity-token', { matchId, token: 'deadbeef01' }, aliceToken);
  assertEquals(r.status, 200);

  const supa = adminClient();
  const { data: row } = await supa
    .from('live_activity_tokens')
    .select('*')
    .eq('match_id', matchId)
    .eq('user_id', aliceId)
    .single();
  if (!row) throw new Error('token row not inserted');
  assertEquals(row.update_token, 'deadbeef01');

  // Upsert: a second call with a new token updates the same row.
  const r2 = await invokeFunction('register-activity-token', { matchId, token: 'cafebabe02' }, aliceToken);
  assertEquals(r2.status, 200);
  const { data: rows } = await supa
    .from('live_activity_tokens')
    .select('update_token')
    .eq('match_id', matchId)
    .eq('user_id', aliceId);
  assertEquals(rows!.length, 1);
  assertEquals(rows![0].update_token, 'cafebabe02');
});

Deno.test('register-activity-token: authenticated non-participant → 403', async () => {
  await cleanupTestData();
  // alice & bob are the match participants (created inside pendingMatch).
  const { matchId } = await pendingMatch();
  // carol is a valid, authenticated user but NOT on either team.
  const carol = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });

  const r = await invokeFunction(
    'register-activity-token',
    { matchId, token: 'deadbeef03' },
    carol.accessToken,
  );
  assertEquals(r.status, 403);

  // And no token row was created for the non-participant.
  const supa = adminClient();
  const { data: rows } = await supa
    .from('live_activity_tokens')
    .select('user_id')
    .eq('match_id', matchId)
    .eq('user_id', carol.userId);
  assertEquals(rows!.length, 0);
});

Deno.test('register-activity-token: invalid input → 400', async () => {
  await cleanupTestData();
  const { aliceToken } = await pendingMatch();
  const r = await invokeFunction('register-activity-token', { matchId: 'not-a-uuid', token: '' }, aliceToken);
  assertEquals(r.status, 400);
});
