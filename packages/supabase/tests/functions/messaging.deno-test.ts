import { assertEquals, assertExists } from 'jsr:@std/assert';
import { createClient } from '@supabase/supabase-js';
import { ANON_KEY, SUPABASE_URL, adminClient, createTestUser, teardownUsers } from './helpers.ts';

function userClient(accessToken: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function makeRequest(creatorId: string, targetId: string): Promise<string> {
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { data: req, error } = await supa
    .from('match_requests')
    .insert({
      creator_id: creatorId, target_id: targetId,
      type: 'direct_challenge', category: 'erkek_tek', format: 'bu_klasik',
      proposed_date: '2026-06-20', proposed_time: '18:30',
      court_id: court!.id,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    })
    .select('id').single();
  if (error) throw error;
  return req!.id as string;
}

function pair(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

Deno.test('messaging: participants can read/write under RLS, outsiders cannot', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const a = await createTestUser({ email: `msg-a-${s}@test.local` });
  const b = await createTestUser({ email: `msg-b-${s}@test.local` });
  const c = await createTestUser({ email: `msg-c-${s}@test.local` });
  try {
    const reqId = await makeRequest(a.userId, b.userId);
    const { low, high } = pair(a.userId, b.userId);

    const ca = userClient(a.accessToken);
    const cc = userClient(c.accessToken);

    const { data: conv, error: convErr } = await ca
      .from('conversations')
      .insert({ request_id: reqId, participant_low: low, participant_high: high })
      .select('id').single();
    assertEquals(convErr, null);
    assertExists(conv);
    const convId = conv!.id as string;

    const { error: sendErr } = await ca
      .from('messages')
      .insert({ conversation_id: convId, sender_id: a.userId, body: 'Kort 1 olur mu?' });
    assertEquals(sendErr, null);

    // C (outsider) cannot read the conversation's messages.
    const { data: cMsgs } = await cc.from('messages').select('id').eq('conversation_id', convId);
    assertEquals((cMsgs ?? []).length, 0);

    // C cannot send into the conversation.
    const { error: cSendErr } = await cc
      .from('messages')
      .insert({ conversation_id: convId, sender_id: c.userId, body: 'sızıntı' });
    assertExists(cSendErr);

    // Body length guard (admin insert hits the CHECK constraint).
    const { error: tooLong } = await adminClient()
      .from('messages')
      .insert({ conversation_id: convId, sender_id: a.userId, body: 'x'.repeat(1001) });
    assertExists(tooLong);
  } finally {
    await teardownUsers([a.userId, b.userId, c.userId]);
  }
});

Deno.test('messaging: get_or_create_conversation is idempotent + mark_read works', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const a = await createTestUser({ email: `rpc-a-${s}@test.local` });
  const b = await createTestUser({ email: `rpc-b-${s}@test.local` });
  try {
    const reqId = await makeRequest(a.userId, b.userId);
    const ca = userClient(a.accessToken);
    const cb = userClient(b.accessToken);

    const c1 = await ca.rpc('get_or_create_conversation', {
      p_request_id: reqId, p_other_user_id: b.userId,
    });
    const c2 = await ca.rpc('get_or_create_conversation', {
      p_request_id: reqId, p_other_user_id: b.userId,
    });
    assertEquals(c1.error, null);
    assertEquals(c1.data, c2.data); // same conversation id

    await ca.from('messages').insert({ conversation_id: c1.data, sender_id: a.userId, body: 'selam' });
    const before = await cb.rpc('unread_message_count');
    assertEquals(before.data, 1);
    const read = await cb.rpc('mark_conversation_read', { p_conversation_id: c1.data });
    assertEquals(read.error, null);
    const after = await cb.rpc('unread_message_count');
    assertEquals(after.data, 0);
  } finally {
    await teardownUsers([a.userId, b.userId]);
  }
});

Deno.test('messaging: a block prevents sending', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const a = await createTestUser({ email: `blk-a-${s}@test.local` });
  const b = await createTestUser({ email: `blk-b-${s}@test.local` });
  try {
    const reqId = await makeRequest(a.userId, b.userId);
    const { low, high } = pair(a.userId, b.userId);
    const ca = userClient(a.accessToken);
    const cb = userClient(b.accessToken);

    const { data: conv } = await ca
      .from('conversations')
      .insert({ request_id: reqId, participant_low: low, participant_high: high })
      .select('id').single();
    const convId = conv!.id as string;

    await cb.from('user_blocks').insert({ blocker_id: b.userId, blocked_id: a.userId });

    const { error: blockedSend } = await ca
      .from('messages')
      .insert({ conversation_id: convId, sender_id: a.userId, body: 'merhaba?' });
    assertExists(blockedSend);
  } finally {
    await teardownUsers([a.userId, b.userId]);
  }
});
