import { assertEquals } from 'jsr:@std/assert';
import { createClient } from '@supabase/supabase-js';
import { adminClient, ANON_KEY, cleanupTestData, createTestUser, invokeFunction, SUPABASE_URL } from './helpers.ts';

// Event-sourced scoring (20260627000001): award_point appends to point_events
// and recompute_live_score replays the awarded log; undo_point flips the latest
// awarded event and recomputes. These tests exercise undo + the same-rally
// dedupe window, alongside the participant guard and finished-match no-op.

interface Score {
  games_a: number; games_b: number;
  points_a: number; points_b: number;
  phase: string; winner: string | null;
}

/** Create an accepted match between alice & bob; return ids + both tokens. */
async function makeMatch(): Promise<{ matchId: string; aliceToken: string; bobToken: string; bobId: string }> {
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
    bobToken: bob.accessToken,
    bobId: bob.userId,
  };
}

function userClient(accessToken: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function awarder(token: string, matchId: string) {
  const supa = userClient(token);
  return async (side: 'a' | 'b'): Promise<Score> => {
    const { data, error } = await supa.rpc('award_point', { p_match_id: matchId, p_side: side });
    if (error) throw new Error(`award_point(${side}): ${error.message}`);
    return data as Score;
  };
}

function undoer(token: string, matchId: string) {
  const supa = userClient(token);
  return async (): Promise<Score> => {
    const { data, error } = await supa.rpc('undo_point', { p_match_id: matchId });
    if (error) throw new Error(`undo_point: ${error.message}`);
    return data as Score;
  };
}

Deno.test('(a) award then undo returns to the prior score', async () => {
  await cleanupTestData();
  const { matchId, aliceToken } = await makeMatch();
  const award = awarder(aliceToken, matchId);
  const undo = undoer(aliceToken, matchId);

  await award('a'); // 1-0
  await award('b'); // 1-1
  let s = await award('a'); // 2-1
  assertEquals([s.points_a, s.points_b], [2, 1]);

  s = await undo(); // back to 1-1
  assertEquals([s.points_a, s.points_b], [1, 1]);
  assertEquals([s.games_a, s.games_b], [0, 0]);
  assertEquals(s.phase, 'ongoing');
});

Deno.test('(b) undo a game-winning point reverts games + phase', async () => {
  await cleanupTestData();
  const { matchId, aliceToken } = await makeMatch();
  const award = awarder(aliceToken, matchId);
  const undo = undoer(aliceToken, matchId);

  // Win one game for A: 4 straight points → games_a=1, points reset.
  await award('a'); await award('a'); await award('a');
  let s = await award('a'); // game won
  assertEquals([s.games_a, s.games_b], [1, 0]);
  assertEquals([s.points_a, s.points_b], [0, 0]);

  // Undo the game-winning point: back to 40-0 (3-0), games_a=0.
  s = await undo();
  assertEquals([s.games_a, s.games_b], [0, 0]);
  assertEquals([s.points_a, s.points_b], [3, 0]);
  assertEquals(s.phase, 'ongoing');
});

Deno.test('(b2) undo a match-ending point reverts finished → ongoing', async () => {
  await cleanupTestData();
  const { matchId, aliceToken } = await makeMatch();
  const award = awarder(aliceToken, matchId);
  const undo = undoer(aliceToken, matchId);

  // Win 4 games (4 points each) for A → phase finished, winner a.
  for (let g = 0; g < 4; g++) {
    for (let p = 0; p < 4; p++) await award('a');
  }
  const supa = userClient(aliceToken);
  let { data } = await supa.from('live_match_scores').select('*').eq('match_id', matchId).single();
  assertEquals((data as Score).phase, 'finished');
  assertEquals((data as Score).winner, 'a');
  assertEquals([(data as Score).games_a, (data as Score).games_b], [4, 0]);

  // Undo the match-point: finished → ongoing, games_a back to 3, 40-0.
  const s = await undo();
  assertEquals(s.phase, 'ongoing');
  assertEquals(s.winner, null);
  assertEquals([s.games_a, s.games_b], [3, 0]);
  assertEquals([s.points_a, s.points_b], [3, 0]);
});

Deno.test('(c) dedupe: two award(a) from DIFFERENT users within 5s → ONE point', async () => {
  await cleanupTestData();
  const { matchId, aliceToken, bobToken } = await makeMatch();
  const aliceAward = awarder(aliceToken, matchId);
  const bobAward = awarder(bobToken, matchId);

  await aliceAward('a'); // 1-0
  const s = await bobAward('a'); // same rally, other user, within 5s → collapsed
  assertEquals([s.points_a, s.points_b], [1, 0]);

  // Confirm exactly one awarded event exists.
  const supa = adminClient();
  const { data } = await supa.from('point_events')
    .select('id').eq('match_id', matchId).eq('awarded', true);
  assertEquals((data ?? []).length, 1);
});

Deno.test('(d) two award(a) from the SAME user → BOTH count (no dedupe)', async () => {
  await cleanupTestData();
  const { matchId, aliceToken } = await makeMatch();
  const award = awarder(aliceToken, matchId);

  await award('a'); // 1-0
  const s = await award('a'); // same user → not deduped → 2-0
  assertEquals([s.points_a, s.points_b], [2, 0]);

  const supa = adminClient();
  const { data } = await supa.from('point_events')
    .select('id').eq('match_id', matchId).eq('awarded', true);
  assertEquals((data ?? []).length, 2);
});

Deno.test('(e) award on a finished match → no-op', async () => {
  await cleanupTestData();
  const { matchId, aliceToken } = await makeMatch();
  const award = awarder(aliceToken, matchId);

  for (let g = 0; g < 4; g++) {
    for (let p = 0; p < 4; p++) await award('a');
  }
  // Match finished; another award is a no-op (returns finished row unchanged).
  const s = await award('b');
  assertEquals(s.phase, 'finished');
  assertEquals(s.winner, 'a');
  assertEquals([s.games_a, s.games_b], [4, 0]);

  const supa = adminClient();
  const { data } = await supa.from('point_events')
    .select('id').eq('match_id', matchId).eq('awarded', true);
  assertEquals((data ?? []).length, 16); // no 17th event inserted
});

Deno.test('(f) undo by a non-participant is rejected (42501)', async () => {
  await cleanupTestData();
  const { matchId, aliceToken } = await makeMatch();
  await awarder(aliceToken, matchId)('a');

  const stranger = await createTestUser({ email: 'carol@test.local', genderCategory: 'erkek' });
  const supa = userClient(stranger.accessToken);
  const { error } = await supa.rpc('undo_point', { p_match_id: matchId });
  assertEquals(error?.code, '42501');
});
