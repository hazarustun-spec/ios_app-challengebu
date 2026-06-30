import { assertEquals } from 'jsr:@std/assert';
import { adminClient, ANON_KEY, createTestUser, teardownUsers, SUPABASE_URL } from './helpers.ts';
import { createClient } from '@supabase/supabase-js';

/**
 * Plan 8 Task A2 — match_request_applications table + accept_match_application RPC.
 */

async function seedOpenCall(creatorId: string): Promise<string> {
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  if (!court) throw new Error('No court seeded; run `supabase db reset`');
  const { data: req, error } = await supa.from('match_requests').insert({
    creator_id: creatorId, type: 'open_call', target_id: null,
    category: 'erkek_tek', format: 'bu_klasik', is_rated: true,
    proposed_date: '2026-07-01', proposed_time: '19:00', court_id: court.id,
    status: 'pending', expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }).select('id').single();
  if (error || !req) throw new Error(`seedOpenCall: ${error?.message}`);
  return req.id as string;
}

async function seedDirectChallenge(creatorId: string, targetId: string): Promise<string> {
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  if (!court) throw new Error('No court seeded');
  const { data: req, error } = await supa.from('match_requests').insert({
    creator_id: creatorId, type: 'direct_challenge', target_id: targetId,
    category: 'erkek_tek', format: 'bu_klasik', is_rated: true,
    proposed_date: '2026-07-01', proposed_time: '19:00', court_id: court.id,
    status: 'pending', expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }).select('id').single();
  if (error || !req) throw new Error(`seedDirectChallenge: ${error?.message}`);
  return req.id as string;
}

function jwtClient(accessToken: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

Deno.test('match_request_applications: applicant insert + duplicate rejected', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const creator = await createTestUser({ email: `creator-mra-${s}@test.local`, genderCategory: 'erkek' });
  const applicant = await createTestUser({ email: `applicant-mra-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const requestId = await seedOpenCall(creator.userId);
    const supa = adminClient();

    const { error: firstErr } = await supa
      .from('match_request_applications')
      .insert({ request_id: requestId, applicant_id: applicant.userId, note: 'Cuma akşam müsaitim' });
    assertEquals(firstErr, null);

    const { error: dupErr } = await supa
      .from('match_request_applications')
      .insert({ request_id: requestId, applicant_id: applicant.userId, note: 'tekrar' });
    if (!dupErr) throw new Error('duplicate insert should have failed (unique constraint)');
  } finally {
    await teardownUsers([creator.userId, applicant.userId]);
  }
});

Deno.test('accept_match_application: updates match_requests atomically', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const creator = await createTestUser({ email: `creator-mra-${s}@test.local`, genderCategory: 'erkek' });
  const applicant = await createTestUser({ email: `applicant-mra-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const requestId = await seedOpenCall(creator.userId);
    const supa = adminClient();
    await supa.from('match_request_applications').insert({
      request_id: requestId, applicant_id: applicant.userId, note: 'Geliyorum!',
    });

    const { error: rpcErr } = await jwtClient(creator.accessToken).rpc('accept_match_application', {
      p_request_id: requestId, p_applicant_user_id: applicant.userId,
    });
    if (rpcErr) throw new Error(`accept_match_application failed: ${rpcErr.message}`);

    const { data: req } = await supa
      .from('match_requests').select('status, target_id, accepted_at').eq('id', requestId).single();
    assertEquals(req!.status, 'accepted');
    assertEquals(req!.target_id, applicant.userId);
    if (!req!.accepted_at) throw new Error('accepted_at should be set');
  } finally {
    await teardownUsers([creator.userId, applicant.userId]);
  }
});

Deno.test('accept_match_application: non-creator forbidden', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const creator = await createTestUser({ email: `creator-mra-${s}@test.local`, genderCategory: 'erkek' });
  const applicant = await createTestUser({ email: `applicant-mra-${s}@test.local`, genderCategory: 'erkek' });
  const stranger = await createTestUser({ email: `stranger-mra-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const requestId = await seedOpenCall(creator.userId);
    const supa = adminClient();
    await supa.from('match_request_applications').insert({
      request_id: requestId, applicant_id: applicant.userId,
    });

    const { error: rpcErr } = await jwtClient(stranger.accessToken).rpc('accept_match_application', {
      p_request_id: requestId, p_applicant_user_id: applicant.userId,
    });
    if (!rpcErr) throw new Error('non-creator RPC call should have failed');
    assertEquals(rpcErr.code, '42501');
  } finally {
    await teardownUsers([creator.userId, applicant.userId, stranger.userId]);
  }
});

Deno.test('accept_match_application: already-accepted request rejected', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const creator = await createTestUser({ email: `creator-mra-${s}@test.local`, genderCategory: 'erkek' });
  const applicantA = await createTestUser({ email: `applicant-mra-a-${s}@test.local`, genderCategory: 'erkek' });
  const applicantB = await createTestUser({ email: `applicant-mra-b-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const requestId = await seedOpenCall(creator.userId);
    const supa = adminClient();
    await supa.from('match_request_applications').insert([
      { request_id: requestId, applicant_id: applicantA.userId, note: 'A' },
      { request_id: requestId, applicant_id: applicantB.userId, note: 'B' },
    ]);

    const creatorSupa = jwtClient(creator.accessToken);
    const { error: firstErr } = await creatorSupa.rpc('accept_match_application', {
      p_request_id: requestId, p_applicant_user_id: applicantA.userId,
    });
    if (firstErr) throw new Error(`first accept failed: ${firstErr.message}`);

    const { error: secondErr } = await creatorSupa.rpc('accept_match_application', {
      p_request_id: requestId, p_applicant_user_id: applicantB.userId,
    });
    if (!secondErr) throw new Error('second accept on already-accepted request should have failed');
    assertEquals(secondErr.code, 'P0001');

    const { data: req } = await supa
      .from('match_requests').select('status, target_id').eq('id', requestId).single();
    assertEquals(req!.status, 'accepted');
    assertEquals(req!.target_id, applicantA.userId);
  } finally {
    await teardownUsers([creator.userId, applicantA.userId, applicantB.userId]);
  }
});

Deno.test('match_request_applications: applying to direct_challenge blocked by RLS', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const creator = await createTestUser({ email: `creator-mra-${s}@test.local`, genderCategory: 'erkek' });
  const target = await createTestUser({ email: `target-mra-${s}@test.local`, genderCategory: 'erkek' });
  const applicant = await createTestUser({ email: `applicant-mra-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const requestId = await seedDirectChallenge(creator.userId, target.userId);

    const { error: insertErr } = await jwtClient(applicant.accessToken)
      .from('match_request_applications')
      .insert({ request_id: requestId, applicant_id: applicant.userId, note: 'sneaky' });
    if (!insertErr) {
      throw new Error('insert against direct_challenge should have been blocked by RLS');
    }
  } finally {
    await teardownUsers([creator.userId, target.userId, applicant.userId]);
  }
});
