import { assertEquals, assertExists } from 'jsr:@std/assert';
import { createClient } from '@supabase/supabase-js';
import { adminClient, ANON_KEY, createTestUser, SUPABASE_URL, teardownUsers } from './helpers.ts';

/**
 * Plan 8 Task A4 — Admin paneli backend uzantıları.
 */

function jwtClient(accessToken: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

Deno.test('expire_suspensions: clears past-due suspended_until + status=active', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const supa = adminClient();
  const user = await createTestUser({ email: `expire-${s}@test.local` });
  try {
    await supa.from('profiles').update({
      status: 'suspended',
      suspended_until: new Date(Date.now() - 60_000).toISOString(),
    }).eq('user_id', user.userId);

    const { error: rpcErr } = await supa.rpc('expire_suspensions');
    assertEquals(rpcErr, null, `expire_suspensions errored: ${rpcErr?.message}`);

    const { data } = await supa.from('profiles')
      .select('status, suspended_until').eq('user_id', user.userId).single();
    assertEquals(data!.status, 'active');
    assertEquals(data!.suspended_until, null);
  } finally {
    await teardownUsers([user.userId]);
  }
});

Deno.test('expire_suspensions: leaves future suspended_until alone', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const supa = adminClient();
  const user = await createTestUser({ email: `expire-future-${s}@test.local` });
  const futureIso = new Date(Date.now() + 86_400_000).toISOString();
  try {
    await supa.from('profiles').update({
      status: 'suspended', suspended_until: futureIso,
    }).eq('user_id', user.userId);

    const { error: rpcErr } = await supa.rpc('expire_suspensions');
    assertEquals(rpcErr, null);

    const { data } = await supa.from('profiles')
      .select('status, suspended_until').eq('user_id', user.userId).single();
    assertEquals(data!.status, 'suspended');
    assertExists(data!.suspended_until);
    assertEquals(
      new Date(data!.suspended_until as string).getTime(),
      new Date(futureIso).getTime(),
    );
  } finally {
    await teardownUsers([user.userId]);
  }
});

Deno.test('expire_suspensions: NULL suspended_until (permanent ban) stays suspended', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const supa = adminClient();
  const user = await createTestUser({ email: `expire-perma-${s}@test.local` });
  try {
    await supa.from('profiles').update({
      status: 'suspended', suspended_until: null,
    }).eq('user_id', user.userId);

    const { error: rpcErr } = await supa.rpc('expire_suspensions');
    assertEquals(rpcErr, null);

    const { data } = await supa.from('profiles')
      .select('status, suspended_until').eq('user_id', user.userId).single();
    assertEquals(data!.status, 'suspended');
    assertEquals(data!.suspended_until, null);
  } finally {
    await teardownUsers([user.userId]);
  }
});

Deno.test('admin_cron_status: non-admin caller rejected (42501)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const player = await createTestUser({ email: `cron-noadmin-${s}@test.local` });
  try {
    const { error } = await jwtClient(player.accessToken).rpc('admin_cron_status', { lim: 10 });
    assertExists(error);
    assertEquals((error as { code?: string }).code, '42501');
  } finally {
    await teardownUsers([player.userId]);
  }
});

Deno.test('admin_cron_status: admin caller gets rows', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({ email: `cron-admin-${s}@test.local`, role: 'admin' });
  try {
    const { data, error } = await jwtClient(admin.accessToken).rpc('admin_cron_status', { lim: 10 });
    assertEquals(error, null, `admin_cron_status errored: ${error?.message}`);
    assertExists(data);
  } finally {
    await teardownUsers([admin.userId]);
  }
});

/**
 * Build a finale-stage season + tournament + 8 ranked players.
 */
async function seedFinaleBracket(suffix: string): Promise<{
  tournamentId: string; seasonId: string; playerIds: string[];
}> {
  const supa = adminClient();
  const players = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      createTestUser({ email: `seed-${i}-${suffix}@test.local`, genderCategory: 'erkek' }),
    ),
  );

  const { data: season, error: seasonErr } = await supa.from('seasons').insert({
    name: 'bahar',
    year: 2099,
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    finale_starts_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    finale_ends_at: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    status: 'finale',
  }).select('id').single();
  if (seasonErr || !season) throw new Error(`season insert: ${seasonErr?.message}`);

  for (let i = 0; i < 8; i++) {
    const { error } = await supa.from('season_standings').insert({
      season_id: season.id, profile_id: players[i].userId, category: 'erkek_tek',
      final_rating: 1500 - i * 10, rank: i + 1, matches_played: 5,
    });
    if (error) throw new Error(`season_standings insert: ${error.message}`);
  }

  const { data: tournament, error: tErr } = await supa.from('tournaments').insert({
    season_id: season.id, category: 'erkek_tek', bracket_size: 8, status: 'seeded',
  }).select('id').single();
  if (tErr || !tournament) throw new Error(`tournament insert: ${tErr?.message}`);

  const seedPairs = [[1, 8], [4, 5], [3, 6], [2, 7]];
  for (let pos = 0; pos < seedPairs.length; pos++) {
    const { error } = await supa.from('tournament_matches').insert({
      tournament_id: tournament.id, round: 1, bracket_position: pos + 1,
      seed_a: seedPairs[pos][0], seed_b: seedPairs[pos][1],
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
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({ email: `bracket-admin-${s}@test.local`, role: 'admin' });
  const { tournamentId, seasonId, playerIds } = await seedFinaleBracket(s);
  try {
    const supa = adminClient();
    const reversed = [...playerIds].reverse();

    const { error: rpcErr } = await jwtClient(admin.accessToken).rpc('admin_reorder_bracket_seeds', {
      tournament_id: tournamentId, seed_player_ids: reversed,
    });
    assertEquals(rpcErr, null, `RPC errored: ${rpcErr?.message}`);

    const { data: standings } = await supa.from('season_standings')
      .select('profile_id, rank')
      .eq('season_id', seasonId).eq('category', 'erkek_tek')
      .order('rank', { ascending: true });
    assertExists(standings);
    assertEquals(standings.length, 8);
    for (let i = 0; i < 8; i++) {
      assertEquals(standings[i].profile_id, reversed[i], `rank ${i + 1} should hold reversed[${i}]`);
    }

    const { data: qf } = await supa.from('tournament_matches')
      .select('bracket_position, seed_a, seed_b')
      .eq('tournament_id', tournamentId).eq('round', 1)
      .order('bracket_position', { ascending: true });
    assertExists(qf);
    assertEquals(qf.length, 4);
    assertEquals(qf[0].seed_a, 1);
    assertEquals(qf[0].seed_b, 8);
    assertEquals(qf[3].seed_a, 2);
    assertEquals(qf[3].seed_b, 7);

    const { data: audit } = await supa.from('audit_log')
      .select('action, entity_type, entity_id, actor_id, details')
      .eq('action', 'reorder_bracket').eq('entity_id', tournamentId)
      .order('created_at', { ascending: false }).limit(1).single();
    assertExists(audit);
    assertEquals(audit.actor_id, admin.userId);
    assertEquals(audit.entity_type, 'tournament');

    const { data: seed1 } = await supa.from('season_standings')
      .select('profile_id').eq('season_id', seasonId).eq('category', 'erkek_tek').eq('rank', 1).single();
    assertEquals(seed1!.profile_id, reversed[0]);

    const { data: seed8 } = await supa.from('season_standings')
      .select('profile_id').eq('season_id', seasonId).eq('category', 'erkek_tek').eq('rank', 8).single();
    assertEquals(seed8!.profile_id, reversed[7]);
  } finally {
    await teardownUsers([admin.userId, ...playerIds], { seasonIds: [seasonId] });
  }
});

Deno.test('admin_reorder_bracket_seeds: non-admin rejected (42501)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const player = await createTestUser({ email: `reorder-noadmin-${s}@test.local` });
  try {
    const { error } = await jwtClient(player.accessToken).rpc('admin_reorder_bracket_seeds', {
      tournament_id: '00000000-0000-0000-0000-000000000000',
      seed_player_ids: Array.from({ length: 8 }, () => '00000000-0000-0000-0000-000000000000'),
    });
    assertExists(error);
    assertEquals((error as { code?: string }).code, '42501');
  } finally {
    await teardownUsers([player.userId]);
  }
});

Deno.test('admin_reorder_bracket_seeds: wrong array length rejected', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({ email: `reorder-len-${s}@test.local`, role: 'admin' });
  try {
    const { error } = await jwtClient(admin.accessToken).rpc('admin_reorder_bracket_seeds', {
      tournament_id: '00000000-0000-0000-0000-000000000000',
      seed_player_ids: Array.from({ length: 5 }, () => '00000000-0000-0000-0000-000000000000'),
    });
    assertExists(error);
    assertEquals((error as { code?: string }).code, '22023');
  } finally {
    await teardownUsers([admin.userId]);
  }
});

Deno.test('admin_reorder_bracket_seeds: doubles tournament rejected (0A000)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({ email: `reorder-doubles-${s}@test.local`, role: 'admin' });
  const supa = adminClient();

  const { data: season, error: seasonErr } = await supa.from('seasons').insert({
    name: 'bahar', year: 2098,
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    finale_starts_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    finale_ends_at: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    status: 'finale',
  }).select('id').single();
  if (seasonErr || !season) throw new Error(`season insert: ${seasonErr?.message}`);

  const { data: tournament, error: tErr } = await supa.from('tournaments').insert({
    season_id: season.id, category: 'kadin_cift', bracket_size: 8, status: 'seeded',
  }).select('id').single();
  if (tErr || !tournament) throw new Error(`tournament insert: ${tErr?.message}`);

  try {
    const { error } = await jwtClient(admin.accessToken).rpc('admin_reorder_bracket_seeds', {
      tournament_id: tournament.id,
      seed_player_ids: Array.from({ length: 8 }, () => '00000000-0000-0000-0000-000000000001'),
    });
    assertExists(error);
    assertEquals((error as { code?: string }).code, '0A000');
  } finally {
    await teardownUsers([admin.userId], { seasonIds: [season.id] });
  }
});

Deno.test('admin_reorder_bracket_seeds: duplicate IDs rejected (22023)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({ email: `reorder-dup-${s}@test.local`, role: 'admin' });
  const { tournamentId, seasonId, playerIds } = await seedFinaleBracket(s + 'dup');
  try {
    const dup = Array.from({ length: 8 }, () => playerIds[0]);
    const { error } = await jwtClient(admin.accessToken).rpc('admin_reorder_bracket_seeds', {
      tournament_id: tournamentId, seed_player_ids: dup,
    });
    assertExists(error);
    assertEquals((error as { code?: string }).code, '22023');
  } finally {
    await teardownUsers([admin.userId, ...playerIds], { seasonIds: [seasonId] });
  }
});

Deno.test('admin_reorder_bracket_seeds: NULL in array rejected (22023)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({ email: `reorder-null-${s}@test.local`, role: 'admin' });
  const { tournamentId, seasonId, playerIds } = await seedFinaleBracket(s + 'nul');
  try {
    const withNull: (string | null)[] = [...playerIds];
    withNull[7] = null;
    const { error } = await jwtClient(admin.accessToken).rpc('admin_reorder_bracket_seeds', {
      tournament_id: tournamentId, seed_player_ids: withNull,
    });
    assertExists(error);
    assertEquals((error as { code?: string }).code, '22023');
  } finally {
    await teardownUsers([admin.userId, ...playerIds], { seasonIds: [seasonId] });
  }
});

Deno.test('admin_reorder_bracket_seeds: non-member UUID rejected (P0002)', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const admin = await createTestUser({ email: `reorder-stranger-${s}@test.local`, role: 'admin' });
  const { tournamentId, seasonId, playerIds } = await seedFinaleBracket(s + 'str');
  try {
    const stranger = [...playerIds];
    stranger[3] = '00000000-0000-0000-0000-0000000000aa';
    const { error } = await jwtClient(admin.accessToken).rpc('admin_reorder_bracket_seeds', {
      tournament_id: tournamentId, seed_player_ids: stranger,
    });
    assertExists(error);
    assertEquals((error as { code?: string }).code, 'P0002');
  } finally {
    await teardownUsers([admin.userId, ...playerIds], { seasonIds: [seasonId] });
  }
});
