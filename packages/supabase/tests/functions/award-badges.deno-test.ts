import { assertEquals } from 'jsr:@std/assert';
import {
  adminClient,
  createTestUser,
  invokeFunction,
  teardownUsers,
  SERVICE_ROLE_KEY,
} from './helpers.ts';

// award-badges is gated by requireInternalOrAdmin: an internal caller passes the
// SUPABASE_SERVICE_ROLE_KEY as the Bearer token (fast-path, no DB hit).

interface AwardedPerUser {
  userId: string;
  badges: { id: string; code: string }[];
}

async function insertMatch(opts: {
  teamA: string[];
  teamB: string[];
  status: 'awaiting_confirmation' | 'confirmed' | 'voided';
  winnerTeam?: 'a' | 'b' | 'void';
  isRated?: boolean;
  scoreA?: number;
  scoreB?: number;
}): Promise<string> {
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  if (!court) throw new Error('No courts seeded; run `supabase db reset`');

  const { data, error } = await supa
    .from('matches')
    .insert({
      category: 'erkek_tek', format: 'bu_klasik', court_id: court.id,
      played_at: '2026-06-01T19:00:00Z', is_rated: opts.isRated ?? true,
      team_a_player_ids: opts.teamA, team_b_player_ids: opts.teamB,
      score_team_a: opts.scoreA ?? 2, score_team_b: opts.scoreB ?? 1,
      winner_team: opts.winnerTeam ?? null, status: opts.status,
    })
    .select('id').single();
  if (error || !data) throw new Error(`insert match: ${error?.message}`);
  return data.id;
}

Deno.test('award-badges: non-admin player is forbidden (403)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-ab-${s}@test.local`, genderCategory: 'erkek' });
  try {
    const { status } = await invokeFunction(
      'award-badges',
      { matchId: '00000000-0000-0000-0000-000000000001' },
      alice.accessToken,
    );
    assertEquals(status, 403);
  } finally {
    await teardownUsers([alice.userId]);
  }
});

Deno.test('award-badges: invalid input → 400 (after internal auth passes)', async () => {
  const { status } = await invokeFunction('award-badges', { matchId: 'not-a-uuid' }, SERVICE_ROLE_KEY);
  assertEquals(status, 400);
});

Deno.test('award-badges: unknown match → 404', async () => {
  const { status } = await invokeFunction(
    'award-badges',
    { matchId: '00000000-0000-0000-0000-0000000000ff' },
    SERVICE_ROLE_KEY,
  );
  assertEquals(status, 404);
});

Deno.test('award-badges: non-confirmed match awards nothing', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-ab-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-ab-${s}@test.local`, genderCategory: 'erkek' });
  const matchId = await insertMatch({
    teamA: [alice.userId], teamB: [bob.userId],
    status: 'awaiting_confirmation', winnerTeam: 'a',
  });
  try {
    const { status, body } = await invokeFunction('award-badges', { matchId }, SERVICE_ROLE_KEY);
    assertEquals(status, 200);
    assertEquals((body as { awarded: AwardedPerUser[] }).awarded, []);
  } finally {
    await teardownUsers([alice.userId, bob.userId], { matchIds: [matchId] });
  }
});

Deno.test('award-badges: confirmed match awards milestone + win badges to a qualifying user', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-ab-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-ab-${s}@test.local`, genderCategory: 'erkek' });
  const matchId = await insertMatch({
    teamA: [alice.userId], teamB: [bob.userId],
    status: 'confirmed', winnerTeam: 'a', isRated: true, scoreA: 2, scoreB: 1,
  });
  try {
    const { status, body } = await invokeFunction('award-badges', { matchId }, SERVICE_ROLE_KEY);
    assertEquals(status, 200);
    const { awarded } = body as { awarded: AwardedPerUser[] };

    const aliceAward = awarded.find((a) => a.userId === alice.userId);
    if (!aliceAward) throw new Error('expected alice to be awarded badges');
    const aliceCodes = aliceAward.badges.map((b) => b.code);
    assertEquals(aliceCodes.includes('milestone_1_match'), true);
    assertEquals(aliceCodes.includes('wins_1'), true);

    const bobAward = awarded.find((a) => a.userId === bob.userId);
    if (!bobAward) throw new Error('expected bob to be awarded the milestone badge');
    const bobCodes = bobAward.badges.map((b) => b.code);
    assertEquals(bobCodes.includes('milestone_1_match'), true);
    assertEquals(bobCodes.includes('wins_1'), false);

    const supa = adminClient();
    const { count } = await supa
      .from('user_badges')
      .select('badge_id', { count: 'exact', head: true })
      .eq('profile_id', alice.userId);
    assertEquals((count ?? 0) >= 2, true);

    // Re-running is idempotent: nothing new is awarded
    const { body: body2 } = await invokeFunction('award-badges', { matchId }, SERVICE_ROLE_KEY);
    assertEquals((body2 as { awarded: AwardedPerUser[] }).awarded, []);
  } finally {
    await teardownUsers([alice.userId, bob.userId], { matchIds: [matchId] });
  }
});
