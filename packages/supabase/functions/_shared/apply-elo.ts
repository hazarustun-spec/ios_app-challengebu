import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateEloChange, calculateDoublesEloChange, type MatchFormat } from './elo.ts';

interface MatchRow {
  id: string;
  category: string;
  format: MatchFormat;
  is_rated: boolean;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  score_team_a: number;
  score_team_b: number;
  winner_team: 'a' | 'b' | 'void' | null;
}

export async function applyEloForMatch(supa: SupabaseClient, match: MatchRow): Promise<void> {
  if (!match.is_rated) return;
  if (match.winner_team === 'void' || match.winner_team === null) return;

  const winnerIds = match.winner_team === 'a' ? match.team_a_player_ids : match.team_b_player_ids;
  const loserIds = match.winner_team === 'a' ? match.team_b_player_ids : match.team_a_player_ids;

  const allIds = [...winnerIds, ...loserIds];
  const { data: ratings } = await supa
    .from('elo_ratings')
    .select('profile_id, rating, matches_played')
    .eq('category', match.category)
    .in('profile_id', allIds);

  const ratingOf = new Map<string, { rating: number; matchesPlayed: number }>();
  for (const id of allIds) {
    const existing = ratings?.find((r) => r.profile_id === id);
    ratingOf.set(id, {
      rating: existing?.rating ?? 1200,
      matchesPlayed: existing?.matches_played ?? 0,
    });
  }

  const winnerScore = match.winner_team === 'a' ? match.score_team_a : match.score_team_b;
  const loserScore = match.winner_team === 'a' ? match.score_team_b : match.score_team_a;

  if (winnerIds.length === 1 && loserIds.length === 1) {
    const w = ratingOf.get(winnerIds[0])!;
    const l = ratingOf.get(loserIds[0])!;
    const result = calculateEloChange({
      winnerRating: w.rating,
      loserRating: l.rating,
      winnerMatchesPlayed: w.matchesPlayed,
      loserMatchesPlayed: l.matchesPlayed,
      format: match.format,
      winnerScore,
      loserScore,
    });

    await supa.from('matches').update({
      rating_before_team_a: match.winner_team === 'a' ? w.rating : l.rating,
      rating_after_team_a: match.winner_team === 'a' ? result.winnerNewRating : result.loserNewRating,
      rating_before_team_b: match.winner_team === 'a' ? l.rating : w.rating,
      rating_after_team_b: match.winner_team === 'a' ? result.loserNewRating : result.winnerNewRating,
    }).eq('id', match.id);

    await upsertRating(supa, winnerIds[0], match.category, result.winnerNewRating, w.matchesPlayed + 1);
    await upsertRating(supa, loserIds[0], match.category, result.loserNewRating, l.matchesPlayed + 1);
  } else if (winnerIds.length === 2 && loserIds.length === 2) {
    const w1 = ratingOf.get(winnerIds[0])!;
    const w2 = ratingOf.get(winnerIds[1])!;
    const l1 = ratingOf.get(loserIds[0])!;
    const l2 = ratingOf.get(loserIds[1])!;
    const result = calculateDoublesEloChange({
      winnerTeamRatings: [w1.rating, w2.rating],
      loserTeamRatings: [l1.rating, l2.rating],
      winnerTeamMatchesPlayed: [w1.matchesPlayed, w2.matchesPlayed],
      loserTeamMatchesPlayed: [l1.matchesPlayed, l2.matchesPlayed],
      format: match.format,
      winnerScore,
      loserScore,
    });

    // Store team-average ratings on the match for ELO history display.
    // Average matches the expected-score input used by calculateDoublesEloChange.
    const winnerAvgBefore = Math.round((w1.rating + w2.rating) / 2);
    const loserAvgBefore = Math.round((l1.rating + l2.rating) / 2);
    const winnerAvgAfter = Math.round(
      (result.winnerNewRatings[0] + result.winnerNewRatings[1]) / 2,
    );
    const loserAvgAfter = Math.round(
      (result.loserNewRatings[0] + result.loserNewRatings[1]) / 2,
    );

    await supa.from('matches').update({
      rating_before_team_a: match.winner_team === 'a' ? winnerAvgBefore : loserAvgBefore,
      rating_after_team_a: match.winner_team === 'a' ? winnerAvgAfter : loserAvgAfter,
      rating_before_team_b: match.winner_team === 'a' ? loserAvgBefore : winnerAvgBefore,
      rating_after_team_b: match.winner_team === 'a' ? loserAvgAfter : winnerAvgAfter,
    }).eq('id', match.id);

    await upsertRating(supa, winnerIds[0], match.category, result.winnerNewRatings[0], w1.matchesPlayed + 1);
    await upsertRating(supa, winnerIds[1], match.category, result.winnerNewRatings[1], w2.matchesPlayed + 1);
    await upsertRating(supa, loserIds[0], match.category, result.loserNewRatings[0], l1.matchesPlayed + 1);
    await upsertRating(supa, loserIds[1], match.category, result.loserNewRatings[1], l2.matchesPlayed + 1);
  } else {
    throw new Error(`Unsupported team sizes: ${winnerIds.length} vs ${loserIds.length}`);
  }

  const now = new Date().toISOString();
  await supa.from('profiles').update({ last_match_at: now, status: 'active' }).in('user_id', allIds);
}

async function upsertRating(
  supa: SupabaseClient,
  profileId: string,
  category: string,
  rating: number,
  matchesPlayed: number,
): Promise<void> {
  await supa
    .from('elo_ratings')
    .upsert(
      { profile_id: profileId, category, rating, matches_played: matchesPlayed },
      { onConflict: 'profile_id,category' },
    );
}
