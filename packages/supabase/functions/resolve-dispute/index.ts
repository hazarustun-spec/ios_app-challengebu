import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, internalError } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { requireAdmin, AuthError } from '../_shared/auth-guard.ts';
import { applyEloForMatch } from '../_shared/apply-elo.ts';
import type { MatchFormat } from '../_shared/elo.ts';

const inputSchema = z.object({
  disputeId: z.string().uuid(),
  outcome: z.enum(['approve_a', 'approve_b', 'void', 'replay']),
  notes: z.string().max(1000).optional(),
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

    const { data: dispute } = await supa
      .from('disputes')
      .select('id, match_id, status')
      .eq('id', parsed.data.disputeId)
      .single();
    if (!dispute) return errorResponse('Dispute not found', 404);
    if (dispute.status !== 'open') return errorResponse('Dispute already resolved', 409);

    const { data: match } = await supa.from('matches').select('*').eq('id', dispute.match_id).single();
    if (!match) return errorResponse('Match not found', 404);

    let outcome = parsed.data.outcome;
    const adminInMatch =
      match.team_a_player_ids.includes(auth.userId) || match.team_b_player_ids.includes(auth.userId);
    if (adminInMatch) {
      const adminOnA = match.team_a_player_ids.includes(auth.userId);
      outcome = adminOnA ? 'approve_b' : 'approve_a';
    }

    if (outcome === 'replay') {
      await supa.from('matches').update({
        status: 'awaiting_confirmation',
        confirmed_by: [],
        confirmed_at: null,
        winner_team: null,
        score_team_a: 0,
        score_team_b: 0,
        score_details: null,
      }).eq('id', match.id);
    } else if (outcome === 'void') {
      await supa.from('matches').update({
        status: 'voided',
        voided_reason: parsed.data.notes ?? 'Voided by admin',
      }).eq('id', match.id);
    } else {
      const winner = outcome === 'approve_a' ? 'a' : 'b';
      // Ensure scores align with declared winner: winning team's score must be > losing team's.
      // If admin overrode the winner (anti-conflict rule), or scores otherwise contradict
      // the chosen winner, swap them so ELO can be applied consistently.
      const winnerScoreOnA = winner === 'a' ? match.score_team_a : match.score_team_b;
      const winnerScoreOnB = winner === 'a' ? match.score_team_b : match.score_team_a;
      const needsSwap = winnerScoreOnA <= winnerScoreOnB;
      const finalScoreA = needsSwap ? match.score_team_b : match.score_team_a;
      const finalScoreB = needsSwap ? match.score_team_a : match.score_team_b;

      await supa.from('matches').update({
        status: 'confirmed',
        winner_team: winner,
        score_team_a: finalScoreA,
        score_team_b: finalScoreB,
        confirmed_at: new Date().toISOString(),
      }).eq('id', match.id);

      await applyEloForMatch(supa, {
        id: match.id,
        category: match.category,
        format: match.format as MatchFormat,
        is_rated: match.is_rated,
        kind: match.kind,
        team_a_player_ids: match.team_a_player_ids,
        team_b_player_ids: match.team_b_player_ids,
        score_team_a: finalScoreA,
        score_team_b: finalScoreB,
        winner_team: winner,
      });
    }

    await supa.from('disputes').update({
      status: 'resolved',
      resolution_notes: parsed.data.notes ?? null,
      resolved_by: auth.userId,
      resolved_at: new Date().toISOString(),
    }).eq('id', dispute.id);

    await supa.from('audit_log').insert({
      actor_id: auth.userId,
      action: 'resolve_dispute',
      entity_type: 'dispute',
      entity_id: dispute.id,
      details: { outcome, adminInMatch },
    });

    return jsonResponse({ outcome, status: 'resolved' });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
