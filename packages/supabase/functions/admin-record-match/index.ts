// Record a match that was played but never went through the app.
//
// The normal path needs both players to open the app, submit the same score and
// confirm. That is right for everyday use, but it leaves no way to enter a
// match that happened off-app — including the ones the app itself lost. The
// score screen shipped with a perspective bug that made the two players submit
// mirrored scores (see migration 20260909000001), so matches played on the
// broken build could not be settled at all and there was nothing an admin could
// do about it.
//
// Admin-only, and deliberately narrow: it writes ONE already-agreed result. It
// cannot edit a match that is already settled, and it applies ELO through
// `applyEloForMatch` — the same helper `confirm-match` uses — rather than doing
// the arithmetic again somewhere new.
//
// The guard is `requireInternalOrAdmin`, the same one advance-tournament-bracket
// and award-badges use. That admits two callers: a human admin's JWT, or the
// service role key on a service-to-service call. The second is what lets this be
// driven from SQL — a statement in the Dashboard reads the service role key out
// of vault and POSTs here through pg_net, which is how the push trigger already
// talks to dispatch-push. It widens nothing: the service role key bypasses RLS
// on every table anyway, so anyone holding it could already write this row by
// hand — badly, and without the ELO.

import { z } from 'zod';
import { applyEloForMatch } from '../_shared/apply-elo.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';
import { requireInternalOrAdmin } from '../_shared/internal-guard.ts';
import { handleCors } from '../_shared/cors.ts';
import type { MatchFormat } from '../_shared/elo.ts';
import { conflict, errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

const inputSchema = z
  .object({
    // Players are named rather than passed as uuids: an admin recording a match
    // from a message or a phone call has names, not ids.
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
    scoreTeamA: z.number().int().min(0).max(99),
    scoreTeamB: z.number().int().min(0).max(99),
    courtId: z.string().uuid(),
    /** ISO timestamp of when it was actually played. Defaults to now. */
    playedAt: z.string().datetime().optional(),
    /** false records the result without touching anybody's rating. */
    isRated: z.boolean().default(true),
    /** Free-text note stored on the match for the audit trail. */
    note: z.string().trim().max(300).optional(),
  })
  .refine((d) => d.scoreTeamA !== d.scoreTeamB, {
    message: 'A recorded match needs a winner — scores cannot be level',
    path: ['scoreTeamA'],
  })
  .refine(
    (d) =>
      new Set([...d.teamAPlayerIds, ...d.teamBPlayerIds]).size ===
      d.teamAPlayerIds.length + d.teamBPlayerIds.length,
    { message: 'A player cannot be on both teams', path: ['teamBPlayerIds'] },
  );

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    await requireInternalOrAdmin(req, supa);

    // Who to blame in the audit log. A human admin's token resolves to their
    // user id; an internal call carrying the service role key has no person
    // behind it, and inventing one would be worse than recording none.
    let actorId: string | null = null;
    try {
      actorId = (await requireAuth(req, supa)).userId;
    } catch {
      actorId = null;
    }

    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());
    const input = parsed.data;

    const allPlayers = [...input.teamAPlayerIds, ...input.teamBPlayerIds];

    // Everyone named has to exist and be an active player. Recording a result
    // against a deleted or suspended account would move a rating nobody owns.
    const { data: profiles, error: profileErr } = await supa
      .from('profiles')
      .select('user_id, status')
      .in('user_id', allPlayers);
    if (profileErr) return errorResponse('Failed to read players', 500, profileErr);
    if ((profiles ?? []).length !== allPlayers.length) {
      return errorResponse('One or more players do not exist', 400, {
        found: (profiles ?? []).map((p) => p.user_id),
      });
    }
    const inactive = (profiles ?? []).filter((p) => p.status !== 'active');
    if (inactive.length > 0) {
      return conflict(`Player is not active: ${inactive.map((p) => p.user_id).join(', ')}`);
    }

    const winnerTeam: 'a' | 'b' = input.scoreTeamA > input.scoreTeamB ? 'a' : 'b';
    const playedAt = input.playedAt ?? new Date().toISOString();

    // Inserted already settled: an admin recording an agreed result is the
    // confirmation. `confirmed_by` lists every player so the match reads as
    // fully agreed wherever that field is displayed.
    const { data: match, error: insertErr } = await supa
      .from('matches')
      .insert({
        category: input.category,
        format: input.format,
        court_id: input.courtId,
        played_at: playedAt,
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
    if (insertErr || !match) {
      return errorResponse('Failed to record match', 500, insertErr);
    }

    // Same helper confirm-match calls. It no-ops for unrated matches on its own.
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

    // An admin writing a result on other people's behalf is exactly the kind of
    // action that has to be attributable afterwards.
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
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});
