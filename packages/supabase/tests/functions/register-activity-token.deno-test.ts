import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

async function pendingMatch(suffix: string): Promise<{
  aliceToken: string; matchId: string; aliceId: string; bobId: string;
}> {
  const alice = await createTestUser({ email: `alice-rat-${suffix}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-rat-${suffix}@test.local`, genderCategory: 'erkek' });
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
  return { aliceToken: alice.accessToken, matchId, aliceId: alice.userId, bobId: bob.userId };
}

Deno.test('register-activity-token: missing auth → 401', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceId, bobId } = await pendingMatch(s);
  try {
    const r = await invokeFunction('register-activity-token', { matchId, token: 'deadbeef' });
    assertEquals(r.status, 401);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('register-activity-token: valid call → 200 + row upserted', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { aliceToken, matchId, aliceId, bobId } = await pendingMatch(s);
  try {
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

    // Upsert: second call updates the same row
    const r2 = await invokeFunction('register-activity-token', { matchId, token: 'cafebabe02' }, aliceToken);
    assertEquals(r2.status, 200);
    const { data: rows } = await supa
      .from('live_activity_tokens')
      .select('update_token')
      .eq('match_id', matchId)
      .eq('user_id', aliceId);
    assertEquals(rows!.length, 1);
    assertEquals(rows![0].update_token, 'cafebabe02');
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('register-activity-token: authenticated non-participant → 403', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceId, bobId } = await pendingMatch(s);
  const carol = await createTestUser({ email: `carol-rat-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const r = await invokeFunction(
      'register-activity-token',
      { matchId, token: 'deadbeef03' },
      carol.accessToken,
    );
    assertEquals(r.status, 403);

    const supa = adminClient();
    const { data: rows } = await supa
      .from('live_activity_tokens')
      .select('user_id')
      .eq('match_id', matchId)
      .eq('user_id', carol.userId);
    assertEquals(rows!.length, 0);
  } finally {
    await teardownUsers([aliceId, bobId, carol.userId], { matchIds: [matchId] });
  }
});

Deno.test('register-activity-token: invalid input → 400', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { aliceToken, aliceId, bobId, matchId } = await pendingMatch(s);
  try {
    const r = await invokeFunction('register-activity-token', { matchId: 'not-a-uuid', token: '' }, aliceToken);
    assertEquals(r.status, 400);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});
