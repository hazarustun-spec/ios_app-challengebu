import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

Deno.test('select-application: creator selects applicant', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-soca-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-soca-${s}@test.local`, genderCategory: 'erkek' });
  const carol = await createTestUser({ email: `carol-soca-${s}@test.local`, genderCategory: 'erkek' });
  let matchId = '';
  try {
    const supa = adminClient();
    const { data: court } = await supa.from('courts').select('id').limit(1).single();

    const { body: created } = await invokeFunction('create-match-request', {
      type: 'open_call', category: 'erkek_tek', format: 'bu_klasik',
      isRated: true, proposedDate: '2026-07-01', proposedTime: '19:00', courtId: court!.id,
    }, alice.accessToken);
    const requestId = (created as { id: string }).id;

    await invokeFunction('apply-to-open-call', { requestId }, bob.accessToken);
    await invokeFunction('apply-to-open-call', { requestId }, carol.accessToken);

    const { data: bobApp } = await supa
      .from('open_call_applications')
      .select('id')
      .eq('applicant_id', bob.userId)
      .single();

    const { status, body } = await invokeFunction(
      'select-open-call-application', { applicationId: bobApp!.id }, alice.accessToken,
    );
    assertEquals(status, 200);

    const result = body as { matchId: string };
    matchId = result.matchId;
    const { data: match } = await supa.from('matches').select('*').eq('id', matchId).single();
    assertEquals(match!.team_b_player_ids[0], bob.userId);

    const { data: carolApp } = await supa
      .from('open_call_applications')
      .select('status')
      .eq('applicant_id', carol.userId)
      .single();
    assertEquals(carolApp!.status, 'declined');
  } finally {
    await teardownUsers([alice.userId, bob.userId, carol.userId], { matchIds: matchId ? [matchId] : [] });
  }
});

Deno.test('select-application: non-creator forbidden', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-soca-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-soca-${s}@test.local`, genderCategory: 'erkek' });
  const carol = await createTestUser({ email: `carol-soca-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const supa = adminClient();
    const { data: court } = await supa.from('courts').select('id').limit(1).single();
    const { body: created } = await invokeFunction('create-match-request', {
      type: 'open_call', category: 'erkek_tek', format: 'bu_klasik',
      isRated: true, proposedDate: '2026-07-01', proposedTime: '19:00', courtId: court!.id,
    }, alice.accessToken);
    const requestId = (created as { id: string }).id;
    await invokeFunction('apply-to-open-call', { requestId }, bob.accessToken);
    const { data: bobApp } = await supa
      .from('open_call_applications')
      .select('id')
      .eq('applicant_id', bob.userId)
      .single();

    const { status } = await invokeFunction(
      'select-open-call-application', { applicationId: bobApp!.id }, carol.accessToken,
    );
    assertEquals(status, 403);
  } finally {
    await teardownUsers([alice.userId, bob.userId, carol.userId]);
  }
});
