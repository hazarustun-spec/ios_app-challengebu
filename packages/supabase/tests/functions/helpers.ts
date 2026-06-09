import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'http://127.0.0.1:54321';
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
export const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

/** All test emails must use this domain so cleanupTestData() can find them. */
export const TEST_EMAIL_DOMAIN = '@test.local';

const TEST_PASSWORD = 'test-password-123';

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createTestUser(opts: {
  email: string;
  role?: 'player' | 'admin';
  firstName?: string;
  lastName?: string;
  genderCategory?: 'erkek' | 'kadin' | 'open_only';
  departmentName?: string;
}): Promise<{ userId: string; accessToken: string }> {
  const supa = adminClient();

  const { data: created, error: signUpErr } = await supa.auth.admin.createUser({
    email: opts.email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (signUpErr || !created.user) throw new Error(`createUser: ${signUpErr?.message}`);

  let departmentId: string | null = null;
  if (opts.departmentName) {
    const { data: dept } = await supa
      .from('departments')
      .select('id')
      .eq('name', opts.departmentName)
      .single();
    departmentId = dept?.id ?? null;
  }
  if (!departmentId) {
    const { data: anyDept } = await supa.from('departments').select('id').limit(1).single();
    if (!anyDept) throw new Error('No departments seeded; run `supabase db reset`');
    departmentId = anyDept.id;
  }

  const { error: profileErr } = await supa.from('profiles').insert({
    user_id: created.user.id,
    role: opts.role ?? 'player',
    first_name: opts.firstName ?? 'Test',
    last_name: opts.lastName ?? 'User',
    email: opts.email,
    pronoun: 'they/them',
    gender_category: opts.genderCategory ?? 'erkek',
    department_id: departmentId,
    class_year: '3',
    skill_self_assessment: 'orta',
    dominant_hand: 'sag',
    availability_windows: ['weekday_evening'],
  });
  if (profileErr) throw new Error(`profile insert: ${profileErr.message}`);

  const userSupa = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signIn, error: signInErr } = await userSupa.auth.signInWithPassword({
    email: opts.email,
    password: TEST_PASSWORD,
  });
  if (signInErr || !signIn.session) throw new Error(`signIn: ${signInErr?.message}`);

  return { userId: created.user.id, accessToken: signIn.session.access_token };
}

export async function invokeFunction(
  name: string,
  body: unknown,
  accessToken?: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') ?? '';
  const responseBody = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, body: responseBody };
}

export async function cleanupTestData(): Promise<void> {
  const supa = adminClient();
  // Delete dependent rows first so auth.users cascade to profiles/match_requests
  // is not blocked by matches.match_request_id (no ON DELETE action) or
  // audit_log.actor_id (no ON DELETE action).
  await supa.from('audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  // announcements.created_by → profiles(user_id) has NO ACTION on delete, so
  // clear before any auth.user delete loop hits a profile.
  await supa.from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  // notifications cascade from profiles but publish-announcement tests may
  // leave orphans depending on which user is deleted first; nuke them defensively.
  await supa.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  // tournament_matches.match_id → matches has NO ACTION on delete, so clear it before matches.
  await supa.from('tournament_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supa.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supa.from('match_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  // Season-related rows: tournaments, tournament_matches, season_standings cascade from seasons.
  // yearly_championship does not cascade from seasons so delete explicitly.
  await supa.from('yearly_championship').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supa.from('seasons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  // Delete profiles left over from anonymize-account tests. Anonymization rewrites the
  // profile email to `anonymized-<uuid>@deleted.local` while the corresponding
  // auth.users.email keeps its original `@test.local` suffix, so the loop below catches
  // the auth row but the profile FK will cascade. We still nuke any orphaned anonymized
  // profile rows defensively.
  const { data: anonProfiles } = await supa
    .from('profiles')
    .select('user_id, email')
    .like('email', 'anonymized-%@deleted.local');
  for (const p of anonProfiles ?? []) {
    await supa.from('profiles').delete().eq('user_id', p.user_id);
  }
  // Delete test users by email pattern; profiles cascade
  const { data: users } = await supa.auth.admin.listUsers();
  for (const u of users.users) {
    if (u.email?.endsWith(TEST_EMAIL_DOMAIN)) {
      await supa.auth.admin.deleteUser(u.id);
    }
  }
}
