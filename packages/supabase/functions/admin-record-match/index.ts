// Record, or re-score, a match that could not be settled in the app.
//
// The normal path needs both players to open the app, submit the same score and
// confirm. That is right for everyday use, but it leaves no way to fix a match
// the app itself lost: the score screen shipped with a perspective bug that
// made the two players submit mirrored scores (migration 20260909000001), so
// matches played on that build could never settle.
//
// Two operations, both admin-only and both narrow:
//
//   CREATE  — { teamAPlayerIds, teamBPlayerIds, category, format, scores, ... }
//             inserts one already-agreed result.
//
//   RESCORE — { matchId, scoreTeamA, scoreTeamB }
//             settles a match that ALREADY EXISTS but never had ELO applied —
//             a voided or stuck one. Prefer this whenever the match was played
//             through the app: category, format and both teams come from the
//             match's own row, so none of them can be guessed wrong. The first
//             correction done with CREATE picked the wrong opponent from an
//             e-mail and derived the category from genders (it landed in Open
//             Tek instead of Erkek Tek); the real match was sitting there,
//             voided, with every one of those facts already on it.
//
// Both apply ELO through `applyEloForMatch` — the same helper confirm-match
// uses — rather than doing the arithmetic again somewhere new. RESCORE refuses a
// match whose ratings were already moved, so it can never double-count.
//
// Auth mirrors dispatch-push, push-live-score and start-opponent-activity — the
// functions the database already drives through pg_net:
//
//   1. An internal call carries INTERNAL_PUSH_KEY as its Bearer. The vault
//      entry the triggers read is NAMED `service_role_key`, but its value is
//      INTERNAL_PUSH_KEY: under the new API-key system the function's
//      SUPABASE_SERVICE_ROLE_KEY is a different string.
//   2. The function is deployed with verify_jwt = false (config.toml), like the
//      other internal functions — INTERNAL_PUSH_KEY is not a JWT.
//
// Any other caller must be a signed-in admin, verified here by requireAdmin
// (auth.getUser + role check). Turning the gateway check off moves that
// verification into the function; it does not remove it.

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { applyEloForMatch } from '../_shared/apply-elo.ts';
import { AuthError, requireAdmin } from '../_shared/auth-guard.ts';
import { handleCors } from '../_shared/cors.ts';
import type { MatchFormat } from '../_shared/elo.ts';
import { conflict, errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const score = z.number().int().min(0).max(99);
const levelScores = {
  message: 'A recorded match needs a winner — scores cannot be level',
  path: ['scoreTeamA'],
};

const createSchema = z
  .object({
    teamAPlayerIds: z.array(z.string().uuid()).min(1).max(2),
    teamBPlayerIds: z.array(z.string().uuid()).min(1).max(2),
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
    scoreTeamA: score,
    scoreTeamB: score,
    courtId: z.string().uuid(),
    /** ISO timestamp of when it was actually played. Defaults to now. */
    playedAt: z.string().datetime().optional(),
    /** false records the result without touching anybody's rating. */
    isRated: z.boolean().default(true),
    /** Free-text note stored in the audit trail. */
    note: z.string().trim().max(300).optional(),
  })
  .refine((d) => d.scoreTeamA !== d.scoreTeamB, levelScores)
  .refine(
    (d) =>
      new Set([...d.teamAPlayerIds, ...d.teamBPlayerIds]).size ===
      d.teamAPlayerIds.length + d.teamBPlayerIds.length,
    { message: 'A player cannot be on both teams', path: ['teamBPlayerIds'] },
  );

const rescoreSchema = z
  .object({
    matchId: z.string().uuid(),
    scoreTeamA: score,
    scoreTeamB: score,
    note: z.string().trim().max(300).optional(),
  })
  .refine((d) => d.scoreTeamA !== d.scoreTeamB, levelScores);

/**
 * Everyone named has to exist and be an active player. Recording a result
 * against a deleted or suspended account would move a rating nobody owns.
 * Returns the refusal to send, or null when all is well.
 */
async function refuseInactive(supa: SupabaseClient, ids: string[]): Promise<Response | null> {
  const { data: profiles, error } = await supa
    .from('profiles')
    .select('user_id, status')
    .in('user_id', ids);
  if (error) return errorResponse('Failed to read players', 500, error);
  if ((profiles ?? []).length !== ids.length) {
    return errorResponse('One or more players do not exist', 400, {
      found: (profiles ?? []).map((p) => p.user_id),
    });
  }
  const inactive = (profiles ?? []).filter((p) => p.status !== 'active');
  if (inactive.length > 0) {
    return conflict(`Player is not active: ${inactive.map((p) => p.user_id).join(', ')}`);
  }
  return null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();

    // Internal call first, compared against INTERNAL_PUSH_KEY exactly as
    // dispatch-push does; otherwise a signed-in admin is required. The audit
    // log records the admin's id, or null for an internal call — there is no
    // person behind that one, and inventing one would be worse than none.
    const internalKey = (Deno.env.get('INTERNAL_PUSH_KEY') ?? '').trim();
    const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    let actorId: string | null = null;
    if (!(internalKey && bearer === internalKey)) {
      actorId = (await requireAdmin(req, supa)).userId;
    }

    const raw = await req.json();
    if (raw && typeof raw === 'object' && 'matchId' in raw) {
      return await rescore(supa, raw, actorId);
    }
    return await create(supa, raw, actorId);
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});

async function create(
  supa: SupabaseClient,
  raw: unknown,
  actorId: string | null,
): Promise<Response> {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
  const input = parsed.data;

  const allPlayers = [...input.teamAPlayerIds, ...input.teamBPlayerIds];
  const refusal = await refuseInactive(supa, allPlayers);
  if (refusal) return refusal;

  const winnerTeam: 'a' | 'b' = input.scoreTeamA > input.scoreTeamB ? 'a' : 'b';

  // Inserted already settled: an admin recording an agreed result is the
  // confirmation. `confirmed_by` lists every player so the match reads as
  // fully agreed wherever that field is displayed.
  const { data: match, error: insertErr } = await supa
    .from('matches')
    .insert({
      category: input.category,
      format: input.format,
      court_id: input.courtId,
      played_at: input.playedAt ?? new Date().toISOString(),
      is_rated: input.isRated,
      team_a_player_ids: input.teamAPlayerIds,
      team_b_player_ids: input.teamBPlayerIds,
      score_team_a: input.scoreTeamA,
      score_team_b: input.scoreTeamB,
      winner_team: winnerTeam,
      status: 'confirmed',
      confirmed_by: allPlayers,
      confirmed_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (insertErr || !match) return errorResponse('Failed to record match', 500, insertErr);

  await applyEloForMatch(supa, {
    id: match.id,
    category: match.category,
    format: match.format as MatchFormat,
    is_rated: match.is_rated,
    kind: match.kind,
    team_a_player_ids: match.team_a_player_ids,
    team_b_player_ids: match.team_b_player_ids,
    score_team_a: match.score_team_a,
    score_team_b: match.score_team_b,
    winner_team: match.winner_team,
  });

  await supa.from('audit_log').insert({
    actor_id: actorId,
    action: 'admin_record_match',
    entity_type: 'matches',
    entity_id: match.id,
    details: {
      via: actorId ? 'admin' : 'internal',
      note: input.note ?? null,
      score: `${input.scoreTeamA}-${input.scoreTeamB}`,
      winner_team: winnerTeam,
      is_rated: input.isRated,
      players: allPlayers,
    },
  });

  return jsonResponse({
    matchId: match.id,
    winnerTeam,
    score: `${input.scoreTeamA}-${input.scoreTeamB}`,
    eloApplied: input.isRated,
  });
}

async function rescore(
  supa: SupabaseClient,
  raw: unknown,
  actorId: string | null,
): Promise<Response> {
  const parsed = rescoreSchema.safeParse(raw);
  if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
  const input = parsed.data;

  const { data: match, error: readErr } = await supa
    .from('matches')
    .select('*')
    .eq('id', input.matchId)
    .maybeSingle();
  if (readErr) return errorResponse('Failed to read match', 500, readErr);
  if (!match) return errorResponse('Match not found', 404);

  // Never apply ELO twice. A confirmed match, or one whose rating columns are
  // already filled, has moved somebody's rating once; re-scoring it would move
  // it again on top. That needs a revert first, deliberately.
  if (
    match.status === 'confirmed' ||
    match.rating_after_team_a !== null ||
    match.rating_after_team_b !== null
  ) {
    return conflict('ELO has already been applied to this match — revert it before re-scoring');
  }

  const allPlayers: string[] = [...match.team_a_player_ids, ...match.team_b_player_ids];
  const refusal = await refuseInactive(supa, allPlayers);
  if (refusal) return refusal;

  const winnerTeam: 'a' | 'b' = input.scoreTeamA > input.scoreTeamB ? 'a' : 'b';

  // `.neq('status','confirmed')` makes the check above hold at write time too:
  // if the players confirm in the app between our read and this update, the
  // update matches nothing and we stop instead of settling it twice.
  const { data: updated, error: updateErr } = await supa
    .from('matches')
    .update({
      score_team_a: input.scoreTeamA,
      score_team_b: input.scoreTeamB,
      winner_team: winnerTeam,
      status: 'confirmed',
      confirmed_by: allPlayers,
      confirmed_at: new Date().toISOString(),
      voided_reason: null,
    })
    .eq('id', match.id)
    .neq('status', 'confirmed')
    .select('*')
    .single();
  if (updateErr || !updated) return errorResponse('Failed to re-score match', 500, updateErr);

  await applyEloForMatch(supa, {
    id: updated.id,
    category: updated.category,
    format: updated.format as MatchFormat,
    is_rated: updated.is_rated,
    kind: updated.kind,
    team_a_player_ids: updated.team_a_player_ids,
    team_b_player_ids: updated.team_b_player_ids,
    score_team_a: updated.score_team_a,
    score_team_b: updated.score_team_b,
    winner_team: updated.winner_team,
  });

  await supa.from('audit_log').insert({
    actor_id: actorId,
    action: 'admin_rescore_match',
    entity_type: 'matches',
    entity_id: updated.id,
    details: {
      via: actorId ? 'admin' : 'internal',
      note: input.note ?? null,
      previous_status: match.status,
      previous_score: `${match.score_team_a}-${match.score_team_b}`,
      score: `${input.scoreTeamA}-${input.scoreTeamB}`,
      winner_team: winnerTeam,
    },
  });

  return jsonResponse({
    matchId: updated.id,
    winnerTeam,
    score: `${input.scoreTeamA}-${input.scoreTeamB}`,
    category: updated.category,
    previousStatus: match.status,
    // Same two conditions applyEloForMatch checks before it does anything.
    eloApplied: updated.is_rated && (updated.kind ?? 'ranking') === 'ranking',
  });
}
