import { assert, assertEquals, assertExists } from 'jsr:@std/assert';
import { adminClient, createTestUser, invokeFunction, teardownUsers } from './helpers.ts';

// admin-record-match is how a match that could not be settled in the app gets
// recorded — the first real one was played on the build whose score screen
// mirrored the two players' perspectives. The database drives it through
// pg_net with INTERNAL_PUSH_KEY as the Bearer, the same way the push triggers
// call dispatch-push. That path failed twice in production before this test
// existed: once at the API gateway (JWT verification on, and the key is not a
// JWT), once in the function (it compared against SUPABASE_SERVICE_ROLE_KEY,
// which under the new API-key system is a different string).
//
// functions/.env.test sets INTERNAL_PUSH_KEY, and CI serves the functions with
// that file, so this exercises exactly the key the triggers send.
const INTERNAL_KEY = 'test-internal-key';

async function fixture(s: string) {
  const winner = await createTestUser({
    email: `arm-w-${s}@test.local`,
    genderCategory: 'erkek',
  });
  const loser = await createTestUser({
    email: `arm-l-${s}@test.local`,
    genderCategory: 'erkek',
  });
  const { data: court } = await adminClient().from('courts').select('id').limit(1).single();
  if (!court) throw new Error('No court found');
  return { winner, loser, courtId: court.id as string };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

function payload(f: Fixture, overrides: Record<string, unknown> = {}) {
  return {
    teamAPlayerIds: [f.winner.userId],
    teamBPlayerIds: [f.loser.userId],
    category: 'erkek_tek',
    format: 'pro_set_8',
    scoreTeamA: 8,
    scoreTeamB: 4,
    courtId: f.courtId,
    isRated: true,
    ...overrides,
  };
}

Deno.test('admin-record-match: internal key records a confirmed match and applies ELO', async () => {
  const f = await fixture(crypto.randomUUID().slice(0, 8));
  let matchId: string | undefined;
  try {
    const { status, body } = await invokeFunction('admin-record-match', payload(f), INTERNAL_KEY);
    assertEquals(status, 200, `unexpected response: ${JSON.stringify(body)}`);
    matchId = (body as { matchId: string }).matchId;
    assertExists(matchId);

    const supa = adminClient();
    const { data: m } = await supa.from('matches').select('*').eq('id', matchId).single();
    assertExists(m);
    assertEquals(m.status, 'confirmed');
    assertEquals(m.winner_team, 'a');
    assertEquals([m.score_team_a, m.score_team_b], [8, 4]);
    // The whole point of going through applyEloForMatch: ratings moved, and in
    // the right direction.
    assertExists(m.rating_after_team_a, 'ELO was not applied (team A)');
    assertExists(m.rating_after_team_b, 'ELO was not applied (team B)');
    assert(m.rating_after_team_a > m.rating_before_team_a, 'winner rating did not rise');
    assert(m.rating_after_team_b < m.rating_before_team_b, 'loser rating did not fall');

    // An internal call has no person behind it; the audit row must say so
    // rather than invent one.
    const { data: audit } = await supa
      .from('audit_log')
      .select('actor_id, details')
      .eq('action', 'admin_record_match')
      .eq('entity_id', matchId)
      .single();
    assertExists(audit);
    assertEquals(audit.actor_id, null);
    assertEquals((audit.details as { via: string }).via, 'internal');
  } finally {
    await teardownUsers([f.winner.userId, f.loser.userId], {
      matchIds: matchId ? [matchId] : [],
    });
  }
});

Deno.test('admin-record-match: a wrong key is rejected by the function itself', async () => {
  const f = await fixture(crypto.randomUUID().slice(0, 8));
  try {
    const { status } = await invokeFunction('admin-record-match', payload(f), 'not-the-key');
    assertEquals(status, 401);
  } finally {
    await teardownUsers([f.winner.userId, f.loser.userId]);
  }
});

Deno.test('admin-record-match: a signed-in player who is not an admin is refused', async () => {
  const f = await fixture(crypto.randomUUID().slice(0, 8));
  try {
    const { status } = await invokeFunction('admin-record-match', payload(f), f.loser.accessToken);
    assertEquals(status, 403);
  } finally {
    await teardownUsers([f.winner.userId, f.loser.userId]);
  }
});

Deno.test('admin-record-match: level scores are refused — a recorded match needs a winner', async () => {
  const f = await fixture(crypto.randomUUID().slice(0, 8));
  try {
    const { status } = await invokeFunction(
      'admin-record-match',
      payload(f, { scoreTeamA: 4, scoreTeamB: 4 }),
      INTERNAL_KEY,
    );
    assertEquals(status, 400);
  } finally {
    await teardownUsers([f.winner.userId, f.loser.userId]);
  }
});

// ── RESCORE: settle an existing match that never had ELO applied ───────────
//
// This is the path for a match that was played through the app but got stuck —
// the first real one was voided after the score screen mirrored the two
// players' perspectives. Category, format and teams must come from the match's
// own row. Doing it with CREATE instead is how a correction once landed on the
// wrong opponent and in the wrong category.

async function voidedMatch(f: Fixture, teamA: string, teamB: string): Promise<string> {
  const { data, error } = await adminClient()
    .from('matches')
    .insert({
      category: 'erkek_tek',
      format: 'pro_set_8',
      court_id: f.courtId,
      played_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      team_a_player_ids: [teamA],
      team_b_player_ids: [teamB],
      score_team_a: 0,
      score_team_b: 0,
      winner_team: 'void',
      status: 'voided',
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`voided match insert failed: ${error?.message}`);
  return data.id as string;
}

Deno.test('admin-record-match: RESCORE settles a voided match and applies ELO', async () => {
  const f = await fixture(crypto.randomUUID().slice(0, 8));
  // Winner deliberately on team B, so a side mix-up would show.
  const matchId = await voidedMatch(f, f.loser.userId, f.winner.userId);
  try {
    const { status, body } = await invokeFunction(
      'admin-record-match',
      { matchId, scoreTeamA: 4, scoreTeamB: 8 },
      INTERNAL_KEY,
    );
    assertEquals(status, 200, `unexpected response: ${JSON.stringify(body)}`);
    const res = body as { winnerTeam: string; category: string; previousStatus: string };
    assertEquals(res.winnerTeam, 'b');
    // The category is the match's own, not derived from anything.
    assertEquals(res.category, 'erkek_tek');
    assertEquals(res.previousStatus, 'voided');

    const supa = adminClient();
    const { data: m } = await supa.from('matches').select('*').eq('id', matchId).single();
    assertExists(m);
    assertEquals(m.status, 'confirmed');
    assertEquals(m.winner_team, 'b');
    assertEquals([m.score_team_a, m.score_team_b], [4, 8]);
    assertEquals(m.voided_reason, null);

    // Two new players at 1200, Pro Set 8-4: K 40 x (1 - 0.5) x margin 1.2 = 24.
    const { data: ratings } = await supa
      .from('elo_ratings')
      .select('profile_id, rating, matches_played')
      .eq('category', 'erkek_tek')
      .in('profile_id', [f.winner.userId, f.loser.userId]);
    type Rating = { profile_id: string; rating: number; matches_played: number };
    const byId = new Map(((ratings ?? []) as Rating[]).map((r) => [r.profile_id, r]));
    assertEquals(byId.get(f.winner.userId)?.rating, 1224);
    assertEquals(byId.get(f.loser.userId)?.rating, 1176);
    assertEquals(byId.get(f.winner.userId)?.matches_played, 1);
  } finally {
    await teardownUsers([f.winner.userId, f.loser.userId], { matchIds: [matchId] });
  }
});

Deno.test('admin-record-match: RESCORE refuses a match whose ELO was already applied', async () => {
  const f = await fixture(crypto.randomUUID().slice(0, 8));
  const matchId = await voidedMatch(f, f.winner.userId, f.loser.userId);
  try {
    const first = await invokeFunction(
      'admin-record-match',
      { matchId, scoreTeamA: 8, scoreTeamB: 4 },
      INTERNAL_KEY,
    );
    assertEquals(first.status, 200);

    // A second call would move both ratings again on top of the first.
    const second = await invokeFunction(
      'admin-record-match',
      { matchId, scoreTeamA: 8, scoreTeamB: 4 },
      INTERNAL_KEY,
    );
    assertEquals(second.status, 409);

    const { data: w } = await adminClient()
      .from('elo_ratings')
      .select('rating')
      .eq('category', 'erkek_tek')
      .eq('profile_id', f.winner.userId)
      .single();
    assertEquals(w?.rating, 1224, 'rating moved twice');
  } finally {
    await teardownUsers([f.winner.userId, f.loser.userId], { matchIds: [matchId] });
  }
});

Deno.test('admin-record-match: RESCORE of a missing match is a 404', async () => {
  const { status } = await invokeFunction(
    'admin-record-match',
    { matchId: crypto.randomUUID(), scoreTeamA: 8, scoreTeamB: 4 },
    INTERNAL_KEY,
  );
  assertEquals(status, 404);
});
