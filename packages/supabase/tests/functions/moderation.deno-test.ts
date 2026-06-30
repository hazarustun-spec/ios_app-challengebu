import { assertEquals, assertExists } from 'jsr:@std/assert';
import { createClient } from '@supabase/supabase-js';
import { ANON_KEY, SUPABASE_URL, createTestUser, teardownUsers } from './helpers.ts';

function userClient(accessToken: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.test('moderation: reporter files + reads own report; outsider cannot read it', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const reporter = await createTestUser({ email: `rep-a-${s}@test.local` });
  const reported = await createTestUser({ email: `rep-b-${s}@test.local` });
  const outsider = await createTestUser({ email: `rep-c-${s}@test.local` });
  try {
    const cr = userClient(reporter.accessToken);
    const { error: insErr } = await cr.from('user_reports').insert({
      reporter_id: reporter.userId,
      reported_id: reported.userId,
      reason: 'Uygunsuz mesaj',
    });
    assertEquals(insErr, null);

    // Reporter reads their own report.
    const own = await cr.from('user_reports').select('id').eq('reporter_id', reporter.userId);
    assertEquals((own.data ?? []).length, 1);

    // Outsider (non-admin) cannot read it.
    const co = userClient(outsider.accessToken);
    const seen = await co.from('user_reports').select('id').eq('reporter_id', reporter.userId);
    assertEquals((seen.data ?? []).length, 0);

    // Self-report is rejected by the CHECK constraint.
    const selfRep = await cr.from('user_reports').insert({
      reporter_id: reporter.userId,
      reported_id: reporter.userId,
      reason: 'x',
    });
    assertExists(selfRep.error);
  } finally {
    await teardownUsers([reporter.userId, reported.userId, outsider.userId]);
  }
});

Deno.test('moderation: admin can read all reports', async () => {
  const s = crypto.randomUUID().slice(0, 8);
  const reporter = await createTestUser({ email: `rep-d-${s}@test.local` });
  const reported = await createTestUser({ email: `rep-e-${s}@test.local` });
  const admin = await createTestUser({ email: `rep-adm-${s}@test.local`, role: 'admin' });
  try {
    await userClient(reporter.accessToken).from('user_reports').insert({
      reporter_id: reporter.userId,
      reported_id: reported.userId,
      reason: 'spam',
    });

    const ca = userClient(admin.accessToken);
    const all = await ca.from('user_reports').select('id').eq('reporter_id', reporter.userId);
    assertExists(all.data);
    if ((all.data ?? []).length < 1) throw new Error('admin should see the report');
  } finally {
    await teardownUsers([reporter.userId, reported.userId, admin.userId]);
  }
});
