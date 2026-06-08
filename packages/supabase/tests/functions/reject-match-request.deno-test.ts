import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('reject-match-request: target rejects pending request', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: created } = await invokeFunction(
    'create-match-request',
    {
      type: 'direct_challenge',
      targetId: bob.userId,
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    alice.accessToken,
  );

  const { status } = await invokeFunction(
    'reject-match-request',
    { requestId: (created as { id: string }).id },
    bob.accessToken,
  );
  assertEquals(status, 200);

  const { data: row } = await supa
    .from('match_requests')
    .select('status')
    .eq('id', (created as { id: string }).id)
    .single();
  assertEquals(row!.status, 'rejected');
});

Deno.test('reject-match-request: non-target forbidden', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const carol = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: created } = await invokeFunction(
    'create-match-request',
    {
      type: 'direct_challenge',
      targetId: bob.userId,
      category: 'erkek_tek',
      format: 'bu_klasik',
      isRated: true,
      proposedDate: '2026-07-01',
      proposedTime: '19:00',
      courtId: court!.id,
    },
    alice.accessToken,
  );

  const { status } = await invokeFunction(
    'reject-match-request',
    { requestId: (created as { id: string }).id },
    carol.accessToken,
  );
  assertEquals(status, 403);
});
