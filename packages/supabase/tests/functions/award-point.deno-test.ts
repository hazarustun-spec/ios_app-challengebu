import { assertEquals } from 'jsr:@std/assert';
import { createClient } from '@supabase/supabase-js';
import { adminClient, ANON_KEY, createTestUser, teardownUsers, SUPABASE_URL } from './helpers.ts';

// award_point() is a SECURITY DEFINER RPC gated on auth.uid() being a match
// participant, so it must be called with a participant's access token (not the
// service role). These tests pin the tennis deuce / advantage flow.

interface Score {
  games_a: number; games_b: number;
  points_a: number; points_b: number;
  phase: string; winner: string | null;
}

async function makeMatch(suffix: string): Promise<{
  matchId: string; aliceToken: string; aliceId: string; bobId: string;
}> {
  // Direct DB inserts — avoids edge-function chain failures under concurrent load.
  const alice = await createTestUser({ email: `alice-ap-${suffix}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-ap-${suffix}@test.local`, genderCategory: 'erkek' });
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

Deno.test('award_point: deuce → advantage → game progression (margin 2)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceToken, aliceId, bobId } = await makeMatch(s);
  const supa = userClient(aliceToken);
  try {
    const award = async (side: 'a' | 'b'): Promise<Score> => {
      const { data, error } = await supa.rpc('award_point', { p_match_id: matchId, p_side: side });
      if (error) throw new Error(`award_point(${side}): ${error.message}`);
      return data as Score;
    };

    await award('a'); await award('b'); await award('a'); await award('b'); await award('a');
    let s2 = await award('b'); // 3-3 deuce
    assertEquals([s2.points_a, s2.points_b], [3, 3]);
    assertEquals([s2.games_a, s2.games_b], [0, 0]);

    s2 = await award('a'); // 4-3 advantage A
    assertEquals([s2.points_a, s2.points_b], [4, 3]);
    assertEquals([s2.games_a, s2.games_b], [0, 0]);

    s2 = await award('b'); // back to deuce (3-3)
    assertEquals([s2.points_a, s2.points_b], [3, 3]);
    assertEquals([s2.games_a, s2.games_b], [0, 0]);

    s2 = await award('a'); // 4-3 again
    assertEquals([s2.points_a, s2.points_b], [4, 3]);

    s2 = await award('a'); // game won, margin 2
    assertEquals([s2.points_a, s2.points_b], [0, 0]);
    assertEquals([s2.games_a, s2.games_b], [1, 0]);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('award_point: 40-30 (3-2) +A wins the game (margin 2)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceToken, aliceId, bobId } = await makeMatch(s);
  const supa = userClient(aliceToken);
  try {
    const award = async (side: 'a' | 'b'): Promise<Score> => {
      const { data, error } = await supa.rpc('award_point', { p_match_id: matchId, p_side: side });
      if (error) throw new Error(`award_point(${side}): ${error.message}`);
      return data as Score;
    };

    await award('a'); await award('a'); await award('a'); await award('b');
    let s2 = await award('b'); // 3-2
    assertEquals([s2.points_a, s2.points_b], [3, 2]);

    s2 = await award('a'); // margin 2 → game won
    assertEquals([s2.points_a, s2.points_b], [0, 0]);
    assertEquals([s2.games_a, s2.games_b], [1, 0]);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('award_point: non-participant is rejected', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { matchId, aliceId, bobId } = await makeMatch(s);
  const carol = await createTestUser({ email: `carol-ap-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const supa = userClient(carol.accessToken);
    const { error } = await supa.rpc('award_point', { p_match_id: matchId, p_side: 'a' });
    assertEquals(error?.code, '42501');
  } finally {
    await teardownUsers([aliceId, bobId, carol.userId], { matchIds: [matchId] });
  }
});
