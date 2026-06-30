import { assertEquals } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

Deno.test('E2E: full direct challenge → ELO applied', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const alice = await createTestUser({ email: `alice-e2e-${s}@test.local`, genderCategory: 'erkek' });
  const bob = await createTestUser({ email: `bob-e2e-${s}@test.local`, genderCategory: 'erkek' });
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();

  let matchId = '';
  try {
    // 1. Create
    const { body: created } = await invokeFunction('create-match-request', {
      type: 'direct_challenge', targetId: bob.userId, category: 'erkek_tek',
      format: 'bu_klasik', isRated: true, proposedDate: '2026-07-01',
      proposedTime: '19:00', courtId: court!.id,
    }, alice.accessToken);
    const requestId = (created as { id: string }).id;

    // 2. Accept
    const { body: accepted } = await invokeFunction('accept-match-request', { requestId }, bob.accessToken);
    matchId = (accepted as { matchId: string }).matchId;

    // 3. Submit scores (both matching)
    const score = {
      matchId, scoreTeamA: 4, scoreTeamB: 0, winnerTeam: 'a' as const,
      els: [
        { el: 1, winner: 'a' }, { el: 2, winner: 'a' },
        { el: 3, winner: 'a' }, { el: 4, winner: 'a' },
      ],
    };
    const s1 = await invokeFunction('submit-match-score', score, alice.accessToken);
    assertEquals((s1.body as { matched: boolean }).matched, false);
    const s2 = await invokeFunction('submit-match-score', score, bob.accessToken);
    assertEquals((s2.body as { matched: boolean }).matched, true);

    // 4. Confirm
    const c1 = await invokeFunction('confirm-match', { matchId }, alice.accessToken);
    assertEquals((c1.body as { confirmed: boolean }).confirmed, false);
    const c2 = await invokeFunction('confirm-match', { matchId }, bob.accessToken);
    assertEquals((c2.body as { confirmed: boolean }).confirmed, true);

    // 5. Verify state
    const { data: match } = await supa.from('matches').select('*').eq('id', matchId).single();
    assertEquals(match!.status, 'confirmed');
    if (!match!.rating_after_team_a || !match!.rating_before_team_a) {
      throw new Error('rating snapshots should be set');
    }
    if (match!.rating_after_team_a <= match!.rating_before_team_a) {
      throw new Error('alice rating_after_team_a should be > rating_before_team_a');
    }

    const { data: aliceRating } = await supa
      .from('elo_ratings')
      .select('rating, matches_played')
      .eq('profile_id', alice.userId)
      .eq('category', 'erkek_tek')
      .single();
    assertEquals(aliceRating!.matches_played, 1);
    if (aliceRating!.rating <= 1200) throw new Error(`alice rating ${aliceRating!.rating} should be > 1200 (bagel win)`);
  } finally {
    await teardownUsers(
      [alice.userId, bob.userId],
      { matchIds: matchId ? [matchId] : [] },
    );
  }
});
