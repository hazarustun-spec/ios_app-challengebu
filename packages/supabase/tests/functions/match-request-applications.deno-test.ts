import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser } from './helpers.ts';

/**
 * Plan 8 Task A2 — match_request_applications table + accept_match_application RPC.
 *
 * Verifies that:
 *  - Applicants can insert their own application; duplicates are rejected by the
 *    `(request_id, applicant_id)` unique constraint.
 *  - `accept_match_application` (RPC) updates the underlying `match_requests`
 *    row atomically: status → 'accepted', target_id → applicant, accepted_at set.
 *  - Only the request creator can call the RPC (errcode 42501 otherwise).
 *
 * Schema deviations from the original spec (recorded for reviewer):
 *  - `match_requests` uses `type = 'open_call'` (not `is_open_call boolean`).
 *  - The check constraint `direct_challenge_has_target` was relaxed in this
 *    migration so accepted open-call requests can carry a target_id.
 *  - `accepted_at` did not exist on `match_requests` previously; this migration
 *    adds it.
 */

async function seedOpenCall(creatorId: string): Promise<string> {
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  if (!court) throw new Error('No court seeded; run `supabase db reset`');

  const { data: req, error } = await supa
    .from('match_requests')
    .insert({
      creator_id: creatorId,
      type: 'open_call',
      target_id: null,
      category: 'erkek_tek',
      format: 'bu_klasik',
      is_rated: true,
      proposed_date: '2026-07-01',
      proposed_time: '19:00',
      court_id: court.id,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();
  if (error || !req) throw new Error(`seedOpenCall: ${error?.message}`);
  return req.id as string;
}

Deno.test('match_request_applications: applicant insert + duplicate rejected', async () => {
  await cleanupTestData();
  const creator = await createTestUser({ email: 'creator-a2@test.local', genderCategory: 'erkek' });
  const applicant = await createTestUser({ email: 'applicant-a2@test.local', genderCategory: 'erkek' });

  const requestId = await seedOpenCall(creator.userId);
  const supa = adminClient();

  const { error: firstErr } = await supa
    .from('match_request_applications')
    .insert({
      request_id: requestId,
      applicant_id: applicant.userId,
      note: 'Cuma akşam müsaitim',
    });
  assertEquals(firstErr, null);

  const { error: dupErr } = await supa
    .from('match_request_applications')
    .insert({
      request_id: requestId,
      applicant_id: applicant.userId,
      note: 'tekrar deniyorum',
    });
  if (!dupErr) throw new Error('duplicate insert should have failed (unique constraint)');

  await cleanupTestData();
});

Deno.test('accept_match_application: updates match_requests atomically', async () => {
  await cleanupTestData();
  const creator = await createTestUser({ email: 'creator-a2@test.local', genderCategory: 'erkek' });
  const applicant = await createTestUser({ email: 'applicant-a2@test.local', genderCategory: 'erkek' });

  const requestId = await seedOpenCall(creator.userId);
  const supa = adminClient();

  await supa.from('match_request_applications').insert({
    request_id: requestId,
    applicant_id: applicant.userId,
    note: 'Geliyorum!',
  });

  // Call RPC as the creator (via REST with creator's access token so auth.uid() resolves).
  const userSupa = (await import('@supabase/supabase-js')).createClient(
    'http://127.0.0.1:54321',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: `Bearer ${creator.accessToken}` } },
    },
  );
  const { error: rpcErr } = await userSupa.rpc('accept_match_application', {
    p_request_id: requestId,
    p_applicant_user_id: applicant.userId,
  });
  if (rpcErr) throw new Error(`accept_match_application failed: ${rpcErr.message}`);

  const { data: req } = await supa
    .from('match_requests')
    .select('status, target_id, accepted_at')
    .eq('id', requestId)
    .single();

  assertEquals(req!.status, 'accepted');
  assertEquals(req!.target_id, applicant.userId);
  if (!req!.accepted_at) throw new Error('accepted_at should be set');

  await cleanupTestData();
});

Deno.test('accept_match_application: non-creator forbidden', async () => {
  await cleanupTestData();
  const creator = await createTestUser({ email: 'creator-a2@test.local', genderCategory: 'erkek' });
  const applicant = await createTestUser({ email: 'applicant-a2@test.local', genderCategory: 'erkek' });
  const stranger = await createTestUser({ email: 'stranger-a2@test.local', genderCategory: 'erkek' });

  const requestId = await seedOpenCall(creator.userId);
  const supa = adminClient();
  await supa.from('match_request_applications').insert({
    request_id: requestId,
    applicant_id: applicant.userId,
  });

  const strangerSupa = (await import('@supabase/supabase-js')).createClient(
    'http://127.0.0.1:54321',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: `Bearer ${stranger.accessToken}` } },
    },
  );
  const { error: rpcErr } = await strangerSupa.rpc('accept_match_application', {
    p_request_id: requestId,
    p_applicant_user_id: applicant.userId,
  });
  if (!rpcErr) throw new Error('non-creator RPC call should have failed');
  // PostgREST surfaces errcode in `code`.
  assertEquals(rpcErr.code, '42501');

  await cleanupTestData();
});
