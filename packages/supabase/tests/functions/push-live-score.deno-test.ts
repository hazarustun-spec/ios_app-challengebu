import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction } from './helpers.ts';

// push-live-score authenticates with INTERNAL_PUSH_KEY as the Bearer token (like
// dispatch-push). Serve the function with the same value in its env, e.g.:
//   supabase functions serve --no-verify-jwt --env-file <(echo INTERNAL_PUSH_KEY=test-internal-key)
// and run the test with INTERNAL_PUSH_KEY exported to the matching value.
const INTERNAL_PUSH_KEY = Deno.env.get('INTERNAL_PUSH_KEY') ?? 'test-internal-key';

/**
 * The local stack may be running without INTERNAL_PUSH_KEY configured in the
 * edge runtime, in which case EVERY call returns 401 (the key check is first)
 * and the post-auth branches are unreachable. Probe once: if a valid-key call
 * for a random (non-existent) match id is NOT rejected, the key is honored and
 * we can exercise the post-auth behavior. The auth-rejection tests always run
 * regardless.
 */
async function probeKeyHonored(): Promise<boolean> {
  const { status } = await invokeFunction(
    'push-live-score',
    { matchId: '00000000-0000-0000-0000-000000000099', notificationId: null },
    INTERNAL_PUSH_KEY,
  );
  return status !== 401;
}
const KEY_HONORED = await probeKeyHonored();

/**
 * Create an accepted match between two ISOLATED test users (unique email per
 * test run so concurrent/repeated runs never collide). Returns matchId and both
 * userIds for use in targeted teardown.
 */
async function makeIsolatedMatch(): Promise<{
  matchId: string;
  aliceId: string;
  bobId: string;
}> {
  // Direct DB inserts — avoids edge-function chain failures under concurrent load.
  const suffix = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({
    email: `alice-pls-${suffix}@test.local`,
    genderCategory: 'erkek',
  });
  const bob = await createTestUser({
    email: `bob-pls-${suffix}@test.local`,
    genderCategory: 'erkek',
  });
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
    matchId: m.id,
    aliceId: alice.userId,
    bobId: bob.userId,
  };
}

/**
 * Delete only the rows created by one isolated test run, in FK-safe order.
 * Mirrors the dependency order used by cleanupTestData() but scoped to the
 * specific users/match so parallel or sequential tests never interfere.
 */
async function teardown(matchId: string, aliceId: string, bobId: string): Promise<void> {
  const supa = adminClient();
  const userIds = [aliceId, bobId];
  // Dependents first (same order as cleanupTestData, but scoped to our rows).
  await supa.from('audit_log').delete().in('actor_id', userIds);
  await supa.from('notifications').delete().in('recipient_id', userIds);
  // live_activity_tokens and live_match_scores both CASCADE from matches, but
  // delete explicitly so any future schema change doesn't silently break cleanup.
  await supa.from('live_activity_tokens').delete().eq('match_id', matchId);
  await supa.from('live_match_scores').delete().eq('match_id', matchId);
  await supa.from('matches').delete().eq('id', matchId);
  // conversations CASCADE from match_requests; find our requests first.
  const { data: reqRows } = await supa
    .from('match_requests')
    .select('id')
    .in('requester_id', userIds);
  const reqIds = (reqRows ?? []).map((r: { id: string }) => r.id);
  if (reqIds.length > 0) {
    await supa.from('conversations').delete().in('match_request_id', reqIds);
  }
  await supa.from('match_requests').delete().in('requester_id', userIds);
  await supa.from('push_tokens').delete().in('profile_id', userIds);
  // Profiles cascade when auth.users are deleted.
  for (const id of userIds) {
    await supa.auth.admin.deleteUser(id);
  }
}

Deno.test('push-live-score: missing/wrong Bearer → 401', async () => {
  // Auth is checked BEFORE any DB query, so a fake UUID is sufficient here —
  // no need to create real users/match for pure auth-rejection tests.
  const fakeId = '00000000-0000-0000-0000-000000000001';

  // No Authorization header at all.
  const noAuth = await invokeFunction('push-live-score', { matchId: fakeId });
  assertEquals(noAuth.status, 401);

  // Present but not equal to INTERNAL_PUSH_KEY.
  const wrong = await invokeFunction('push-live-score', { matchId: fakeId }, 'definitely-not-the-key');
  assertEquals(wrong.status, 401);
});

Deno.test({
  name: 'push-live-score: score row, zero tokens → 200 pushed:0 (no APNs/Vault)',
  // Skip when the edge runtime has no INTERNAL_PUSH_KEY; every call would
  // return 401 before reaching the post-auth logic (same guard as dispatch-push).
  ignore: !KEY_HONORED,
  async fn() {
    const { matchId, aliceId, bobId } = await makeIsolatedMatch();
    try {
      // Seed a live_match_scores row directly (admin/service role bypasses RLS).
      // No live_activity_tokens rows for this match → the fn must short-circuit
      // BEFORE reading Vault or signing a JWT, so this passes with no .p8 present.
      const supa = adminClient();
      const { error } = await supa.from('live_match_scores').insert({
        match_id: matchId, games_a: 1, games_b: 0, points_a: 2, points_b: 1, phase: 'ongoing',
      });
      if (error) throw new Error(`seed live_match_scores: ${error.message}`);

      const r = await invokeFunction(
        'push-live-score',
        { matchId, notificationId: null },
        INTERNAL_PUSH_KEY,
      );
      assertEquals(r.status, 200);
      // Scoped assertion: we check the function's response for OUR matchId.
      // The function queries live_activity_tokens WHERE match_id = matchId; since
      // we never registered any tokens for this isolated match, pushed must be 0.
      assertEquals((r.body as { pushed: number }).pushed, 0);
    } finally {
      await teardown(matchId, aliceId, bobId);
    }
  },
});
