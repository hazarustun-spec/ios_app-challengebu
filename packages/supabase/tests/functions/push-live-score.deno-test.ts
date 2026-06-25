import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

// push-live-score authenticates with INTERNAL_PUSH_KEY as the Bearer token (like
// dispatch-push). Serve the function with the same value in its env, e.g.:
//   supabase functions serve --no-verify-jwt --env-file <(echo INTERNAL_PUSH_KEY=test-internal-key)
// and run the test with INTERNAL_PUSH_KEY exported to the matching value.
const INTERNAL_PUSH_KEY = Deno.env.get('INTERNAL_PUSH_KEY') ?? 'test-internal-key';

/** Create an accepted match between two test users; return its id. */
async function makeMatch(): Promise<string> {
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
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
  return (acc as { matchId: string }).matchId;
}

Deno.test('push-live-score: missing/wrong Bearer → 401', async () => {
  await cleanupTestData();
  const matchId = await makeMatch();

  // No Authorization header at all.
  const noAuth = await invokeFunction('push-live-score', { matchId });
  assertEquals(noAuth.status, 401);

  // Present but not equal to INTERNAL_PUSH_KEY.
  const wrong = await invokeFunction('push-live-score', { matchId }, 'definitely-not-the-key');
  assertEquals(wrong.status, 401);
});

Deno.test('push-live-score: score row, zero tokens → 200 pushed:0 (no APNs/Vault)', async () => {
  await cleanupTestData();
  const matchId = await makeMatch();

  // Seed a live_match_scores row directly (admin/service role bypasses RLS).
  // No live_activity_tokens rows for this match → the fn must short-circuit
  // BEFORE reading Vault or signing a JWT, so this passes with no .p8 present.
  const supa = adminClient();
  const { error } = await supa.from('live_match_scores').insert({
    match_id: matchId, games_a: 1, games_b: 0, points_a: 2, points_b: 1, phase: 'ongoing',
  });
  if (error) throw new Error(`seed live_match_scores: ${error.message}`);

  const r = await invokeFunction('push-live-score', { matchId, notificationId: null }, INTERNAL_PUSH_KEY);
  assertEquals(r.status, 200);
  assertEquals((r.body as { pushed: number }).pushed, 0);
});
