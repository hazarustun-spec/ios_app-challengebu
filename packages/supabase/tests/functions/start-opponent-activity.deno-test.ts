import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

// start-opponent-activity authenticates with INTERNAL_PUSH_KEY as the Bearer
// token (like dispatch-push / push-live-score). The local edge runtime is served
// with INTERNAL_PUSH_KEY=test-internal-key.
const INTERNAL_PUSH_KEY = Deno.env.get('INTERNAL_PUSH_KEY') ?? 'test-internal-key';

/** Create an accepted match between alice & bob; return ids. */
async function makeMatch(): Promise<{ matchId: string; aliceId: string; bobId: string }> {
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
  return { matchId: (acc as { matchId: string }).matchId, aliceId: alice.userId, bobId: bob.userId };
}

Deno.test('start-opponent-activity: missing/wrong Bearer → 401', async () => {
  await cleanupTestData();
  const { matchId } = await makeMatch();

  const noAuth = await invokeFunction('start-opponent-activity', { matchId });
  assertEquals(noAuth.status, 401);

  const wrong = await invokeFunction('start-opponent-activity', { matchId }, 'definitely-not-the-key');
  assertEquals(wrong.status, 401);
});

Deno.test('start-opponent-activity: all participants already started → pushed:0 (no Vault)', async () => {
  await cleanupTestData();
  const { matchId, aliceId, bobId } = await makeMatch();

  // Everyone has started → no non-starters → must short-circuit before Vault,
  // so this passes with no .p8 present.
  const supa = adminClient();
  const { error } = await supa
    .from('matches')
    .update({ started_by: [aliceId, bobId] })
    .eq('id', matchId);
  if (error) throw new Error(`seed started_by: ${error.message}`);

  const r = await invokeFunction('start-opponent-activity', { matchId }, INTERNAL_PUSH_KEY);
  assertEquals(r.status, 200);
  assertEquals((r.body as { pushed: number }).pushed, 0);
});

Deno.test('start-opponent-activity: non-starter has no push-to-start token → pushed:0 (early return, no Vault)', async () => {
  await cleanupTestData();
  const { matchId, aliceId } = await makeMatch();

  // Only alice started → bob is a non-starter, but bob has NO push_to_start_tokens
  // row, so the fn must return BEFORE reading Vault / signing a JWT.
  const supa = adminClient();
  const { error } = await supa
    .from('matches')
    .update({ started_by: [aliceId] })
    .eq('id', matchId);
  if (error) throw new Error(`seed started_by: ${error.message}`);

  const r = await invokeFunction('start-opponent-activity', { matchId }, INTERNAL_PUSH_KEY);
  assertEquals(r.status, 200);
  assertEquals((r.body as { pushed: number }).pushed, 0);
});

Deno.test('start-opponent-activity: unknown match → pushed:0 reason no match', async () => {
  await cleanupTestData();
  const r = await invokeFunction(
    'start-opponent-activity',
    { matchId: '00000000-0000-0000-0000-000000000000' },
    INTERNAL_PUSH_KEY,
  );
  assertEquals(r.status, 200);
  assertEquals((r.body as { pushed: number; reason?: string }).pushed, 0);
});
