import { assertEquals } from 'jsr:@std/assert';
import { createClient } from '@supabase/supabase-js';
import { adminClient, ANON_KEY, cleanupTestData, createTestUser, invokeFunction, SUPABASE_URL } from './helpers.ts';

// award_point() is a SECURITY DEFINER RPC gated on auth.uid() being a match
// participant, so it must be called with a participant's access token (not the
// service role). These tests pin the tennis deuce / advantage flow restored by
// 20260626000009_award_point_advantage.sql (win margin >= 2).

interface Score {
  games_a: number; games_b: number;
  points_a: number; points_b: number;
  phase: string; winner: string | null;
}

/** Create an accepted match between alice & bob; return ids + alice's token. */
async function makeMatch(): Promise<{ matchId: string; aliceToken: string; bobId: string }> {
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
  return {
    matchId: (acc as { matchId: string }).matchId,
    aliceToken: alice.accessToken,
    bobId: bob.userId,
  };
}

function userClient(accessToken: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.test('award_point: deuce → advantage → game progression (margin 2)', async () => {
  await cleanupTestData();
  const { matchId, aliceToken } = await makeMatch();
  const supa = userClient(aliceToken);

  const award = async (side: 'a' | 'b'): Promise<Score> => {
    const { data, error } = await supa.rpc('award_point', { p_match_id: matchId, p_side: side });
    if (error) throw new Error(`award_point(${side}): ${error.message}`);
    return data as Score;
  };

  // Drive points to 3-3 (40-40 / deuce): a,b,a,b,a,b.
  await award('a'); // 1-0
  await award('b'); // 1-1
  await award('a'); // 2-1
  await award('b'); // 2-2
  await award('a'); // 3-2
  let s = await award('b'); // 3-3 (deuce)
  assertEquals([s.points_a, s.points_b], [3, 3]);
  assertEquals([s.games_a, s.games_b], [0, 0]);

  // 3-3 +A → 4-3 (Advantage A), NOT a game win.
  s = await award('a');
  assertEquals([s.points_a, s.points_b], [4, 3]);
  assertEquals([s.games_a, s.games_b], [0, 0]);

  // 4-3 +B → aw=4,ot=4 → deuce branch → reset 3-3 (advantage lost).
  s = await award('b');
  assertEquals([s.points_a, s.points_b], [3, 3]);
  assertEquals([s.games_a, s.games_b], [0, 0]);

  // 3-3 +A → 4-3 again (Advantage A).
  s = await award('a');
  assertEquals([s.points_a, s.points_b], [4, 3]);

  // 4-3 +A → margin 2 → game won, points reset to 0-0, games_a +1.
  s = await award('a');
  assertEquals([s.points_a, s.points_b], [0, 0]);
  assertEquals([s.games_a, s.games_b], [1, 0]);
});

Deno.test('award_point: 40-30 (3-2) +A wins the game (margin 2)', async () => {
  await cleanupTestData();
  const { matchId, aliceToken } = await makeMatch();
  const supa = userClient(aliceToken);

  const award = async (side: 'a' | 'b'): Promise<Score> => {
    const { data, error } = await supa.rpc('award_point', { p_match_id: matchId, p_side: side });
    if (error) throw new Error(`award_point(${side}): ${error.message}`);
    return data as Score;
  };

  // 40-30 = points 3-2.
  await award('a'); // 1-0
  await award('a'); // 2-0
  await award('a'); // 3-0
  await award('b'); // 3-1
  let s = await award('b'); // 3-2
  assertEquals([s.points_a, s.points_b], [3, 2]);

  // +A → aw=4,ot=2 → margin 2 → game won.
  s = await award('a');
  assertEquals([s.points_a, s.points_b], [0, 0]);
  assertEquals([s.games_a, s.games_b], [1, 0]);
});

Deno.test('award_point: non-participant is rejected', async () => {
  await cleanupTestData();
  const { matchId } = await makeMatch();
  const stranger = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });
  const supa = userClient(stranger.accessToken);

  const { error } = await supa.rpc('award_point', { p_match_id: matchId, p_side: 'a' });
  assertEquals(error?.code, '42501');
});
