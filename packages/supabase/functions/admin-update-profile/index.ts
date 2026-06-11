import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  targetUserId: z.string().uuid(),
  role: z.enum(['player', 'admin']).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  // Plan 8 Phase A4: multi-duration suspends. ISO timestamp for when the
  // suspension auto-expires (cron flips status back to active). Omit for a
  // permanent ban, or pass null to clear an existing expiry.
  suspendedUntil: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().max(500).optional(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supa = getServiceClient();
    const auth = await requireAdmin(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const input = parsed.data;
    if (
      input.role === undefined &&
      input.status === undefined &&
      input.suspendedUntil === undefined
    ) {
      return errorResponse('Provide at least one of role, status, or suspendedUntil', 400);
    }
    if (input.targetUserId === auth.userId && input.role === 'player') {
      return errorResponse('Admin cannot demote self', 409);
    }

    const patch: Record<string, unknown> = {};
    if (input.role !== undefined) patch.role = input.role;
    if (input.status !== undefined) patch.status = input.status;
    // Always write suspended_until when provided (including null to clear).
    // When status flips away from 'suspended', also force the column to null
    // so a re-activated user never carries a stale expiry timestamp.
    if (input.suspendedUntil !== undefined) {
      patch.suspended_until = input.suspendedUntil;
    } else if (input.status !== undefined && input.status !== 'suspended') {
      patch.suspended_until = null;
    }

    const { data: updated, error } = await supa
      .from('profiles')
      .update(patch)
      .eq('user_id', input.targetUserId)
      .select('user_id, role, status')
      .single();
    if (error) {
      return errorResponse(error.message, 422, error);
    }
    if (!updated) return errorResponse('Profile not found', 404);

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'admin_update_profile',
      entity_type: 'profile',
      entity_id: input.targetUserId,
      details: { patch, notes: input.notes ?? null },
    });

    return jsonResponse({
      userId: updated.user_id,
      role: updated.role,
      status: updated.status,
    });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
