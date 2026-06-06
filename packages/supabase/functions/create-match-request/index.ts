import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { conflict, errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';

const inputSchema = z.object({
  type: z.enum(['direct_challenge', 'open_call']),
  targetId: z.string().uuid().optional(),
  category: z.enum([
    'erkek_tek',
    'kadin_tek',
    'open_tek',
    'erkek_cift',
    'kadin_cift',
    'karma_cift',
    'open_cift',
  ]),
  format: z.enum(['bu_klasik', 'hizli_tiebreak', 'pro_set_8', '3set_klasik']),
  isRated: z.boolean(),
  proposedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proposedTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  courtId: z.string().uuid(),
  creatorPartnerId: z.string().uuid().optional(),
  targetPartnerId: z.string().uuid().optional(),
});

const MAX_PENDING_RATED = 3;
const EXPIRY_HOURS = 24;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);

    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse('Invalid input', 400, parsed.error.format());
    }
    const input = parsed.data;

    if (input.type === 'direct_challenge' && !input.targetId) {
      return errorResponse('targetId required for direct_challenge', 400);
    }
    if (input.type === 'open_call' && input.targetId) {
      return errorResponse('targetId must be null for open_call', 400);
    }

    if (input.isRated) {
      const { count } = await supa
        .from('match_requests')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', auth.userId)
        .eq('is_rated', true)
        .eq('status', 'pending');
      if ((count ?? 0) >= MAX_PENDING_RATED) {
        return conflict(`Maximum ${MAX_PENDING_RATED} pending rated requests allowed`);
      }
    }

    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const { data: row, error: insertErr } = await supa
      .from('match_requests')
      .insert({
        creator_id: auth.userId,
        type: input.type,
        target_id: input.targetId ?? null,
        category: input.category,
        format: input.format,
        is_rated: input.isRated,
        proposed_date: input.proposedDate,
        proposed_time: input.proposedTime,
        court_id: input.courtId,
        creator_partner_id: input.creatorPartnerId ?? null,
        target_partner_id: input.targetPartnerId ?? null,
        expires_at: expiresAt,
      })
      .select('id, status, expires_at')
      .single();

    if (insertErr) return errorResponse('Failed to create match request', 500, insertErr);

    return jsonResponse({
      id: row!.id,
      status: row!.status,
      expiresAt: row!.expires_at,
    });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
