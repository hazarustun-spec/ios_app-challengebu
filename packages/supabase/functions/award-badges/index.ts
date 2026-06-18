import { z } from 'zod';
import { handleCors } from '../_shared/cors.ts';
import { errorResponse, internalError, jsonResponse } from '../_shared/errors.ts';
import { getServiceClient } from '../_shared/supabase-client.ts';
import { AuthError } from '../_shared/auth-guard.ts';
import { requireInternalOrAdmin } from '../_shared/internal-guard.ts';

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
    await requireInternalOrAdmin(req, supa);
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
      .select('id, code, name_tr, description_tr, icon, category');
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
    if (err instanceof AuthError) return errorResponse(err.message, err.status);
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

  // Milestones include voided matches: spec section 6.1 says "kümülatif, dostluk dahil"
  // — the player still showed up and played, so it counts toward milestones even if
  // the score was 3-3 voided. Wins use confirmed-only (below).
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

// score_details is the object stored by submit-match-score:
// { scoreTeamA, scoreTeamB, winnerTeam, sets?, els?, games?, tiebreakScore?, points? }
interface ScoreDetails {
  sets?: { set: number; a: number; b: number }[];
  els?: { el: number; winner: 'a' | 'b' }[];
}

function asScoreDetails(scoreDetails: unknown): ScoreDetails | null {
  if (typeof scoreDetails !== 'object' || scoreDetails === null) return null;
  return scoreDetails as ScoreDetails;
}

function hasShutoutSet(scoreDetails: unknown, team: 'a' | 'b'): boolean {
  const d = asScoreDetails(scoreDetails);
  if (!d?.sets) return false;
  for (const s of d.sets) {
    if (team === 'a' && s.a === 6 && s.b === 0) return true;
    if (team === 'b' && s.b === 6 && s.a === 0) return true;
  }
  return false;
}

function detectComeback(match: Record<string, unknown>, team: 'a' | 'b'): boolean {
  const d = asScoreDetails(match.score_details);
  if (!d) return false;
  const wonOverall = match.winner_team === team;
  if (!wonOverall) return false;

  if (match.format === '3set_klasik') {
    // Best-of-3 comeback: lost set 1, won sets 2 and 3.
    // (Spec wording "0-2'den 3-2" is best-of-5 phrasing; in best-of-3 the
    // realizable comeback is 1-set-down-to-win.)
    if (!d.sets || d.sets.length !== 3) return false;
    const [s1, s2, s3] = d.sets;
    if (!s1 || !s2 || !s3) return false;
    const lost = (s: { a: number; b: number }) =>
      team === 'a' ? s.a < s.b : s.b < s.a;
    const won = (s: { a: number; b: number }) =>
      team === 'a' ? s.a > s.b : s.b > s.a;
    return lost(s1) && won(s2) && won(s3);
  }

  if (match.format === 'bu_klasik') {
    // 1-3'ten 4-3: opp won 3 of first 4 Els, user wins overall in 7 Els.
    if (!d.els || d.els.length !== 7) return false;
    const oppTeam = team === 'a' ? 'b' : 'a';
    const oppWinsFirstFour = d.els.slice(0, 4).filter((e) => e.winner === oppTeam).length;
    return oppWinsFirstFour === 3;
  }

  return false;
}
