import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthError, requireAdmin } from './auth-guard.ts';

/**
 * Gate for functions that should only be called by:
 *   1. Internal service-to-service invocations (Bearer = SUPABASE_SERVICE_ROLE_KEY), OR
 *   2. A human admin user (verified via requireAdmin).
 *
 * Normal / anon callers are rejected with 401/403.
 *
 * Internal flow: confirm-match passes the service role key as the Bearer token
 * when it invokes award-badges or advance-tournament-bracket; that token matches
 * the env var and the call is allowed immediately without hitting the DB.
 */
export async function requireInternalOrAdmin(
  req: Request,
  serviceClient: SupabaseClient,
): Promise<void> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new AuthError('Missing authorization header', 401);
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Fast-path: internal call carrying the service role key.
  if (serviceRoleKey && token === serviceRoleKey) {
    return;
  }

  // Slow-path: allow a human admin to call these endpoints too.
  await requireAdmin(req, serviceClient);
}
