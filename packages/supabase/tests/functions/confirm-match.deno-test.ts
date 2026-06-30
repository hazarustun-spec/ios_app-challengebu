import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

async function playedMatch(suffix: string): Promise<{
  aliceToken: string; bobToken: string; matchId: string; aliceId: string; bobId: string;
}> {
  const alice = await createTestUser({ email: `alice-cm-${suffix}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-cm-${suffix}@test.local`, genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  const { body: req } = await invokeFunction('create-match-request', {
    type: 'direct_challenge', targetId: bob.userId, category: 'erkek_tek',
    format: 'bu_klasik', isRated: true, proposedDate: '2026-07-01',
    proposedTime: '19:00', courtId: court!.id,
  }, alice.accessToken);
  const { body: acc } = await invokeFunction('accept-match-request', {
    requestId: (req as { id: string }).id,
  }, bob.accessToken);
  const matchId = (acc as { matchId: string }).matchId;

  const score = {
    matchId,
    scoreTeamA: 4, scoreTeamB: 2, winnerTeam: 'a' as const,
    els: [
      { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'b' },
      { el: 4, winner: 'b' }, { el: 5, winner: 'a' }, { el: 6, winner: 'a' },
    ],
  };
  await invokeFunction('submit-match-score', score, alice.accessToken);
  await invokeFunction('submit-match-score', score, bob.accessToken);

  return {
    aliceToken: alice.accessToken,
    bobToken: bob.accessToken,
    matchId,
    aliceId: alice.userId,
    bobId: bob.userId,
  };
}

Deno.test('confirm-match: both confirm → ELO applied', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const { aliceToken, bobToken, matchId, aliceId, bobId } = await playedMatch(s);
  try {
    const r1 = await invokeFunction('confirm-match', { matchId }, aliceToken);
    assertEquals(r1.status, 200);
    assertEquals((r1.body as { confirmed: boolean }).confirmed, false);

    const r2 = await invokeFunction('confirm-match', { matchId }, bobToken);
    assertEquals(r2.status, 200);
    assertEquals((r2.body as { confirmed: boolean }).confirmed, true);

    const supa = adminClient();
    const { data: m } = await supa.from('matches').select('*').eq('id', matchId).single();
    assertEquals(m!.status, 'confirmed');

    const { data: aliceRating } = await supa
      .from('elo_ratings').select('rating').eq('profile_id', aliceId).eq('category', 'erkek_tek').single();
    const { data: bobRating } = await supa
      .from('elo_ratings').select('rating').eq('profile_id', bobId).eq('category', 'erkek_tek').single();

    if (!aliceRating || !bobRating) throw new Error('ratings missing');
    if (aliceRating.rating <= 1200) throw new Error(`alice rating ${aliceRating.rating} should be > 1200`);
    if (bobRating.rating >= 1200) throw new Error(`bob rating ${bobRating.rating} should be < 1200`);
    assertEquals(aliceRating.rating - 1200, 1200 - bobRating.rating);

    if (m!.rating_before_team_a !== 1200) throw new Error(`rating_before_team_a should be 1200, got ${m!.rating_before_team_a}`);
    if (m!.rating_before_team_b !== 1200) throw new Error(`rating_before_team_b should be 1200, got ${m!.rating_before_team_b}`);
    if (m!.rating_after_team_a !== aliceRating!.rating) throw new Error(`rating_after_team_a mismatch`);
    if (m!.rating_after_team_b !== bobRating!.rating) throw new Error(`rating_after_team_b mismatch`);
  } finally {
    await teardownUsers([aliceId, bobId], { matchIds: [matchId] });
  }
});

Deno.test('confirm-match: unrated match → status confirmed, no ELO change', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-cm-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-cm-${s}@test.local`, genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  let matchId = '';
  try {
    const { body: req } = await invokeFunction('create-match-request', {
      type: 'direct_challenge', targetId: bob.userId, category: 'erkek_tek',
      format: 'bu_klasik', isRated: false, proposedDate: '2026-07-01',
      proposedTime: '19:00', courtId: court!.id,
    }, alice.accessToken);
    const { body: acc } = await invokeFunction('accept-match-request', {
      requestId: (req as { id: string }).id,
    }, bob.accessToken);
    matchId = (acc as { matchId: string }).matchId;

    const score = {
      matchId, scoreTeamA: 4, scoreTeamB: 0, winnerTeam: 'a' as const,
      els: [
        { el: 1, winner: 'a' }, { el: 2, winner: 'a' }, { el: 3, winner: 'a' }, { el: 4, winner: 'a' },
      ],
    };
    await invokeFunction('submit-match-score', score, alice.accessToken);
    await invokeFunction('submit-match-score', score, bob.accessToken);
    await invokeFunction('confirm-match', { matchId }, alice.accessToken);
    await invokeFunction('confirm-match', { matchId }, bob.accessToken);

    const { data: m } = await supa.from('matches').select('status').eq('id', matchId).single();
    assertEquals(m!.status, 'confirmed');

    // Only these two users' elo_ratings should exist; both must remain at 1200.
    const { data: r } = await supa
      .from('elo_ratings')
      .select('rating')
      .in('profile_id', [alice.userId, bob.userId])
      .eq('category', 'erkek_tek');
    for (const row of r ?? []) {
      assertEquals(row.rating, 1200);
    }
  } finally {
    await teardownUsers(
      [alice.userId, bob.userId],
      { matchIds: matchId ? [matchId] : [] },
    );
  }
});
