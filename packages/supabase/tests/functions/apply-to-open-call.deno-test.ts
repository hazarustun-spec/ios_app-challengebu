import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

Deno.test('apply-to-open-call: user applies to open call', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-atoc-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-atoc-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const supa = adminClient();
    const { data: court } = await supa.from('courts').select('id').limit(1).single();

    const { body: created } = await invokeFunction('create-match-request', {
      type: 'open_call', category: 'erkek_tek', format: 'bu_klasik',
      isRated: true, proposedDate: '2026-07-01', proposedTime: '19:00', courtId: court!.id,
    }, alice.accessToken);

    const { status } = await invokeFunction(
      'apply-to-open-call',
      { requestId: (created as { id: string }).id },
      bob.accessToken,
    );
    assertEquals(status, 200);

    const { data: apps } = await supa
      .from('open_call_applications')
      .select('*')
      .eq('match_request_id', (created as { id: string }).id);
    assertEquals(apps!.length, 1);
    assertEquals(apps![0].applicant_id, bob.userId);
  } finally {
    await teardownUsers([alice.userId, bob.userId]);
  }
});

Deno.test('apply-to-open-call: cannot apply to own call', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-atoc-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const supa = adminClient();
    const { data: court } = await supa.from('courts').select('id').limit(1).single();

    const { body: created } = await invokeFunction('create-match-request', {
      type: 'open_call', category: 'erkek_tek', format: 'bu_klasik',
      isRated: true, proposedDate: '2026-07-01', proposedTime: '19:00', courtId: court!.id,
    }, alice.accessToken);

    const { status } = await invokeFunction(
      'apply-to-open-call',
      { requestId: (created as { id: string }).id },
      alice.accessToken,
    );
    assertEquals(status, 400);
  } finally {
    await teardownUsers([alice.userId]);
  }
});
