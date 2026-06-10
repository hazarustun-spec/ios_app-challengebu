import { assertEquals } from 'jsr:@std/assert';
import { adminClient, cleanupTestData, createTestUser, invokeFunction } from '../functions/helpers.ts';

/**
 * Plan 8 Task A1 — match_kind enum + ELO guard.
 *
 * Verifies that:
 *  - `kind = 'friendly'` matches do NOT change ELO when confirmed.
 *  - `kind = 'ranking'` matches DO change ELO when confirmed (default behaviour).
 *
 * ELO is applied by the Edge Function `confirm-match` via `_shared/apply-elo.ts`,
 * not by a DB trigger — so the guard lives in that shared helper. The test
 * exercises the full Edge Function path.
 */

async function defaultCourtId(): Promise<string> {
  const supa = adminClient();
  const { data: court } = await supa.from('courts').select('id').limit(1).single();
  if (!court) throw new Error('No court seeded; run `supabase db reset`');
  return court.id as string;
}

async function getRating(profileId: string, category: string): Promise<number> {
  const supa = adminClient();
  const { data } = await supa
    .from('elo_ratings')
    .select('rating')
    .eq('profile_id', profileId)
    .eq('category', category)
    .maybeSingle();
  // Default rating for unrated players is 1200 (no row inserted yet).
  return data?.rating ?? 1200;
}

async function seedAwaitingMatch(opts: {
  aliceId: string;
  bobId: string;
  kind: 'ranking' | 'friendly';
  preConfirmedBy: string[];
}): Promise<string> {
  const supa = adminClient();
  const courtId = await defaultCourtId();
  const { data: match, error } = await supa
    .from('matches')
    .insert({
      category: 'erkek_tek',
      format: 'bu_klasik',
      court_id: courtId,
      played_at: new Date().toISOString(),
      is_rated: true,
      kind: opts.kind,
      team_a_player_ids: [opts.aliceId],
      team_b_player_ids: [opts.bobId],
      score_team_a: 4,
      score_team_b: 2,
      winner_team: 'a',
      status: 'awaiting_confirmation',
      confirmed_by: opts.preConfirmedBy,
    })
    .select('id')
    .single();
  if (error || !match) throw new Error(`seedAwaitingMatch: ${error?.message}`);
  return match.id as string;
}

Deno.test("match_kind 'friendly' → ELO unchanged after confirmation", async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice-friendly@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob-friendly@test.local', genderCategory: 'erkek' });

  const aliceBefore = await getRating(alice.userId, 'erkek_tek');
  const bobBefore = await getRating(bob.userId, 'erkek_tek');
  assertEquals(aliceBefore, 1200);
  assertEquals(bobBefore, 1200);

  const matchId = await seedAwaitingMatch({
    aliceId: alice.userId,
    bobId: bob.userId,
    kind: 'friendly',
    preConfirmedBy: [bob.userId], // bob already confirmed; alice's confirm completes it
  });

  const res = await invokeFunction('confirm-match', { matchId }, alice.accessToken);
  assertEquals(res.status, 200);
  assertEquals((res.body as { confirmed: boolean }).confirmed, true);

  // Verify match did reach `confirmed` status (guard must not change status flow).
  const supa = adminClient();
  const { data: m } = await supa.from('matches').select('status, kind').eq('id', matchId).single();
  assertEquals(m!.status, 'confirmed');
  assertEquals(m!.kind, 'friendly');

  // The key assertion: no ELO movement for friendly matches.
  const aliceAfter = await getRating(alice.userId, 'erkek_tek');
  const bobAfter = await getRating(bob.userId, 'erkek_tek');
  assertEquals(aliceAfter, 1200, `alice rating should remain 1200, got ${aliceAfter}`);
  assertEquals(bobAfter, 1200, `bob rating should remain 1200, got ${bobAfter}`);

  await cleanupTestData();
});

Deno.test("match_kind 'ranking' → ELO updates after confirmation", async () => {
  await cleanupTestData();
  const alice = await createTestUser({ email: 'alice-ranking@test.local', genderCategory: 'erkek' });
  const bob = await createTestUser({ email: 'bob-ranking@test.local', genderCategory: 'erkek' });

  const matchId = await seedAwaitingMatch({
    aliceId: alice.userId,
    bobId: bob.userId,
    kind: 'ranking',
    preConfirmedBy: [bob.userId],
  });

  const res = await invokeFunction('confirm-match', { matchId }, alice.accessToken);
  assertEquals(res.status, 200);
  assertEquals((res.body as { confirmed: boolean }).confirmed, true);

  const aliceAfter = await getRating(alice.userId, 'erkek_tek');
  const bobAfter = await getRating(bob.userId, 'erkek_tek');
  if (!(aliceAfter > 1200)) {
    throw new Error(`alice rating ${aliceAfter} should be > 1200 for a ranking match win`);
  }
  if (!(bobAfter < 1200)) {
    throw new Error(`bob rating ${bobAfter} should be < 1200 for a ranking match loss`);
  }
  // Zero-sum sanity check (mirrors confirm-match.deno-test.ts).
  assertEquals(aliceAfter - 1200, 1200 - bobAfter);

  await cleanupTestData();
});
