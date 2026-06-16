// lib/match-opponent.ts — Pure helpers for resolving opponent identity from a
// match row. No React-Native imports so these are safe to run under bun test.

/** Minimal match shape the helpers actually need — decoupled from ActiveMatchRow. */
export interface MatchLike {
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  score_team_a: number;
  score_team_b: number;
  winner_team: 'a' | 'b' | 'void' | null;
  rating_before_team_a: number | null;
  rating_after_team_a: number | null;
  rating_before_team_b: number | null;
  rating_after_team_b: number | null;
}

export interface MyPerspective {
  /** true = I won, false = I lost, null = void / no result yet */
  won: boolean | null;
  myScore: number;
  oppScore: number;
  /** rating_after − rating_before for my team; null if either value is absent */
  eloDelta: number | null;
}

// ---------------------------------------------------------------------------
// myTeam
// ---------------------------------------------------------------------------

/** Which team is `myId` on? Returns null if not found in either array. */
export function myTeam(match: MatchLike, myId: string): 'a' | 'b' | null {
  if (match.team_a_player_ids.includes(myId)) return 'a';
  if (match.team_b_player_ids.includes(myId)) return 'b';
  return null;
}

// ---------------------------------------------------------------------------
// opponentIds
// ---------------------------------------------------------------------------

/**
 * The other team's player IDs (1 for singles, 2 for doubles).
 * If myId isn't found in either team, defaults to returning team_b ids
 * (treats caller as team A) so callers never get an empty / undefined array.
 */
export function opponentIds(match: MatchLike, myId: string): string[] {
  const side = myTeam(match, myId);
  if (side === 'a') return match.team_b_player_ids;
  if (side === 'b') return match.team_a_player_ids;
  // Fallback: myId not found — treat caller as team A, return team B
  return match.team_b_player_ids;
}

// ---------------------------------------------------------------------------
// myPerspective
// ---------------------------------------------------------------------------

/** Orientation of result, score, and ELO delta toward `myId`'s team. */
export function myPerspective(match: MatchLike, myId: string): MyPerspective {
  const side = myTeam(match, myId) ?? 'a'; // fallback to team A

  const myScore = side === 'a' ? match.score_team_a : match.score_team_b;
  const oppScore = side === 'a' ? match.score_team_b : match.score_team_a;

  const ratingBefore =
    side === 'a' ? match.rating_before_team_a : match.rating_before_team_b;
  const ratingAfter =
    side === 'a' ? match.rating_after_team_a : match.rating_after_team_b;

  const eloDelta =
    ratingBefore !== null && ratingAfter !== null
      ? ratingAfter - ratingBefore
      : null;

  let won: boolean | null = null;
  if (match.winner_team !== null && match.winner_team !== 'void') {
    won = match.winner_team === side;
  }

  return { won, myScore, oppScore, eloDelta };
}

// ---------------------------------------------------------------------------
// formatOpponentName
// ---------------------------------------------------------------------------

/**
 * Human-readable opponent label.
 *  - Singles (1 player): "First Last"
 *  - Doubles (2 players): "First & First"
 *  - Empty array: "Bilinmeyen oyuncu"
 */
export function formatOpponentName(
  players: { first_name: string; last_name: string }[]
): string {
  if (players.length === 0) return 'Bilinmeyen oyuncu';
  if (players.length === 1)
    return `${players[0].first_name} ${players[0].last_name}`;
  // Doubles: join first names with " & "
  return players.map((p) => p.first_name).join(' & ');
}
