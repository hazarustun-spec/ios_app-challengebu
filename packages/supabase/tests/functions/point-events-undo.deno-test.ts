import { assertEquals } from 'jsr:@std/assert';
import { createClient } from '@supabase/supabase-js';
import { adminClient, ANON_KEY, createTestUser, teardownUsers, SUPABASE_URL } from './helpers.ts';

// Event-sourced scoring: award_point appends to point_events; undo_point flips the latest.

interface Score {
  games_a: number; games_b: number;
  points_a: number; points_b: number;
  phase: string; winner: string | null;
}

async function makeMatch(suffix: string): Promise<{
  matchId: string; aliceToken: string; bobToken: string; aliceId: string; bobId: string;
}> {
  // Direct DB inserts — avoids edge-function chain failures under concurrent load.
  const alice = await createTestUser({ email: `alice-peu-${suffix}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-peu-${suffix}@test.local`, genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  if (!court) throw new Error('No court found');

  const { data: req } = await supa.from('match_requests').insert({
    creator_id: alice.userId, target_id: bob.userId, type: 'direct_challenge',
    category: 'erkek_tek', format: 'bu_klasik', proposed_date: '2026-07-01',
    proposed_time: '19:00', court_id: court.id, status: 'accepted',
    expires_at: '2026-08-01T00:00:00Z',
  }).select('id').single();
  if (!req) throw new Error(`match_request insert failed (suffix ${suffix})`);

  const { data: m, error: matchErr } = await supa.from('matches').insert({
    match_request_id: req.id, category: 'erkek_tek', format: 'bu_klasik',
    court_id: court.id, played_at: '2026-07-01T19:00:00Z', is_rated: true,
    team_a_player_ids: [alice.userId], team_b_player_ids: [bob.userId],
  }).select('id').single();
  if (!m || matchErr) throw new Error(`match insert failed (suffix ${suffix}): ${matchErr?.message}`);

  return {
    matchId: m.id,
    aliceToken: alice.accessToken,
    bobToken: bob.accessToken,
    aliceId: alice.userId,
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
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceToken, aliceId, bobId } = await makeMatch(s);
  const award = awarder(aliceToken, matchId);
  const undo = undoer(aliceToken, matchId);
  try {
    await award('a'); await award('b');
    let score = await award('a'); // 2-1
    assertEquals([score.points_a, score.points_b], [2, 1]);

    score = await undo(); // back to 1-1
    assertEquals([score.points_a, score.points_b], [1, 1]);
    assertEquals([score.games_a, score.games_b], [0, 0]);
    assertEquals(score.phase, 'ongoing');
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('(b) undo a game-winning point reverts games + phase', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceToken, aliceId, bobId } = await makeMatch(s);
  const award = awarder(aliceToken, matchId);
  const undo = undoer(aliceToken, matchId);
  try {
    await award('a'); await award('a'); await award('a');
    let score = await award('a'); // game won
    assertEquals([score.games_a, score.games_b], [1, 0]);
    assertEquals([score.points_a, score.points_b], [0, 0]);

    score = await undo(); // back to 40-0
    assertEquals([score.games_a, score.games_b], [0, 0]);
    assertEquals([score.points_a, score.points_b], [3, 0]);
    assertEquals(score.phase, 'ongoing');
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('(b2) undo a match-ending point reverts finished → ongoing', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceToken, aliceId, bobId } = await makeMatch(s);
  const award = awarder(aliceToken, matchId);
  const undo = undoer(aliceToken, matchId);
  try {
    for (let g = 0; g < 4; g++) {
      for (let p = 0; p < 4; p++) await award('a');
    }
    const supa = userClient(aliceToken);
    const { data } = await supa.from('live_match_scores').select('*').eq('match_id', matchId).single();
    assertEquals((data as Score).phase, 'finished');
    assertEquals((data as Score).winner, 'a');
    assertEquals([(data as Score).games_a, (data as Score).games_b], [4, 0]);

    const score = await undo();
    assertEquals(score.phase, 'ongoing');
    assertEquals(score.winner, null);
    assertEquals([score.games_a, score.games_b], [3, 0]);
    assertEquals([score.points_a, score.points_b], [3, 0]);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('(c) dedupe: two award(a) from DIFFERENT users within 5s → ONE point', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceToken, bobToken, aliceId, bobId } = await makeMatch(s);
  try {
    const aliceAward = awarder(aliceToken, matchId);
    const bobAward = awarder(bobToken, matchId);

    await aliceAward('a'); // 1-0
    const score = await bobAward('a'); // same rally, within 5s → collapsed
    assertEquals([score.points_a, score.points_b], [1, 0]);

    const supa = adminClient();
    const { data } = await supa.from('point_events')
      .select('id').eq('match_id', matchId).eq('awarded', true);
    assertEquals((data ?? []).length, 1);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('(d) two award(a) from the SAME user → BOTH count (no dedupe)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceToken, aliceId, bobId } = await makeMatch(s);
  const award = awarder(aliceToken, matchId);
  try {
    await award('a'); // 1-0
    const score = await award('a'); // same user → not deduped → 2-0
    assertEquals([score.points_a, score.points_b], [2, 0]);

    const supa = adminClient();
    const { data } = await supa.from('point_events')
      .select('id').eq('match_id', matchId).eq('awarded', true);
    assertEquals((data ?? []).length, 2);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('(e) award on a finished match → no-op', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceToken, aliceId, bobId } = await makeMatch(s);
  const award = awarder(aliceToken, matchId);
  try {
    for (let g = 0; g < 4; g++) {
      for (let p = 0; p < 4; p++) await award('a');
    }
    const score = await award('b'); // no-op
    assertEquals(score.phase, 'finished');
    assertEquals(score.winner, 'a');
    assertEquals([score.games_a, score.games_b], [4, 0]);

    const supa = adminClient();
    const { data } = await supa.from('point_events')
      .select('id').eq('match_id', matchId).eq('awarded', true);
    assertEquals((data ?? []).length, 16); // no 17th event
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('(f) undo by a non-participant is rejected (42501)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceToken, aliceId, bobId } = await makeMatch(s);
  const carol = await createTestUser({ email: `carol-peu-${s}@test.local`, genderCategory: 'erkek' });
  try {
    await awarder(aliceToken, matchId)('a');
    const supa = userClient(carol.accessToken);
    const { error } = await supa.rpc('undo_point', { p_match_id: matchId });
    assertEquals(error?.code, '42501');
  } finally {
    await teardownUsers([aliceId, bobId, carol.userId], { matchIds: [matchId] });
  }
});
