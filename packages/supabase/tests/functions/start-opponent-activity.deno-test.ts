import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

// start-opponent-activity authenticates with INTERNAL_PUSH_KEY as the Bearer
// token (like dispatch-push / push-live-score). The local edge runtime is served
// with INTERNAL_PUSH_KEY=test-internal-key.
const INTERNAL_PUSH_KEY = Deno.env.get('INTERNAL_PUSH_KEY') ?? 'test-internal-key';

async function probeKeyHonored(): Promise<boolean> {
  const { status } = await invokeFunction(
    'start-opponent-activity',
    { matchId: '00000000-0000-0000-0000-000000000099' },
    INTERNAL_PUSH_KEY,
  );
  return status !== 401;
}
const KEY_HONORED = await probeKeyHonored();

/** Create an accepted match between isolated (UUID-suffixed) users via direct DB inserts.
 *  Uses admin client to bypass edge-function chains which can be flaky under concurrent load. */
async function makeIsolatedMatch(): Promise<{
  matchId: string; aliceId: string; bobId: string;
  aliceToken: string; bobToken: string;
}> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({
    email: `alice-soa-${suffix}@test.local`,
    genderCategory: 'erkek',
  });
  const bob = await createTestUser({
    email: `bob-soa-${suffix}@test.local`,
    genderCategory: 'erkek',
  });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  if (!court) throw new Error('No court found');

  const { data: req } = await supa.from('match_requests').insert({
    creator_id: alice.userId,
    target_id: bob.userId,
    type: 'direct_challenge',
    category: 'erkek_tek',
    format: 'bu_klasik',
    proposed_date: '2026-08-01',
    proposed_time: '19:00',
    court_id: court.id,
    status: 'accepted',
    expires_at: '2026-09-01T00:00:00Z',
  }).select('id').single();
  if (!req) throw new Error(`makeIsolatedMatch: match_request insert failed (suffix ${suffix})`);

  const { data: m, error: matchErr } = await supa.from('matches').insert({
    match_request_id: req.id,
    category: 'erkek_tek',
    format: 'bu_klasik',
    court_id: court.id,
    played_at: '2026-08-01T18:00:00Z',
    is_rated: true,
    team_a_player_ids: [alice.userId],
    team_b_player_ids: [bob.userId],
    // status defaults to 'awaiting_confirmation'
  }).select('id').single();
  if (!m || matchErr) throw new Error(`makeIsolatedMatch: match insert failed (suffix ${suffix}): ${matchErr?.message}`);

  return {
    matchId: m.id,
    aliceId: alice.userId,
    bobId: bob.userId,
    aliceToken: alice.accessToken,
    bobToken: bob.accessToken,
  };
}

Deno.test('start-opponent-activity: missing/wrong Bearer → 401', async () => {
  // Auth is checked BEFORE any DB query — a fake UUID is sufficient.
  const fakeMatchId = '00000000-0000-0000-0000-000000000001';

  const noAuth = await invokeFunction('start-opponent-activity', { matchId: fakeMatchId });
  assertEquals(noAuth.status, 401);

  const wrong = await invokeFunction(
    'start-opponent-activity',
    { matchId: fakeMatchId },
    'definitely-not-the-key',
  );
  assertEquals(wrong.status, 401);
});

Deno.test({
  name: 'start-opponent-activity: all participants already started → pushed:0 (no Vault)',
  ignore: !KEY_HONORED,
  async fn() {
    const { matchId, aliceId, bobId } = await makeIsolatedMatch();
    try {
      const supa = adminClient();
      const { error } = await supa
        .from('matches')
        .update({ started_by: [aliceId, bobId] })
        .eq('id', matchId);
      if (error) throw new Error(`seed started_by: ${error.message}`);

      const r = await invokeFunction('start-opponent-activity', { matchId }, INTERNAL_PUSH_KEY);
      assertEquals(r.status, 200);
      assertEquals((r.body as { pushed: number }).pushed, 0);
    } finally {
      await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
    }
  },
});

Deno.test({
  name: 'start-opponent-activity: non-starter has no push-to-start token → pushed:0 (early return, no Vault)',
  ignore: !KEY_HONORED,
  async fn() {
    const { matchId, aliceId, bobId } = await makeIsolatedMatch();
    try {
      const supa = adminClient();
      const { error } = await supa
        .from('matches')
        .update({ started_by: [aliceId] })
        .eq('id', matchId);
      if (error) throw new Error(`seed started_by: ${error.message}`);

      const r = await invokeFunction('start-opponent-activity', { matchId }, INTERNAL_PUSH_KEY);
      assertEquals(r.status, 200);
      assertEquals((r.body as { pushed: number }).pushed, 0);
    } finally {
      await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
    }
  },
});

Deno.test('start-opponent-activity: unknown match → pushed:0 reason no match', async () => {
  const r = await invokeFunction(
    'start-opponent-activity',
    { matchId: '00000000-0000-0000-0000-000000000000' },
    INTERNAL_PUSH_KEY,
  );
  assertEquals(r.status, 200);
  assertEquals((r.body as { pushed: number; reason?: string }).pushed, 0);
});
