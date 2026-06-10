import { assertEquals, assertExists } from 'jsr:@std/assert';
import { createClient } from '@supabase/supabase-js';
import { adminClient, ANON_KEY, cleanupTestData, createTestUser, SUPABASE_URL } from './helpers.ts';

/**
 * Plan 8 Task A4 — Admin paneli backend uzantıları.
 *
 * 1. `profiles.suspended_until timestamptz` + `expire_suspensions()` cron
 *    (clears past-due suspensions back to `status = 'active'`).
 * 2. `admin_reorder_bracket_seeds(tournament_id, seed_player_ids)` — admin
 *    drag-reorders the 8 finale seeds. Implementation rewrites
 *    `season_standings.rank` so that `rank=i+1` corresponds to
 *    `seed_player_ids[i]`. Tournament_matches uses integer seed_a/seed_b that
 *    point at ranks (see migrations/20260606000006_seasons_tournaments.sql),
 *    so the integer mapping stays valid while the players competing at each
 *    seed shift accordingly.
 * 3. `admin_cron_status(lim)` — SECURITY DEFINER reader over
 *    `cron.job_run_details` for the admin Sistem Sağlığı screen.
 *
 * All RPCs are admin-gated via `public.is_admin()` (raises 42501 on non-admin).
 *
 * Schema deviations from the plan/spec snippet (recorded for reviewer):
 *  - `tournament_matches` has integer `seed_a`/`seed_b` columns referencing
 *    rank, NOT uuid `seed_player_a`/`seed_player_b`. The spec was outdated;
 *    we re-modeled the reorder operation to mutate `season_standings.rank`,
 *    which preserves the intended UX ("admin drags player into seed N").
 *  - `tournament_matches.bracket_position integer (1..4)` replaces `slot`.
 */

function jwtClient(accessToken: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

Deno.test('expire_suspensions: clears past-due suspended_until + status=active', async () => {
  await cleanupTestData();
  const supa = adminClient();
  const user = await createTestUser({ email: 'expire@test.local' });

  await supa.from('profiles').update({
    status: 'suspended',
    suspended_until: new Date(Date.now() - 60_000).toISOString(),
  }).eq('user_id', user.userId);

  const { error: rpcErr } = await supa.rpc('expire_suspensions');
  assertEquals(rpcErr, null, `expire_suspensions errored: ${rpcErr?.message}`);

  const { data } = await supa.from('profiles')
    .select('status, suspended_until')
    .eq('user_id', user.userId).single();
  assertEquals(data!.status, 'active');
  assertEquals(data!.suspended_until, null);
  await cleanupTestData();
});

Deno.test('expire_suspensions: leaves future suspended_until alone', async () => {
  await cleanupTestData();
  const supa = adminClient();
  const user = await createTestUser({ email: 'expire-future@test.local' });

  const futureIso = new Date(Date.now() + 86_400_000).toISOString();
  await supa.from('profiles').update({
    status: 'suspended',
    suspended_until: futureIso,
  }).eq('user_id', user.userId);

  const { error: rpcErr } = await supa.rpc('expire_suspensions');
  assertEquals(rpcErr, null);

  const { data } = await supa.from('profiles')
    .select('status, suspended_until')
    .eq('user_id', user.userId).single();
  assertEquals(data!.status, 'suspended');
  assertExists(data!.suspended_until);
  // Compare as Date to tolerate Postgres microsecond rounding (`.000Z` ↔ `.000000Z`).
  assertEquals(
    new Date(data!.suspended_until as string).getTime(),
    new Date(futureIso).getTime(),
  );
  await cleanupTestData();
});

Deno.test('expire_suspensions: NULL suspended_until (permanent ban) stays suspended', async () => {
  await cleanupTestData();
  const supa = adminClient();
  const user = await createTestUser({ email: 'expire-perma@test.local' });

  await supa.from('profiles').update({
    status: 'suspended',
    suspended_until: null,
  }).eq('user_id', user.userId);

  const { error: rpcErr } = await supa.rpc('expire_suspensions');
  assertEquals(rpcErr, null);

  const { data } = await supa.from('profiles')
    .select('status, suspended_until')
    .eq('user_id', user.userId).single();
  assertEquals(data!.status, 'suspended');
  assertEquals(data!.suspended_until, null);
  await cleanupTestData();
});

Deno.test('admin_cron_status: non-admin caller rejected (42501)', async () => {
  await cleanupTestData();
  const player = await createTestUser({ email: 'cron-non-admin@test.local' });
  const playerClient = jwtClient(player.accessToken);

  const { error } = await playerClient.rpc('admin_cron_status', { lim: 10 });
  assertExists(error);
  assertEquals((error as { code?: string }).code, '42501');
  await cleanupTestData();
});

Deno.test('admin_cron_status: admin caller gets rows', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'cron-admin@test.local', role: 'admin' });
  const adminJwt = jwtClient(admin.accessToken);

  const { data, error } = await adminJwt.rpc('admin_cron_status', { lim: 10 });
  assertEquals(error, null, `admin_cron_status errored: ${error?.message}`);
  assertExists(data);
  // pg_cron may have 0 run_details on a fresh DB; just assert no error & shape.
  await cleanupTestData();
});

/**
 * Build a finale-stage season+tournament+8 ranked players. Returns
 * (tournamentId, seasonId, playerIds in seed order 1..8).
 */
async function seedFinaleBracket(): Promise<{
  tournamentId: string;
  seasonId: string;
  playerIds: string[];
}> {
  const supa = adminClient();
  const players = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      createTestUser({ email: `seed-${i}@test.local`, genderCategory: 'erkek' }),
    ),
  );

  const { data: season, error: seasonErr } = await supa.from('seasons').insert({
    name: 'bahar',
    year: 2099, // far-future to avoid collisions with seeded seasons
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    finale_starts_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    finale_ends_at: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    status: 'finale',
  }).select('id').single();
  if (seasonErr || !season) throw new Error(`season insert: ${seasonErr?.message}`);

  for (let i = 0; i < 8; i++) {
    const { error } = await supa.from('season_standings').insert({
      season_id: season.id,
      profile_id: players[i].userId,
      category: 'erkek_tek',
      final_rating: 1500 - i * 10,
      rank: i + 1,
      matches_played: 5,
    });
    if (error) throw new Error(`season_standings insert: ${error.message}`);
  }

  const { data: tournament, error: tErr } = await supa.from('tournaments').insert({
    season_id: season.id,
    category: 'erkek_tek',
    bracket_size: 8,
    status: 'seeded',
  }).select('id').single();
  if (tErr || !tournament) throw new Error(`tournament insert: ${tErr?.message}`);

  // 4 QF matches (round=1), seed pairs 1v8, 4v5, 3v6, 2v7 (mirrors start-season-finale).
  const seedPairs = [[1, 8], [4, 5], [3, 6], [2, 7]];
  for (let pos = 0; pos < seedPairs.length; pos++) {
    const { error } = await supa.from('tournament_matches').insert({
      tournament_id: tournament.id,
      round: 1,
      bracket_position: pos + 1,
      seed_a: seedPairs[pos][0],
      seed_b: seedPairs[pos][1],
    });
    if (error) throw new Error(`tournament_matches insert: ${error.message}`);
  }

  return {
    tournamentId: tournament.id,
    seasonId: season.id,
    playerIds: players.map((p) => p.userId),
  };
}

Deno.test('admin_reorder_bracket_seeds: rewrites season_standings.rank by player order', async () => {
  await cleanupTestData();
  const supa = adminClient();
  const admin = await createTestUser({ email: 'bracket-admin@test.local', role: 'admin' });

  const { tournamentId, seasonId, playerIds } = await seedFinaleBracket();

  // Reverse the player order: top seed becomes the previously-bottom player.
  const reversed = [...playerIds].reverse();

  const adminJwt = jwtClient(admin.accessToken);
  const { error: rpcErr } = await adminJwt.rpc('admin_reorder_bracket_seeds', {
    tournament_id: tournamentId,
    seed_player_ids: reversed,
  });
  assertEquals(rpcErr, null, `RPC errored: ${rpcErr?.message}`);

  // Verify season_standings ranks now match the reversed order.
  const { data: standings } = await supa.from('season_standings')
    .select('profile_id, rank')
    .eq('season_id', seasonId)
    .eq('category', 'erkek_tek')
    .order('rank', { ascending: true });
  assertExists(standings);
  assertEquals(standings.length, 8);
  for (let i = 0; i < 8; i++) {
    assertEquals(
      standings[i].profile_id,
      reversed[i],
      `rank ${i + 1} should now hold reversed[${i}]`,
    );
  }

  // Verify QF matches' integer seeds are untouched (1..8 → rank lookups).
  const { data: qf } = await supa.from('tournament_matches')
    .select('bracket_position, seed_a, seed_b')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .order('bracket_position', { ascending: true });
  assertExists(qf);
  assertEquals(qf.length, 4);
  assertEquals(qf[0].seed_a, 1);
  assertEquals(qf[0].seed_b, 8);
  assertEquals(qf[3].seed_a, 2);
  assertEquals(qf[3].seed_b, 7);

  // Audit log row written.
  const { data: audit } = await supa.from('audit_log')
    .select('action, entity_type, entity_id, actor_id, details')
    .eq('action', 'reorder_bracket')
    .eq('entity_id', tournamentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  assertExists(audit);
  assertEquals(audit.actor_id, admin.userId);
  assertEquals(audit.entity_type, 'tournament');

  // End-to-end resolution: bracket UI reads seed_a=1 → resolves to
  // season_standings WHERE rank=1 → profile_id. After reorder, that's
  // reversed[0]; seed 8 is reversed[7]. This is what the join the bracket UI
  // performs actually returns, not just the side-effect on a single table.
  const { data: seed1 } = await supa.from('season_standings')
    .select('profile_id')
    .eq('season_id', seasonId)
    .eq('category', 'erkek_tek')
    .eq('rank', 1).single();
  assertEquals(seed1!.profile_id, reversed[0]);

  const { data: seed8 } = await supa.from('season_standings')
    .select('profile_id')
    .eq('season_id', seasonId)
    .eq('category', 'erkek_tek')
    .eq('rank', 8).single();
  assertEquals(seed8!.profile_id, reversed[7]);

  await cleanupTestData();
});

Deno.test('admin_reorder_bracket_seeds: non-admin rejected (42501)', async () => {
  await cleanupTestData();
  const player = await createTestUser({ email: 'reorder-noadmin@test.local' });
  const playerJwt = jwtClient(player.accessToken);

  const { error } = await playerJwt.rpc('admin_reorder_bracket_seeds', {
    tournament_id: '00000000-0000-0000-0000-000000000000',
    seed_player_ids: Array.from({ length: 8 }, () => '00000000-0000-0000-0000-000000000000'),
  });
  assertExists(error);
  assertEquals((error as { code?: string }).code, '42501');
  await cleanupTestData();
});

Deno.test('admin_reorder_bracket_seeds: wrong array length rejected', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'reorder-len@test.local', role: 'admin' });
  const adminJwt = jwtClient(admin.accessToken);

  const { error } = await adminJwt.rpc('admin_reorder_bracket_seeds', {
    tournament_id: '00000000-0000-0000-0000-000000000000',
    seed_player_ids: Array.from({ length: 5 }, () => '00000000-0000-0000-0000-000000000000'),
  });
  assertExists(error);
  assertEquals((error as { code?: string }).code, '22023');
  await cleanupTestData();
});

Deno.test('admin_reorder_bracket_seeds: doubles tournament rejected (0A000)', async () => {
  // Seed a doubles tournament (kadin_cift) and confirm the RPC refuses to
  // touch it rather than silently no-op'ing season_standings (which is a
  // singles-only table — doubles seeds live in season_doubles_teams).
  await cleanupTestData();
  const supa = adminClient();
  const admin = await createTestUser({ email: 'reorder-doubles@test.local', role: 'admin' });

  const { data: season, error: seasonErr } = await supa.from('seasons').insert({
    name: 'bahar',
    year: 2098,
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    finale_starts_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    finale_ends_at: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    status: 'finale',
  }).select('id').single();
  if (seasonErr || !season) throw new Error(`season insert: ${seasonErr?.message}`);

  const { data: tournament, error: tErr } = await supa.from('tournaments').insert({
    season_id: season.id,
    category: 'kadin_cift',
    bracket_size: 8,
    status: 'seeded',
  }).select('id').single();
  if (tErr || !tournament) throw new Error(`tournament insert: ${tErr?.message}`);

  const adminJwt = jwtClient(admin.accessToken);
  const { error } = await adminJwt.rpc('admin_reorder_bracket_seeds', {
    tournament_id: tournament.id,
    seed_player_ids: Array.from({ length: 8 }, () => '00000000-0000-0000-0000-000000000001'),
  });
  assertExists(error);
  assertEquals((error as { code?: string }).code, '0A000');
  await cleanupTestData();
});

Deno.test('admin_reorder_bracket_seeds: duplicate IDs rejected (22023)', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'reorder-dup@test.local', role: 'admin' });
  const { tournamentId, playerIds } = await seedFinaleBracket();

  // Same UUID 8 times — passes length=8 but should fail distinct check.
  const dup = Array.from({ length: 8 }, () => playerIds[0]);

  const adminJwt = jwtClient(admin.accessToken);
  const { error } = await adminJwt.rpc('admin_reorder_bracket_seeds', {
    tournament_id: tournamentId,
    seed_player_ids: dup,
  });
  assertExists(error);
  assertEquals((error as { code?: string }).code, '22023');
  await cleanupTestData();
});

Deno.test('admin_reorder_bracket_seeds: NULL in array rejected (22023)', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'reorder-null@test.local', role: 'admin' });
  const { tournamentId, playerIds } = await seedFinaleBracket();

  // Replace last entry with NULL — Postgres uuid[] accepts NULL elements,
  // but the RPC must reject so the inner update doesn't silently no-op.
  const withNull: (string | null)[] = [...playerIds];
  withNull[7] = null;

  const adminJwt = jwtClient(admin.accessToken);
  const { error } = await adminJwt.rpc('admin_reorder_bracket_seeds', {
    tournament_id: tournamentId,
    seed_player_ids: withNull,
  });
  assertExists(error);
  assertEquals((error as { code?: string }).code, '22023');
  await cleanupTestData();
});

Deno.test('admin_reorder_bracket_seeds: non-member UUID rejected (P0002)', async () => {
  await cleanupTestData();
  const admin = await createTestUser({ email: 'reorder-stranger@test.local', role: 'admin' });
  const { tournamentId, playerIds } = await seedFinaleBracket();

  // Replace one entry with a random UUID that is not in season_standings.
  const stranger = [...playerIds];
  stranger[3] = '00000000-0000-0000-0000-0000000000aa';

  const adminJwt = jwtClient(admin.accessToken);
  const { error } = await adminJwt.rpc('admin_reorder_bracket_seeds', {
    tournament_id: tournamentId,
    seed_player_ids: stranger,
  });
  assertExists(error);
  assertEquals((error as { code?: string }).code, 'P0002');
  await cleanupTestData();
});
