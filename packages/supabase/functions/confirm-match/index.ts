import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { conflict, errorResponse, forbidden, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError, requireAuth } from '../_shared/auth-guard.ts';
import { applyEloForMatch } from '../_shared/apply-elo.ts';
import type { MatchFormat } from '../_shared/elo.ts';

const inputSchema = z.object({ matchId: z.string().uuid() });

interface BadgeRow {
  id: string;
  code: string;
  name_tr: string;
  description_tr: string;
  icon: string;
  category: string;
}

interface AwardedPerUser {
  userId: string;
  badges: BadgeRow[];
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supa = getServiceClient();
    const auth = await requireAuth(req, supa);
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: match } = await supa
      .from('matches')
      .select('*')
      .eq('id', parsed.data.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);
    if (match.status !== 'awaiting_confirmation') return conflict(`Match is ${match.status}`);

    const allPlayers: string[] = [...match.team_a_player_ids, ...match.team_b_player_ids];
    if (!allPlayers.includes(auth.userId)) return forbidden('Only participants can confirm');

    if (!match.winner_team) {
      return conflict('Scores must be submitted before confirmation');
    }

    const confirmedBy: string[] = match.confirmed_by ?? [];
    if (confirmedBy.includes(auth.userId)) {
      return jsonResponse({ confirmed: false, alreadyConfirmed: true });
    }
    const newConfirmed = [...confirmedBy, auth.userId];

    const allConfirmed = allPlayers.every((p) => newConfirmed.includes(p));

    if (!allConfirmed) {
      await supa.from('matches').update({ confirmed_by: newConfirmed }).eq('id', match.id);
      return jsonResponse({ confirmed: false });
    }

    const newStatus = match.winner_team === 'void' ? 'voided' : 'confirmed';
    await supa.from('matches').update({
      confirmed_by: newConfirmed,
      confirmed_at: new Date().toISOString(),
      status: newStatus,
    }).eq('id', match.id);

    let awarded: AwardedPerUser[] = [];
    if (newStatus === 'confirmed') {
      await applyEloForMatch(supa, {
        id: match.id,
        category: match.category,
        format: match.format as MatchFormat,
        is_rated: match.is_rated,
        team_a_player_ids: match.team_a_player_ids,
        team_b_player_ids: match.team_b_player_ids,
        score_team_a: match.score_team_a,
        score_team_b: match.score_team_b,
        winner_team: match.winner_team,
      });

      awarded = await invokeAwardBadges(match.id);
      await invokeAdvanceBracket(match.id);
    }

    return jsonResponse({ confirmed: true, status: newStatus, awarded });
  } catch (err) {
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
    return internalError(err);
  }
});

async function invokeAwardBadges(matchId: string): Promise<AwardedPerUser[]> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return [];
  try {
    const res = await fetch(`${url}/functions/v1/award-badges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ matchId }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error('award-badges call failed', res.status, await res.text());
      return [];
    }
    const json = (await res.json()) as { awarded?: AwardedPerUser[] };
    return json.awarded ?? [];
  } catch (err) {
    console.error('award-badges fetch threw', err);
    return [];
  }
}

async function invokeAdvanceBracket(matchId: string): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return;
  try {
    const res = await fetch(`${url}/functions/v1/advance-tournament-bracket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ matchId }),
    });
    if (!res.ok) {
      console.error('advance-tournament-bracket failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('advance-tournament-bracket threw', err);
  }
}
