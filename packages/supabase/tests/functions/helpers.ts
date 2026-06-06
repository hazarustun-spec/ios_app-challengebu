import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'http://127.0.0.1:54321';
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
export const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

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
    password: 'test-password-123',
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
    departmentId = anyDept!.id;
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

  const { data: session, error: sessionErr } = await supa.auth.admin.generateLink({
    type: 'magiclink',
    email: opts.email,
  });
  if (sessionErr) throw new Error(`generateLink: ${sessionErr.message}`);

  const userSupa = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signIn, error: signInErr } = await userSupa.auth.signInWithPassword({
    email: opts.email,
    password: 'test-password-123',
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
  // Delete test users by email pattern; profiles cascade
  const { data: users } = await supa.auth.admin.listUsers();
  for (const u of users.users) {
    if (u.email?.endsWith('@test.local')) {
      await supa.auth.admin.deleteUser(u.id);
    }
  }
}
