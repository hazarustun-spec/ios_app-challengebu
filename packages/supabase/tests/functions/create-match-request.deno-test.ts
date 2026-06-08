import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from './helpers.ts';

Deno.test('create-match-request: direct challenge happy path', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { status, body } = await invokeFunction(
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

  assertEquals(status, 200);
  const created = body as { id: string; status: string; expiresAt: string };
  assertEquals(created.status, 'pending');

  const { data: row } = await supa.from('match_requests').select('*').eq('id', created.id).single();
  assertEquals(row!.creator_id, alice.userId);
  assertEquals(row!.target_id, bob.userId);
});

Deno.test('create-match-request: enforces 3 pending limit for rated', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const base = {
    type: 'direct_challenge' as const,
    targetId: bob.userId,
    category: 'erkek_tek' as const,
    format: 'bu_klasik' as const,
    isRated: true,
    proposedDate: '2026-07-01',
    proposedTime: '19:00',
    courtId: court!.id,
  };

  for (let i = 0; i < 3; i++) {
    const r = await invokeFunction('create-match-request', base, alice.accessToken);
    assertEquals(r.status, 200);
  }

  const fourth = await invokeFunction('create-match-request', base, alice.accessToken);
  assertEquals(fourth.status, 409);
});

Deno.test('create-match-request: dostluk (unrated) is exempt from limit', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const base = {
    type: 'direct_challenge' as const,
    targetId: bob.userId,
    category: 'erkek_tek' as const,
    format: 'bu_klasik' as const,
    isRated: false,
    proposedDate: '2026-07-01',
    proposedTime: '19:00',
    courtId: court!.id,
  };

  for (let i = 0; i < 5; i++) {
    const r = await invokeFunction('create-match-request', base, alice.accessToken);
    assertEquals(r.status, 200);
  }
});

Deno.test('create-match-request: rejects invalid date (13/32)', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { status } = await invokeFunction('create-match-request', {
    type: 'direct_challenge',
    targetId: bob.userId,
    category: 'erkek_tek',
    format: 'bu_klasik',
    isRated: true,
    proposedDate: '2026-13-32',
    proposedTime: '19:00',
    courtId: court!.id,
  }, alice.accessToken);
  assertEquals(status, 400);
});

Deno.test('create-match-request: rejects invalid time (25:99)', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { status } = await invokeFunction('create-match-request', {
    type: 'direct_challenge',
    targetId: bob.userId,
    category: 'erkek_tek',
    format: 'bu_klasik',
    isRated: true,
    proposedDate: '2026-07-01',
    proposedTime: '25:99',
    courtId: court!.id,
  }, alice.accessToken);
  assertEquals(status, 400);
});

Deno.test('create-match-request: rejects self-challenge', async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice@test.local', genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  const { status, body } = await invokeFunction('create-match-request', {
    type: 'direct_challenge',
    targetId: alice.userId,  // self
    category: 'erkek_tek',
    format: 'bu_klasik',
    isRated: true,
    proposedDate: '2026-07-01',
    proposedTime: '19:00',
    courtId: court!.id,
  }, alice.accessToken);
  assertEquals(status, 400);
  assertEquals(((body as { error: { message: string } }).error.message).includes('yourself'), true);
});
