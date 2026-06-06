import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthContext {
  userId: string;
  isAdmin: boolean;
  authHeader: string;
}

export async function requireAuth(req: Request, serviceClient: SupabaseClient): Promise<AuthContext> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new AuthError('Missing authorization header', 401);
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthError('Invalid token', 401);
  }

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .single();

  return {
    userId: data.user.id,
    isAdmin: profile?.role === 'admin',
    authHeader,
  };
}

export async function requireAdmin(req: Request, serviceClient: SupabaseClient): Promise<AuthContext> {
  const ctx = await requireAuth(req, serviceClient);
  if (!ctx.isAdmin) {
    throw new AuthError('Admin role required', 403);
  }
  return ctx;
}

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message);
    this.name = 'AuthError';
  }
}
