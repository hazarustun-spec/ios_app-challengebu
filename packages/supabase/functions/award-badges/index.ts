import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';

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
    const raw = await req.json();
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) return errorResponse('Invalid input', 400, parsed.error.format());

    const { data: match } = await supa
      .from('matches')
      .select('*')
      .eq('id', parsed.data.matchId)
      .single();
    if (!match) return errorResponse('Match not found', 404);
    if (match.status !== 'confirmed') {
      return jsonResponse({ awarded: [] as AwardedPerUser[] });
    }

    const { data: catalog } = await supa
      .from('badges')
      .select('id, code, name_tr, description_tr, icon, category, is_seasonal');
    const byCode = new Map<string, BadgeRow>();
    for (const b of catalog ?? []) byCode.set(b.code, b as BadgeRow);

    const allPlayers: string[] = [
      ...(match.team_a_player_ids ?? []),
      ...(match.team_b_player_ids ?? []),
    ];

    const result: AwardedPerUser[] = [];
    for (const userId of allPlayers) {
      const newBadges = await evaluateForUser(supa, byCode, match, userId);
      if (newBadges.length > 0) result.push({ userId, badges: newBadges });
    }

    return jsonResponse({ awarded: result });
  } catch (err) {
    return internalError(err);
  }
});

async function evaluateForUser(
  supa: ReturnType<typeof getServiceClient>,
  byCode: Map<string, BadgeRow>,
  match: Record<string, unknown>,
  userId: string,
): Promise<BadgeRow[]> {
  const onTeamA = (match.team_a_player_ids as string[]).includes(userId);
  const userTeam = onTeamA ? 'a' : 'b';
  const won = match.winner_team === userTeam;
  const isRated = match.is_rated as boolean;

  const { data: existing } = await supa
    .from('user_badges')
    .select('badge_id')
    .eq('profile_id', userId);
  const owned = new Set<string>((existing ?? []).map((r) => r.badge_id as string));

  const toAward: BadgeRow[] = [];

  const { count: totalMatches } = await supa
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .in('status', ['confirmed', 'voided'])
    .or(`team_a_player_ids.cs.{${userId}},team_b_player_ids.cs.{${userId}}`);
  const totalCount = totalMatches ?? 0;

  const milestoneThresholds: { code: string; n: number }[] = [
    { code: 'milestone_1_match', n: 1 },
    { code: 'milestone_3_matches', n: 3 },
    { code: 'milestone_5_matches', n: 5 },
    { code: 'milestone_10_matches', n: 10 },
    { code: 'milestone_25_matches', n: 25 },
    { code: 'milestone_50_matches', n: 50 },
    { code: 'milestone_100_matches', n: 100 },
    { code: 'milestone_250_matches', n: 250 },
    { code: 'milestone_500_matches', n: 500 },
  ];
  for (const m of milestoneThresholds) {
    if (totalCount >= m.n) {
      const badge = byCode.get(m.code);
      if (badge && !owned.has(badge.id)) toAward.push(badge);
    }
  }

  if (isRated && won) {
    const { count: wins } = await supa
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .eq('is_rated', true)
      .or(
        `and(winner_team.eq.a,team_a_player_ids.cs.{${userId}}),` +
          `and(winner_team.eq.b,team_b_player_ids.cs.{${userId}})`,
      );
    const winCount = wins ?? 0;

    const winThresholds: { code: string; n: number }[] = [
      { code: 'wins_1', n: 1 },
      { code: 'wins_3', n: 3 },
      { code: 'wins_5', n: 5 },
      { code: 'wins_10', n: 10 },
      { code: 'wins_25', n: 25 },
      { code: 'wins_50', n: 50 },
      { code: 'wins_100', n: 100 },
    ];
    for (const w of winThresholds) {
      if (winCount >= w.n) {
        const badge = byCode.get(w.code);
        if (badge && !owned.has(badge.id)) toAward.push(badge);
      }
    }

    const myScore = onTeamA ? match.score_team_a : match.score_team_b;
    const oppScore = onTeamA ? match.score_team_b : match.score_team_a;
    const isBagel =
      (match.format === 'bu_klasik' && myScore === 4 && oppScore === 0) ||
      hasShutoutSet(match.score_details, userTeam);
    if (isBagel) {
      const badge = byCode.get('bagel');
      if (badge && !owned.has(badge.id)) toAward.push(badge);
    }

    if (detectComeback(match, userTeam)) {
      const badge = byCode.get('comeback');
      if (badge && !owned.has(badge.id)) toAward.push(badge);
    }
  }

  if (toAward.length === 0) return [];

  const inserts = toAward.map((b) => ({ profile_id: userId, badge_id: b.id }));
  const { error: insertErr } = await supa.from('user_badges').insert(inserts);
  if (insertErr) {
    console.error('Failed to insert user_badges', insertErr);
    return [];
  }
  return toAward;
}

function hasShutoutSet(scoreDetails: unknown, team: 'a' | 'b'): boolean {
  if (!Array.isArray(scoreDetails)) return false;
  for (const item of scoreDetails) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    if ('a' in obj && 'b' in obj) {
      const a = obj.a as number;
      const b = obj.b as number;
      if (team === 'a' && a === 6 && b === 0) return true;
      if (team === 'b' && b === 6 && a === 0) return true;
    }
  }
  return false;
}

function detectComeback(match: Record<string, unknown>, team: 'a' | 'b'): boolean {
  const details = match.score_details;
  if (!Array.isArray(details)) return false;

  if (match.format === '3set_klasik') {
    const sets = details as { set: number; a: number; b: number }[];
    if (sets.length !== 3) return false;
    const set1 = sets[0];
    const set2 = sets[1];
    if (!set1 || !set2) return false;
    const lostFirstTwo = team === 'a'
      ? set1.a < set1.b && set2.a < set2.b
      : set1.b < set1.a && set2.b < set2.a;
    const wonOverall = match.winner_team === team;
    return lostFirstTwo && wonOverall;
  }

  if (match.format === 'bu_klasik') {
    const els = details as { el: number; winner: 'a' | 'b' }[];
    if (els.length < 7) return false;
    const oppTeam = team === 'a' ? 'b' : 'a';
    const firstFour = els.slice(0, 4);
    const oppWinsFirstFour = firstFour.filter((e) => e.winner === oppTeam).length;
    if (oppWinsFirstFour !== 3) return false;
    return match.winner_team === team;
  }

  return false;
}
