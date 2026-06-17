import { assertEquals } from 'jsr:@std/assert';
import {
  adminClient,
  cleanupTestData,
  createTestUser,
  invokeFunction,
} from './helpers.ts';

async function makeConversation(creatorId: string, targetId: string) {
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { data: req } = await supa
    .from('match_requests')
    .insert({
      creator_id: creatorId,
      target_id: targetId,
      type: 'direct_challenge',
      category: 'erkek_tek',
      format: 'bu_klasik',
      proposed_date: '2026-06-20',
      proposed_time: '18:30',
      court_id: court!.id,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    })
    .select('id')
    .single();
  const low = creatorId < targetId ? creatorId : targetId;
  const high = creatorId < targetId ? targetId : creatorId;
  const { data: conv } = await supa
    .from('conversations')
    .insert({ request_id: req!.id, participant_low: low, participant_high: high })
    .select('id')
    .single();
  return conv!.id as string;
}

Deno.test('send-message: delivers a message + creates a recipient notification', async () => {
  const a = await createTestUser({ email: 'sm-a@test.local' });
  const b = await createTestUser({ email: 'sm-b@test.local' });
  const convId = await makeConversation(a.userId, b.userId);

  const res = await invokeFunction(
    'send-message',
    { conversationId: convId, body: 'Kort 2 uygun mu?' },
    a.accessToken,
  );
  assertEquals(res.status, 200);

  const supa = adminClient();
  const { data: msgs } = await supa
    .from('messages')
    .select('id, body, sender_id')
    .eq('conversation_id', convId);
  assertEquals((msgs ?? []).length, 1);
  assertEquals(msgs![0].sender_id, a.userId);

  const { data: notifs } = await supa
    .from('notifications')
    .select('id, category')
    .eq('recipient_id', b.userId)
    .eq('category', 'message_received');
  assertEquals((notifs ?? []).length, 1);

  await cleanupTestData();
});

Deno.test('send-message: a non-participant is rejected', async () => {
  const a = await createTestUser({ email: 'sm-x@test.local' });
  const b = await createTestUser({ email: 'sm-y@test.local' });
  const c = await createTestUser({ email: 'sm-z@test.local' });
  const convId = await makeConversation(a.userId, b.userId);

  const res = await invokeFunction(
    'send-message',
    { conversationId: convId, body: 'sızıntı' },
    c.accessToken,
  );
  assertEquals(res.status, 403);

  await cleanupTestData();
});
